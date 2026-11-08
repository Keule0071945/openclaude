// captions.js — one big outlined word at a time
import { clamp } from '/core/lib.js';
import { W, H } from './toon.js';
export function word(g, w, t0, t, { y = H * .72, size = 118 } = {}) {
  if (!w) return;
  const k = clamp((t - t0) * 24 / 3);              // 3-frame pop
  const sc = k < 1 ? (k < .66 ? .82 + (1.06 - .82) * k / .66 : 1.06 - .06 * (k - .66) / .34) : 1;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none';
  g.translate(W / 2, y); g.scale(sc, sc);
  g.font = `${size}px "Lilita One"`; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = size; while (g.measureText(w).width > W - 120 && fs > 60) { fs -= 4; g.font = `${fs}px "Lilita One"`; }
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowOffsetY = 8; g.shadowBlur = 10;
  g.lineJoin = 'round'; g.lineWidth = 16; g.strokeStyle = '#111'; g.strokeText(w, 0, 0);
  g.shadowColor = 'transparent'; g.fillStyle = '#fff'; g.fillText(w, 0, 0);
  g.restore();
}
