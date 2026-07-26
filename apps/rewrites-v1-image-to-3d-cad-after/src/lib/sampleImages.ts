export type SampleName = 'bracket' | 'gear' | 'leaf';

const SIZE = 512;

function ctxOf(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#111111';
  return { canvas, ctx };
}

function drawBracket(ctx: CanvasRenderingContext2D) {
  const m = 64;
  const arm = 96;
  const s = SIZE - m * 2;
  ctx.beginPath();
  ctx.moveTo(m, m);
  ctx.lineTo(m + s, m);
  ctx.lineTo(m + s, m + arm);
  ctx.lineTo(m + arm, m + arm);
  ctx.lineTo(m + arm, m + s);
  ctx.lineTo(m, m + s);
  ctx.closePath();
  ctx.fill();
  // mounting holes
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const holes: [number, number][] = [
    [m + 34, m + 34],
    [m + s - 34, m + 34],
    [m + 34, m + s - 34],
  ];
  for (const [hx, hy] of holes) {
    ctx.beginPath();
    ctx.arc(hx, hy, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGear(ctx: CanvasRenderingContext2D) {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const teeth = 14;
  const rOuter = 200;
  const rInner = 168;
  const rRoot = 150;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / teeth / 2;
    const a2 = a0 + (Math.PI * 2) / teeth;
    const p = (a: number, r: number): [number, number] => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    const pts = [p(a0, rRoot), p(a0, rOuter), p(a1, rOuter), p(a1, rInner), p(a2, rInner), p(a2, rRoot)];
    pts.forEach(([x, y], idx) => {
      if (i === 0 && idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
  }
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, 50, 0, Math.PI * 2);
  ctx.fill();
  // spokes / bolt holes
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 95, cy + Math.sin(a) * 95, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLeaf(ctx: CanvasRenderingContext2D) {
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 20;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 190);
  ctx.bezierCurveTo(cx + 170, cy - 150, cx + 150, cy + 110, cx, cy + 190);
  ctx.bezierCurveTo(cx - 150, cy + 110, cx - 170, cy - 150, cx, cy - 190);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(cx, cy + 175);
  ctx.lineTo(cx, cy - 165);
  ctx.stroke();
  for (let i = 1; i <= 4; i++) {
    const t = i / 5;
    const y = cy + 165 - t * 320;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx + 90 * (1 - t) + 20, y - 60 * (1 - t));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx - 90 * (1 - t) - 20, y - 60 * (1 - t));
    ctx.stroke();
  }
  ctx.restore();
}

export async function generateSample(name: SampleName): Promise<File> {
  const { canvas, ctx } = ctxOf();
  if (name === 'bracket') drawBracket(ctx);
  else if (name === 'gear') drawGear(ctx);
  else drawLeaf(ctx);
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
  return new File([blob], `${name}-sample.png`, { type: 'image/png' });
}
