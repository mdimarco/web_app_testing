export interface Point {
  x: number;
  y: number;
}

export interface ThresholdParams {
  threshold: number; // 0-255
  invert: boolean;
  minIslandArea: number; // px^2
}

export interface ContourParams {
  simplifyTolerance: number; // 0-4 px
  smoothing: number; // 0-1
}

export interface SolidParams {
  targetWidthMm: number;
  extrudeDepthMm: number;
  bevelMm: number;
  twoSided: boolean;
}

export interface ContourInfo {
  loopCount: number;
  islandsTotal: number;
  islandsFiltered: number;
}

export interface BBox {
  w: number;
  d: number;
  h: number;
}

export interface GeneratedGeometry {
  positions: Float32Array;
  normals: Float32Array;
  bbox: BBox;
  triangleCount: number;
  openEdges: number;
  watertight: boolean;
}

export interface ImageInfo {
  name: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  sizeBytes: number;
  type: string;
  downsampled: boolean;
}

export type ToolId = 'select' | 'brush' | 'erase' | 'pan' | 'zoom' | 'measure';

export type PipelineStage = 'read' | 'trace' | 'simplify' | 'extrude' | 'watertight';

export interface ProgressInfo {
  stage: PipelineStage;
  progress: number; // 0-1
  detail?: string;
}

export type ExportFormat = 'stl' | 'obj' | 'glb';
