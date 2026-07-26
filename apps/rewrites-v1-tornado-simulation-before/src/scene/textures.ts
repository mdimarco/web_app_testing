import * as THREE from 'three';

export function makeGroundTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // base dried prairie grass tone
  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, '#4a4127');
  base.addColorStop(1, '#3a3620');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // patchy variation
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 5 + 1;
    const shade = Math.random();
    const c =
      shade < 0.5
        ? `rgba(90,96,50,${0.05 + Math.random() * 0.2})`
        : `rgba(58,50,30,${0.05 + Math.random() * 0.25})`;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // furrow lines (field rows)
  ctx.strokeStyle = 'rgba(30,26,16,0.15)';
  ctx.lineWidth = 2;
  for (let i = -size; i < size * 2; i += 18) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size * 0.4, size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  tex.anisotropy = 4;
  return tex;
}

export function makeSpriteTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function makeDebrisTexture(color: string): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }
  return new THREE.CanvasTexture(canvas);
}
