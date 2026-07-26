import { create } from 'zustand';
import type {
  ContourInfo,
  ContourParams,
  ExportFormat,
  GeneratedGeometry,
  ImageInfo,
  ProgressInfo,
  SolidParams,
  ThresholdParams,
  ToolId,
} from '../lib/types';
import { buildBinaryMask, groupLoops, labelComponents, traceLoops, type ShapeGroup } from '../lib/contour';
import { simplifyClosedLoop, chaikinClosed } from '../lib/rdp';
import { generateSample, type SampleName } from '../lib/sampleImages';
import { clearSession, loadSession, saveSession, type SessionRecord } from '../store/db';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_EDGE = 2048;
const UNDO_LIMIT = 50;

export interface ImageState {
  canvas: HTMLCanvasElement;
  data: Uint8ClampedArray;
  info: ImageInfo;
}

interface Snapshot {
  image: ImageState | null;
  manualMask: Uint8Array | null;
  threshold: ThresholdParams;
  contour: ContourParams;
  solid: SolidParams;
}

export interface Toast {
  id: number;
  kind: 'danger' | 'warn' | 'ok' | 'info';
  message: string;
}

interface DocState {
  image: ImageState | null;
  manualMask: Uint8Array | null;
  manualMaskVersion: number;

  thresholdParams: ThresholdParams;
  contourParams: ContourParams;
  solidParams: SolidParams;

  previewLoops: ShapeGroup[];
  contourInfo: ContourInfo | null;
  geometry: GeneratedGeometry | null;

  status: 'empty' | 'idle' | 'generating' | 'error';
  progress: ProgressInfo | null;
  errorMessage: string | null;

  viewMode: 'source' | 'solid';
  activeTool: ToolId;
  brushRadius: number;
  brushMode: 'include' | 'exclude';

  undoStack: Snapshot[];
  redoStack: Snapshot[];

  stageZoom: number;
  stagePan: { x: number; y: number };
  cursorMm: { x: number; y: number } | null;
  autoRotateStopped: boolean;

  toasts: Toast[];
  exportDialogOpen: boolean;
  confirmClearOpen: boolean;
  rightPanelOpen: boolean;
  recoveryRecord: SessionRecord | null;
  lastSavedAt: number | null;
  filename: string;

  loadImageFile: (file: File) => Promise<void>;
  loadSample: (name: SampleName) => Promise<void>;

  beginEdit: () => void;
  commitEdit: () => void;
  updateThreshold: (partial: Partial<ThresholdParams>) => void;
  updateContour: (partial: Partial<ContourParams>) => void;
  updateSolid: (partial: Partial<SolidParams>) => void;

  eraseIslandAt: (px: number, py: number) => void;
  paintBrush: (px: number, py: number) => void;

  setViewMode: (m: 'source' | 'solid') => void;
  setActiveTool: (t: ToolId) => void;
  setBrushRadius: (r: number) => void;
  setBrushMode: (m: 'include' | 'exclude') => void;

  undo: () => void;
  redo: () => void;

  cancelGenerate: () => void;
  regenerate: () => void;

  setStageZoom: (z: number) => void;
  setStagePan: (p: { x: number; y: number }) => void;
  resetStageView: () => void;
  setCursorMm: (p: { x: number; y: number } | null) => void;
  stopAutoRotate: () => void;

  setExportDialogOpen: (v: boolean) => void;
  setConfirmClearOpen: (v: boolean) => void;
  setRightPanelOpen: (v: boolean) => void;
  clearAll: () => void;
  setFilename: (n: string) => void;

  pushToast: (kind: Toast['kind'], message: string) => void;
  dismissToast: (id: number) => void;

  restoreSession: () => Promise<void>;
  discardSession: () => void;
  checkRecovery: () => Promise<void>;
}

let worker: Worker | null = null;
let jobCounter = 0;
let rafHandle: number | null = null;
let dragSnapshot: Snapshot | null = null;
let toastId = 0;
let saveTimer: number | null = null;

