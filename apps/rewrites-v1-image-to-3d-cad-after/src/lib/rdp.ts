import type { Point } from './types';

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len);
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/** Standard Ramer-Douglas-Peucker for an open polyline; keeps endpoints. */
export function rdp(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  let maxDist = -1;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

function distSq(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** RDP for a closed loop: split at the farthest point from the start, simplify each arc, rejoin. */
export function simplifyClosedLoop(points: Point[], epsilon: number): Point[] {
  if (points.length <= 4 || epsilon <= 0) return points;
  const first = points[0];
  let idx = Math.floor(points.length / 2);
  let maxD = -1;
  for (let i = 1; i < points.length; i++) {
    const d = distSq(first, points[i]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  const part1 = points.slice(0, idx + 1);
  const part2 = points.slice(idx).concat([first]);
  const s1 = rdp(part1, epsilon);
  const s2 = rdp(part2, epsilon);
  s2.pop();
  const result = s1.slice(0, -1).concat(s2);
  return result.length >= 3 ? result : points;
}

/** Chaikin corner-cutting on a closed loop, for optional smoothing before simplification. */
export function chaikinClosed(points: Point[], iterations: number): Point[] {
  let pts = points;
  for (let it = 0; it < iterations; it++) {
    const n = pts.length;
    if (n < 3) break;
    const next: Point[] = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % n];
      next.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 });
      next.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
    }
    pts = next;
  }
  return pts;
}
