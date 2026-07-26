import { useEffect, useRef, useState } from 'react';
import { useDocStore } from '../store/useDocStore';
import DropZone from './DropZone';

export default function SourceStage() {
  const image = useDocStore((s) => s.image);
  const previewLoops = useDocStore((s) => s.previewLoops);
  const activeTool = useDocStore((s) => s.activeTool);
  const stageZoom = useDocStore((s) => s.stageZoom);
  const stagePan = useDocStore((s) => s.stagePan);
  const setStageZoom = useDocStore((s) => s.setStageZoom);
  const setStagePan = useDocStore((s) => s.setStagePan);
  const setCursorMm = useDocStore((s) => s.setCursorMm);
  const brushRadius = useDocStore((s) => s.brushRadius);
  const brushMode = useDocStore((s) => s.brushMode);
  const paintBrush = useDocStore((s) => s.paintBrush);
  const eraseIslandAt = useDocStore((s) => s.eraseIslandAt);
  const beginEdit = useDocStore((s) => s.beginEdit);
  const commitEdit = useDocStore((s) => s.commitEdit);
  const targetWidthMm = useDocStore((s) => s.solidParams.targetWidthMm);
  const manualMaskVersion = useDocStore((s) => s.manualMaskVersion);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverPt, setHoverPt] = useState<{ x: number; y: number } | null>(null);
  const [measure, setMeasure] = useState<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null);
  const dragState = useRef<{ mode: string; startClientX: number; startClientY: number; startPan: { x: number; y: number }; startZoom: number } | null>(null);
  const paintingRef = useRef(false);

  function getGeom() {
    const container = containerRef.current;
    if (!container || !image) return null;
    const rect = container.getBoundingClientRect();
    const { width: iw, height: ih } = image.info;
    const fitScale = Math.min(rect.width / iw, rect.height / ih) * 0.86;
    const scale = fitScale * stageZoom;
    const originX = rect.width / 2 - (iw * scale) / 2 + stagePan.x;
    const originY = rect.height / 2 - (ih * scale) / 2 + stagePan.y;
    return { rect, scale, originX, originY, iw, ih };
  }

  function canvasToImage(clientX: number, clientY: number) {
    const g = getGeom();
    if (!g) return null;
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    return { x: (cx - g.originX) / g.scale, y: (cy - g.originY) / g.scale };
  }

  // draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !image) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const g = getGeom();
    if (!g) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image.canvas, g.originX, g.originY, g.iw * g.scale, g.ih * g.scale);

    // contour + threshold fill overlay
    for (const grp of previewLoops) {
      if (grp.outer.length < 3) continue;
      const path = new Path2D();
      path.moveTo(g.originX + grp.outer[0].x * g.scale, g.originY + grp.outer[0].y * g.scale);
      for (let i = 1; i < grp.outer.length; i++) path.lineTo(g.originX + grp.outer[i].x * g.scale, g.originY + grp.outer[i].y * g.scale);
      path.closePath();
      for (const hole of grp.holes) {
        if (hole.length < 3) continue;
        path.moveTo(g.originX + hole[0].x * g.scale, g.originY + hole[0].y * g.scale);
        for (let i = 1; i < hole.length; i++) path.lineTo(g.originX + hole[i].x * g.scale, g.originY + hole[i].y * g.scale);
        path.closePath();
      }
      ctx.fillStyle = 'rgba(232, 112, 58, 0.24)';
      ctx.fill(path, 'evenodd');
      ctx.strokeStyle = '#8fb3d9';
      ctx.lineWidth = 1.1;
      ctx.stroke(path);
    }

    // brush cursor preview
    if (activeTool === 'brush' && hoverPt) {
      ctx.beginPath();
      ctx.arc(g.originX + hoverPt.x * g.scale, g.originY + hoverPt.y * g.scale, brushRadius * g.scale, 0, Math.PI * 2);
      ctx.strokeStyle = brushMode === 'include' ? '#4fb783' : '#d95c4a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // measure overlay
    if (measure) {
      const a = { x: g.originX + measure.a.x * g.scale, y: g.originY + measure.a.y * g.scale };
      const b = { x: g.originX + measure.b.x * g.scale, y: g.originY + measure.b.y * g.scale };
      ctx.strokeStyle = '#8fb3d9';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      [a, b].forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#8fb3d9';
        ctx.fill();
      });
      const distPx = Math.hypot(measure.b.x - measure.a.x, measure.b.y - measure.a.y);
      const mmPerPx = targetWidthMm / g.iw;
      const distMm = distPx * mmPerPx;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const label = `${distMm.toFixed(2)} mm`;
      ctx.font = '11px "IBM Plex Mono", monospace';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(11,13,16,0.85)';
      ctx.fillRect(midX - tw / 2 - 5, midY - 18, tw + 10, 16);
      ctx.fillStyle = '#8fb3d9';
      ctx.fillText(label, midX - tw / 2, midY - 6);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, previewLoops, stageZoom, stagePan, activeTool, hoverPt, brushRadius, brushMode, measure, targetWidthMm, manualMaskVersion]);

  useEffect(() => {
    function onResize() {
      // trigger redraw by touching state
      setHoverPt((p) => (p ? { ...p } : p));
    }
    const ro = new ResizeObserver(onResize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  function onWheel(e: React.WheelEvent) {
    if (!image) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    setStageZoom(stageZoom * factor);
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!image) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pt = canvasToImage(e.clientX, e.clientY);
    if (!pt) return;
    if (activeTool === 'pan') {
      dragState.current = { mode: 'pan', startClientX: e.clientX, startClientY: e.clientY, startPan: stagePan, startZoom: stageZoom };
    } else if (activeTool === 'zoom') {
      dragState.current = { mode: 'zoom', startClientX: e.clientX, startClientY: e.clientY, startPan: stagePan, startZoom: stageZoom };
    } else if (activeTool === 'brush') {
      beginEdit();
      paintingRef.current = true;
      paintBrush(pt.x, pt.y);
    } else if (activeTool === 'erase') {
      eraseIslandAt(pt.x, pt.y);
    } else if (activeTool === 'measure') {
      setMeasure({ a: pt, b: pt });
      dragState.current = { mode: 'measure', startClientX: e.clientX, startClientY: e.clientY, startPan: stagePan, startZoom: stageZoom };
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const pt = canvasToImage(e.clientX, e.clientY);
    if (pt) {
      setHoverPt(pt);
      if (image) {
        const mmPerPx = targetWidthMm / image.info.width;
        setCursorMm({ x: pt.x * mmPerPx, y: pt.y * mmPerPx });
      }
    }
    const drag = dragState.current;
    if (!drag) {
      if (paintingRef.current && activeTool === 'brush' && pt) paintBrush(pt.x, pt.y);
      return;
    }
    if (drag.mode === 'pan') {
      setStagePan({ x: drag.startPan.x + (e.clientX - drag.startClientX), y: drag.startPan.y + (e.clientY - drag.startClientY) });
    } else if (drag.mode === 'zoom') {
      const dy = drag.startClientY - e.clientY;
      setStageZoom(drag.startZoom * Math.exp(dy * 0.01));
    } else if (drag.mode === 'measure' && pt) {
      setMeasure((m) => (m ? { a: m.a, b: pt } : m));
    } else if (drag.mode === 'brush' && pt) {
      paintBrush(pt.x, pt.y);
    }
  }

  function onPointerUp() {
    if (dragState.current?.mode === 'brush' || paintingRef.current) {
      commitEdit();
    }
    paintingRef.current = false;
    dragState.current = null;
  }

  function onPointerLeave() {
    setHoverPt(null);
    setCursorMm(null);
  }

  const cursorClass =
    activeTool === 'pan' ? 'grab' : activeTool === 'zoom' ? 'zoom-in' : activeTool === 'measure' ? 'crosshair' : activeTool === 'brush' || activeTool === 'erase' ? 'crosshair' : 'default';

  return (
    <div className="source-stage" ref={containerRef} onWheel={onWheel}>
      {!image && <DropZone />}
      {image && (
        <canvas
          ref={canvasRef}
          style={{ cursor: cursorClass }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
        />
      )}
    </div>
  );
}