function spawnWorker(handlers: { onMessage: (e: MessageEvent) => void }) {
  const w = new Worker(new URL('../worker/pipeline.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = handlers.onMessage;
  return w;
}

function defaultThreshold(): ThresholdParams {
  return { threshold: 128, invert: false, minIslandArea: 24 };
}
function defaultContour(): ContourParams {
  return { simplifyTolerance: 1.2, smoothing: 0.3 };
}
function defaultSolid(): SolidParams {
  return { targetWidthMm: 80, extrudeDepthMm: 6, bevelMm: 0.4, twoSided: false };
}

function computePreview(image: ImageState, manualMask: Uint8Array | null, threshold: ThresholdParams, contour: ContourParams): { loops: ShapeGroup[]; info: ContourInfo } {
  const { width, height } = image.info;
  const mask0 = buildBinaryMask(image.data, width, height, threshold.threshold, threshold.invert, manualMask ?? undefined);
  const { labels, areas } = labelComponents(mask0, width, height);
  const islandsTotal = areas.length;
  let islandsFiltered = 0;
  for (let i = 0; i < areas.length; i++) if (areas[i] < threshold.minIslandArea) islandsFiltered++;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const lb = labels[i];
    if (lb >= 0 && areas[lb] >= threshold.minIslandArea) mask[i] = 1;
  }
  const rawLoops = traceLoops(mask, width, height);
  const smoothIterations = Math.round(contour.smoothing * 3);
  const processed = rawLoops.map((loop) => {
    let pts = loop;
    if (smoothIterations > 0) pts = chaikinClosed(pts, smoothIterations);
    if (contour.simplifyTolerance > 0) pts = simplifyClosedLoop(pts, contour.simplifyTolerance);
    return pts;
  });
  const groups = groupLoops(processed);
  return { loops: groups, info: { loopCount: rawLoops.length, islandsTotal, islandsFiltered } };
}

async function decodeFile(file: File): Promise<ImageState> {
  const bitmap = await createImageBitmap(file);
  const ow = bitmap.width;
  const oh = bitmap.height;
  let tw = ow;
  let th = oh;
  let downsampled = false;
  const longest = Math.max(ow, oh);
  if (longest > MAX_EDGE) {
    const s = MAX_EDGE / longest;
    tw = Math.max(1, Math.round(ow * s));
    th = Math.max(1, Math.round(oh * s));
    downsampled = true;
  }
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const c2d = canvas.getContext('2d')!;
  c2d.drawImage(bitmap, 0, 0, tw, th);
  const imgData = c2d.getImageData(0, 0, tw, th);
  return {
    canvas,
    data: imgData.data,
    info: {
      name: file.name,
      width: tw,
      height: th,
      originalWidth: ow,
      originalHeight: oh,
      sizeBytes: file.size,
      type: file.type,
      downsampled,
    },
  };
}

function snapshotOf(s: DocState): Snapshot {
  return {
    image: s.image,
    manualMask: s.manualMask ? s.manualMask.slice() : null,
    threshold: { ...s.thresholdParams },
    contour: { ...s.contourParams },
    solid: { ...s.solidParams },
  };
}

export const useDocStore = create<DocState>((set, get) => {
  function scheduleRegenerate() {
    const { image } = get();
    if (!image) return;
    const { manualMask, thresholdParams, contourParams } = get();
    const { loops, info } = computePreview(image, manualMask, thresholdParams, contourParams);
    set({ previewLoops: loops, contourInfo: info });
    if (rafHandle !== null) return;
    rafHandle = requestAnimationFrame(() => {
      rafHandle = null;
      get().regenerate();
    });
  }

  function pushUndo(before: Snapshot) {
    set((s) => ({ undoStack: [...s.undoStack, before].slice(-UNDO_LIMIT), redoStack: [] }));
  }

  function scheduleSave() {
    if (saveTimer !== null) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
      const s = get();
      if (!s.image) return;
      const dataUrl = s.image.canvas.toDataURL('image/png');
      const rec: SessionRecord = {
        imageDataUrl: dataUrl,
        imageName: s.image.info.name,
        imageType: s.image.info.type,
        imageSizeBytes: s.image.info.sizeBytes,
        width: s.image.info.width,
        height: s.image.info.height,
        originalWidth: s.image.info.originalWidth,
        originalHeight: s.image.info.originalHeight,
        downsampled: s.image.info.downsampled,
        threshold: s.thresholdParams,
        contour: s.contourParams,
        solid: s.solidParams,
        savedAt: Date.now(),
      };
      try {
        await saveSession(rec);
        set({ lastSavedAt: Date.now() });
      } catch {
        /* storage unavailable - ignore */
      }
    }, 2000);
  }

  return {
    image: null,
    manualMask: null,
    manualMaskVersion: 0,

    thresholdParams: defaultThreshold(),
    contourParams: defaultContour(),
    solidParams: defaultSolid(),

    previewLoops: [],
    contourInfo: null,
    geometry: null,

    status: 'empty',
    progress: null,
    errorMessage: null,

    viewMode: 'source',
    activeTool: 'select',
    brushRadius: 18,
    brushMode: 'exclude',

    undoStack: [],
    redoStack: [],

    stageZoom: 1,
    stagePan: { x: 0, y: 0 },
    cursorMm: null,
    autoRotateStopped: false,

    toasts: [],
    exportDialogOpen: false,
    confirmClearOpen: false,
    rightPanelOpen: false,
    recoveryRecord: null,
    lastSavedAt: null,
    filename: 'untitled',

    async loadImageFile(file: File) {
      const allowed = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowed.includes(file.type)) {
        const label = file.type ? file.type.replace('image/', '').toUpperCase() : (file.name.split('.').pop() || 'file').toUpperCase();
        get().pushToast('danger', `${label} not supported — PNG, JPG, or WebP`);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        get().pushToast('danger', `${mb}MB exceeds the 20MB limit`);
        return;
      }
      const before = snapshotOf(get());
      const image = await decodeFile(file);
      set({
        image,
        manualMask: new Uint8Array(image.info.width * image.info.height),
        manualMaskVersion: get().manualMaskVersion + 1,
        filename: file.name.replace(/\.[^.]+$/, ''),
        status: 'idle',
        errorMessage: null,
        viewMode: 'source',
        stageZoom: 1,
        stagePan: { x: 0, y: 0 },
      });
      pushUndo(before);
      if (image.info.downsampled) {
        get().pushToast('info', `Downsampled to ${image.info.width}×${image.info.height}px for tracing (source was ${image.info.originalWidth}×${image.info.originalHeight}px)`);
      }
      scheduleRegenerate();
      scheduleSave();
    },

    async loadSample(name: SampleName) {
      const file = await generateSample(name);
      await get().loadImageFile(file);
    },

    beginEdit() {
      if (!dragSnapshot) dragSnapshot = snapshotOf(get());
    },
    commitEdit() {
      if (dragSnapshot) {
        pushUndo(dragSnapshot);
        dragSnapshot = null;
        scheduleSave();
      }
    },

    updateThreshold(partial) {
      set((s) => ({ thresholdParams: { ...s.thresholdParams, ...partial } }));
      scheduleRegenerate();
    },
    updateContour(partial) {
      set((s) => ({ contourParams: { ...s.contourParams, ...partial } }));
      scheduleRegenerate();
    },
    updateSolid(partial) {
      set((s) => ({ solidParams: { ...s.solidParams, ...partial } }));
      scheduleRegenerate();
    },

    eraseIslandAt(px, py) {
      const { image, thresholdParams, manualMask } = get();
      if (!image) return;
      const { width, height } = image.info;
      const x = Math.floor(px);
      const y = Math.floor(py);
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const mask0 = buildBinaryMask(image.data, width, height, thresholdParams.threshold, thresholdParams.invert, manualMask ?? undefined);
      const { labels } = labelComponents(mask0, width, height);
      const label = labels[y * width + x];
      if (label < 0) return;
      const before = snapshotOf(get());
      const nextMask = (manualMask ?? new Uint8Array(width * height)).slice();
      for (let i = 0; i < width * height; i++) {
        if (labels[i] === label) nextMask[i] = 2;
      }
      set((s) => ({ manualMask: nextMask, manualMaskVersion: s.manualMaskVersion + 1 }));
      pushUndo(before);
      scheduleRegenerate();
      scheduleSave();
    },

    paintBrush(px, py) {
      const { image, manualMask, brushRadius, brushMode } = get();
      if (!image) return;
      const { width, height } = image.info;
      const mask = manualMask ?? new Uint8Array(width * height);
      const r = brushRadius;
      const r2 = r * r;
      const minX = Math.max(0, Math.floor(px - r));
      const maxX = Math.min(width - 1, Math.ceil(px + r));
      const minY = Math.max(0, Math.floor(py - r));
      const maxY = Math.min(height - 1, Math.ceil(py + r));
      const val = brushMode === 'include' ? 1 : 2;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - px;
          const dy = y - py;
          if (dx * dx + dy * dy <= r2) mask[y * width + x] = val;
        }
      }
      set((s) => ({ manualMask: mask, manualMaskVersion: s.manualMaskVersion + 1 }));
      scheduleRegenerate();
    },

    setViewMode(m) {
      set({ viewMode: m });
    },
    setActiveTool(t) {
      set({ activeTool: t });
    },
    setBrushRadius(r) {
      set({ brushRadius: r });
    },
    setBrushMode(m) {
      set({ brushMode: m });
    },

    undo() {
      const { undoStack } = get();
      if (undoStack.length === 0) return;
      const prev = undoStack[undoStack.length - 1];
      const current = snapshotOf(get());
      set((s) => ({ undoStack: s.undoStack.slice(0, -1), redoStack: [...s.redoStack, current].slice(-UNDO_LIMIT) }));
      set({
        image: prev.image,
        manualMask: prev.manualMask,
        manualMaskVersion: get().manualMaskVersion + 1,
        thresholdParams: prev.threshold,
        contourParams: prev.contour,
        solidParams: prev.solid,
        status: prev.image ? 'idle' : 'empty',
      });
      scheduleRegenerate();
    },
    redo() {
      const { redoStack } = get();
      if (redoStack.length === 0) return;
      const next = redoStack[redoStack.length - 1];
      const current = snapshotOf(get());
      set((s) => ({ redoStack: s.redoStack.slice(0, -1), undoStack: [...s.undoStack, current].slice(-UNDO_LIMIT) }));
      set({
        image: next.image,
        manualMask: next.manualMask,
        manualMaskVersion: get().manualMaskVersion + 1,
        thresholdParams: next.threshold,
        contourParams: next.contour,
        solidParams: next.solid,
        status: next.image ? 'idle' : 'empty',
      });
      scheduleRegenerate();
    },

    cancelGenerate() {
      if (worker) {
        worker.terminate();
        worker = null;
      }
      set({ status: 'idle', progress: null });
    },

    regenerate() {
      const { image, manualMask, thresholdParams, contourParams, solidParams } = get();
      if (!image) return;
      if (worker) {
        worker.terminate();
        worker = null;
      }
      jobCounter++;
      const jobId = jobCounter;
      set({ status: 'generating', progress: { stage: 'read', progress: 0 }, errorMessage: null });
      const w = spawnWorker({
        onMessage: (e) => {
          const msg = e.data;
          if (msg.jobId !== jobId) return;
          if (msg.type === 'progress') {
            set({ progress: { stage: msg.stage, progress: msg.progress, detail: msg.detail } });
          } else if (msg.type === 'no-contour') {
            set({
              status: 'error',
              progress: null,
              errorMessage: `No closed contour found at threshold ${get().thresholdParams.threshold} — try lowering the threshold or inverting`,
              contourInfo: { loopCount: 0, islandsTotal: msg.islandsTotal, islandsFiltered: msg.islandsFiltered },
            });
          } else if (msg.type === 'error') {
            set({ status: 'error', progress: null, errorMessage: msg.message });
          } else if (msg.type === 'result') {
            const geometry: GeneratedGeometry = {
              positions: new Float32Array(msg.positionsBuf),
              normals: new Float32Array(msg.normalsBuf),
              bbox: msg.geometry.bbox,
              triangleCount: msg.geometry.triangleCount,
              openEdges: msg.geometry.openEdges,
              watertight: msg.geometry.watertight,
            };
            set({ status: 'idle', progress: null, geometry, contourInfo: msg.contourInfo, errorMessage: null });
          }
        },
      });
      worker = w;
      const bufferCopy = image.data.slice().buffer;
      const manualCopy = manualMask ? manualMask.slice().buffer : null;
      const transfer = manualCopy ? [bufferCopy, manualCopy] : [bufferCopy];
      w.postMessage(
        {
          type: 'generate',
          jobId,
          width: image.info.width,
          height: image.info.height,
          buffer: bufferCopy,
          manualMaskBuffer: manualCopy,
          threshold: thresholdParams,
          contour: contourParams,
          solid: solidParams,
        },
        transfer
      );
    },

    setStageZoom(z) {
      set({ stageZoom: Math.min(8, Math.max(0.25, z)) });
    },
    setStagePan(p) {
      set({ stagePan: p });
    },
    resetStageView() {
      set({ stageZoom: 1, stagePan: { x: 0, y: 0 } });
    },
    setCursorMm(p) {
      set({ cursorMm: p });
    },
    stopAutoRotate() {
      if (!get().autoRotateStopped) set({ autoRotateStopped: true });
    },

    setExportDialogOpen(v) {
      set({ exportDialogOpen: v });
    },
    setConfirmClearOpen(v) {
      set({ confirmClearOpen: v });
    },
    setRightPanelOpen(v) {
      set({ rightPanelOpen: v });
    },
    clearAll() {
      if (worker) {
        worker.terminate();
        worker = null;
      }
      clearSession().catch(() => {});
      set({
        image: null,
        manualMask: null,
        manualMaskVersion: 0,
        previewLoops: [],
        contourInfo: null,
        geometry: null,
        status: 'empty',
        progress: null,
        errorMessage: null,
        thresholdParams: defaultThreshold(),
        contourParams: defaultContour(),
        solidParams: defaultSolid(),
        undoStack: [],
        redoStack: [],
        filename: 'untitled',
        confirmClearOpen: false,
      });
    },
    setFilename(n) {
      set({ filename: n || 'untitled' });
      scheduleSave();
    },

    pushToast(kind, message) {
      const id = ++toastId;
      set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
      window.setTimeout(() => get().dismissToast(id), 5200);
    },
    dismissToast(id) {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    async checkRecovery() {
      try {
        const rec = await loadSession();
        if (rec) set({ recoveryRecord: rec });
      } catch {
        /* ignore */
      }
    },
    async restoreSession() {
      const rec = get().recoveryRecord;
      if (!rec) return;
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('failed to load'));
        img.src = rec.imageDataUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = rec.width;
      canvas.height = rec.height;
      const c2d = canvas.getContext('2d')!;
      c2d.drawImage(img, 0, 0, rec.width, rec.height);
      const data = c2d.getImageData(0, 0, rec.width, rec.height).data;
      const image: ImageState = {
        canvas,
        data,
        info: {
          name: rec.imageName,
          width: rec.width,
          height: rec.height,
          originalWidth: rec.originalWidth,
          originalHeight: rec.originalHeight,
          sizeBytes: rec.imageSizeBytes,
          type: rec.imageType,
          downsampled: rec.downsampled,
        },
      };
      set({
        image,
        manualMask: new Uint8Array(rec.width * rec.height),
        manualMaskVersion: get().manualMaskVersion + 1,
        thresholdParams: rec.threshold,
        contourParams: rec.contour,
        solidParams: rec.solid,
        filename: rec.imageName.replace(/\.[^.]+$/, ''),
        status: 'idle',
        recoveryRecord: null,
      });
      scheduleRegenerate();
    },
    discardSession() {
      set({ recoveryRecord: null });
      clearSession().catch(() => {});
    },
  };
});
