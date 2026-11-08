// world.js — perspective lens camera, depth layers with per-layer blur, and the painted desert-town set
import { clamp, lerp, hash, mulberry } from '/core/lib.js';
import { W, H, setCtx } from './toon.js';

// —— camera ——
// world: x right, y up, z forward (metres). Camera looks along +z.
export const cam = { x: 0, y: 1.4, z: 0, f: 1700, hy: H * .5, focus: 3, K: 72, maxBlur: 26 };
export function setCam(o) { Object.assign(cam, o); }
export const depth = z => z - cam.z;
export function P(x, y, z) {
  const d = Math.max(.05, z - cam.z);
  return [W / 2 + cam.f * (x - cam.x) / d, cam.hy - cam.f * (y - cam.y) / d];
}
export const pxPerM = z => cam.f / Math.max(.05, z - cam.z);
export function blurAt(z) {
  const d = Math.max(.05, z - cam.z);
  return clamp(cam.K * Math.abs(1 / d - 1 / cam.focus), 0, cam.maxBlur);
}

// —— colour helpers ——
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(t)))).join(',')})`; }
export function shadeHex(a, k) { const A = hex(a); return '#' + A.map(v => clamp(Math.round(v * k), 0, 255).toString(16).padStart(2, '0')).join(''); }
export const HAZE = '#f3dcc4';
export const fogAt = z => 1 - Math.exp(-Math.max(0, z - cam.z) / 260);
export const hz = (c, z, extra = 0) => mix(c, HAZE, clamp(fogAt(z) * .85 + extra));

// —— layer compositor ——
// items: [{z, draw(g)}]; drawn back to front, consecutive items with the same blur share one offscreen layer
let main = null, off = null, og = null;
export function initLayers(canvas) {
  main = canvas.getContext('2d');
  off = document.createElement('canvas'); off.width = W; off.height = H; og = off.getContext('2d');
  return main;
}
export function composite(items) {
  items.sort((a, b) => b.z - a.z);
  main.setTransform(1, 0, 0, 1, 0, 0); main.filter = 'none';
  let i = 0;
  while (i < items.length) {
    const b = Math.round((items[i].blur ?? blurAt(items[i].z)) * 2) / 2;
    og.setTransform(1, 0, 0, 1, 0, 0); og.filter = 'none'; og.globalAlpha = 1; og.globalCompositeOperation = 'source-over';
    og.clearRect(0, 0, W, H); setCtx(og);
    let j = i;
    while (j < items.length && Math.round((items[j].blur ?? blurAt(items[j].z)) * 2) / 2 === b) {
      og.save(); items[j].draw(og); og.restore(); og.setTransform(1, 0, 0, 1, 0, 0); j++;
    }
    main.filter = b >= .5 ? `blur(${b}px)` : 'none';
    main.drawImage(off, 0, 0);
    main.filter = 'none';
    i = j;
  }
  setCtx(main);
}

// —— primitives in world space ——
export function poly(g, pts, fill) {
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
  g.fillStyle = fill; g.fill();
}
const vgrad = (g, y0, y1, c0, c1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; };

// —— the set ——
export function sky(g) {
  const hy = P(0, 0, 1e5)[1];
  const gr = g.createLinearGradient(0, -200, 0, hy + 40);
  gr.addColorStop(0, '#2f8fe0'); gr.addColorStop(.55, '#6cb6f0'); gr.addColorStop(1, '#cfe6f4');
  g.fillStyle = gr; g.fillRect(-50, -50, W + 100, Math.max(hy + 60, 200));
}
export function clouds(g, t) {
  const R = mulberry(7);
  for (let k = 0; k < 4; k++) {
    const x = lerp(-300, 300, R()) + k * 260 - 380 + t * 1.5, y = lerp(45, 90, R()), z = 2600;
    const [sx, sy] = P(x, y, z), s = pxPerM(z);
    g.fillStyle = 'rgba(255,255,255,.95)';
    for (let b = 0; b < 4; b++) { g.beginPath(); g.ellipse(sx + (b - 1.5) * 38 * s, sy - (b % 2) * 18 * s, 34 * s, 22 * s, 0, 0, Math.PI * 2); g.fill(); }
    g.fillRect(sx - 80 * s, sy - 4 * s, 160 * s, 24 * s);
  }
}
export function mesas(g) {
  const z = 1800, base = P(0, 0, z)[1];
  const ridge = [[-900, 0], [-760, 0], [-720, 60], [-560, 66], [-520, 0], [-300, 0], [-260, 95], [-60, 100], [-30, 40], [10, 0], [140, 0], [170, 75], [380, 80], [410, 0], [700, 0], [740, 55], [900, 58], [940, 0]];
  const pts = ridge.map(([x, y]) => P(x, y, z));
  pts.push([W + 200, base + 4], [-200, base + 4]);
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath();
  g.fillStyle = vgrad(g, base - 140, base, '#e8a58a', '#efc2a8'); g.fill();
}
// ground as strips: each strip covers from its far edge down to the screen bottom
export function groundItems(zs) {
  const items = [];
  for (let i = 0; i < zs.length - 1; i++) {
    const zf = zs[i + 1], zn = zs[i];
    if (zf <= cam.z + .3) continue;
    items.push({
      z: (zf + Math.max(zn, cam.z + .3)) / 2, draw: g => {
        const yf = P(0, 0, zf)[1];
        const gr = g.createLinearGradient(0, yf, 0, H);
        gr.addColorStop(0, hz('#e7c18c', zf)); gr.addColorStop(1, '#e9b97a');
        g.fillStyle = gr; g.fillRect(-60, yf, W + 120, H - yf + 60);
        // wheel ruts and footprints, only on this strip
        g.save(); g.beginPath(); g.rect(-60, yf, W + 120, H); g.clip();
        g.lineCap = 'round';
        for (const rx of [-1.25, 1.1]) {
          const a = P(rx, 0, zf), b = P(rx + .15, 0, Math.max(zn, cam.z + .3));
          g.strokeStyle = 'rgba(150,100,55,.35)'; g.lineWidth = Math.max(1, .14 * pxPerM((zf + zn) / 2));
          g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
          g.strokeStyle = 'rgba(255,240,215,.35)'; g.lineWidth *= .4;
          g.beginPath(); g.moveTo(a[0] + 3, a[1]); g.lineTo(b[0] + 3, b[1]); g.stroke();
        }
        const R = mulberry(Math.floor(zf * 10));
        for (let k = 0; k < 6; k++) {
          const z = lerp(Math.max(zn, cam.z + .4), zf, R()), x = lerp(-4, 4, R()), [sx, sy] = P(x, 0, z), s = pxPerM(z);
          g.fillStyle = 'rgba(160,110,60,.22)'; g.beginPath(); g.ellipse(sx, sy, .16 * s, .05 * s, 0, 0, Math.PI * 2); g.fill();
        }
        // buildings on the right cast a shadow band onto the street; porches shade the boardwalk edge
        for (const b of TOWN) {
          const xs = b.side * 6.6, w = b.side > 0 ? 3.2 : .9, za = Math.max(b.z0, cam.z + .3);
          if (b.z1 <= cam.z + .3) continue;
          const xa = xs - b.side * 1.9, xb = xa - b.side * w;
          const q = g.createLinearGradient(...P(xa, 0, (za + b.z1) / 2), ...P(xb, 0, (za + b.z1) / 2));
          q.addColorStop(0, 'rgba(120,62,48,.34)'); q.addColorStop(.75, 'rgba(120,62,48,.26)'); q.addColorStop(1, 'rgba(120,62,48,0)');
          poly(g, [P(xa, 0, za), P(xa, 0, b.z1 + 1.2), P(xb, 0, b.z1 + 1.8), P(xb, 0, za + .6)], q);
        }
        g.restore();
      }
    });
  }
  return items;
}

// a painted false-front building along the street. side -1 = left row (facade faces +x), +1 = right row
export function building(b) {
  const { side, z0, z1, h, col, sign } = b, xs = side * 6.6, xo = side * 13;
  return {
    z: (z0 + z1) / 2, draw: g => {
      const zc = (z0 + z1) / 2, lit = side < 0;
      const face = lit ? col : shadeHex(col, .78), end = lit ? shadeHex(col, .7) : shadeHex(col, .9);
      // end wall facing the camera
      const e = [P(xs, 0, z0), P(xo, 0, z0), P(xo, h, z0), P(xs, h, z0)];
      poly(g, e, hz(end, z0));
      // facade
      const f = [P(xs, 0, z0), P(xs, 0, z1), P(xs, h + .9, z1), P(xs, h + .9, z0)];
      const top = Math.min(f[2][1], f[3][1]), bot = Math.max(f[0][1], f[1][1]);
      const gr = g.createLinearGradient(0, top, 0, bot);
      gr.addColorStop(0, hz(shadeHex(face, 1.12), zc)); gr.addColorStop(1, hz(shadeHex(face, .82), zc));
      poly(g, f, gr);
      // wood siding
      g.strokeStyle = 'rgba(60,25,15,.13)'; g.lineWidth = Math.max(.6, .03 * pxPerM(zc));
      for (let y = 3.3; y < h + .8; y += .32) { g.beginPath(); g.moveTo(...P(xs, y, z0)); g.lineTo(...P(xs, y, z1)); g.stroke(); }
      // porch shadow on the wall and ambient occlusion at the base
      const ao = (ya, yb, a) => { const pa = P(xs, ya, zc), pb = P(xs, yb, zc); const q = g.createLinearGradient(0, pa[1], 0, pb[1]); q.addColorStop(0, `rgba(55,22,12,${a})`); q.addColorStop(1, 'rgba(55,22,12,0)'); poly(g, [P(xs, ya, z0), P(xs, ya, z1), P(xs, yb, z1), P(xs, yb, z0)], q); };
      ao(3.1, 1.2, lit ? .45 : .3); ao(0, .9, .35);
      // trim along the top
      poly(g, [P(xs, h + .9, z0), P(xs, h + .9, z1), P(xs, h + .6, z1), P(xs, h + .6, z0)], hz(shadeHex(col, .55), zc));
      // windows (upper) and door (lower)
      const n = Math.max(1, Math.round((z1 - z0) / 3.2));
      for (let k = 0; k < n; k++) {
        const za = lerp(z0, z1, (k + .3) / n), zb = lerp(z0, z1, (k + .7) / n);
        poly(g, [P(xs, h - 2.3, za - .08), P(xs, h - 2.3, zb + .08), P(xs, h - .8, zb + .08), P(xs, h - .8, za - .08)], hz(shadeHex(col, .6), za));
        const wg = g.createLinearGradient(0, P(xs, h - .9, za)[1], 0, P(xs, h - 2.2, za)[1]);
        wg.addColorStop(0, hz('#1f1518', za, .03)); wg.addColorStop(1, hz('#5c4a52', za, .05));
        poly(g, [P(xs, h - 2.2, za), P(xs, h - 2.2, zb), P(xs, h - .9, zb), P(xs, h - .9, za)], wg);
        g.globalAlpha = .35; poly(g, [P(xs, h - 1.1, za + (zb - za) * .15), P(xs, h - 1.1, za + (zb - za) * .35), P(xs, h - 2.1, za + (zb - za) * .55), P(xs, h - 2.1, za + (zb - za) * .35)], '#bfe0f0'); g.globalAlpha = 1;
        poly(g, [P(xs, h - 2.3, za - .12), P(xs, h - 2.3, zb + .12), P(xs - side * .12, h - 2.42, zb + .12), P(xs - side * .12, h - 2.42, za - .12)], hz('#f5e6c8', za));
      }
      const dz = lerp(z0, z1, .5);
      poly(g, [P(xs, 0, dz - .6), P(xs, 0, dz + .6), P(xs, 2.3, dz + .6), P(xs, 2.3, dz - .6)], hz('#4a3026', dz));
      // porch roof and posts toward the street
      const xp = xs - side * 1.9;
      poly(g, [P(xs, 3.1, z0), P(xp, 2.8, z0), P(xp, 2.8, z1), P(xs, 3.1, z1)], hz('#7a4b33', zc));
      poly(g, [P(xs, 3.1, z0), P(xp, 2.8, z0), P(xp, 2.65, z0), P(xs, 2.95, z0)], hz('#5a3524', z0));
      for (const zp of [z0 + .2, z1 - .2]) {
        const a = P(xp, 0, zp), c = P(xp, 2.8, zp), wpx = Math.max(1.5, .14 * pxPerM(zp));
        g.fillStyle = hz('#6b412c', zp); g.fillRect(a[0] - wpx / 2, c[1], wpx, a[1] - c[1]);
      }
      // boardwalk
      poly(g, [P(xs, .25, z0), P(xp, .25, z0), P(xp, .25, z1), P(xs, .25, z1)], hz('#b07a4e', zc));
      poly(g, [P(xp, .25, z0), P(xp, 0, z0), P(xp, 0, z1), P(xp, .25, z1)], hz('#8a5a38', zc));
      // contact shadow on the ground along the boardwalk
      g.globalAlpha = .25; poly(g, [P(xp, 0, z0), P(xp - side * .7, 0, z0), P(xp - side * .7, 0, z1), P(xp, 0, z1)], '#8a5a30'); g.globalAlpha = 1;
      if (sign) {
        // sign painted on the false front: an affine map onto the facade plane
        const zA = lerp(z0, z1, side < 0 ? .15 : .85), zB = lerp(z0, z1, side < 0 ? .85 : .15), y0 = h + .45, y1 = h - .45;
        const p00 = P(xs, y0, zA), p10 = P(xs, y0, zB), p01 = P(xs, y1, zA);
        poly(g, [P(xs, y0, zA), P(xs, y0, zB), P(xs, y1, zB), P(xs, y1, zA)], hz('#f3e3c0', zc));
        g.save();
        const wpx = Math.hypot(p10[0] - p00[0], p10[1] - p00[1]), hpx = Math.hypot(p01[0] - p00[0], p01[1] - p00[1]);
        g.setTransform((p10[0] - p00[0]) / 200, (p10[1] - p00[1]) / 200, (p01[0] - p00[0]) / 50, (p01[1] - p00[1]) / 50, p00[0], p00[1]);
        g.font = '600 34px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = hz('#7a2e1f', zc); g.fillText(sign, 100, 27);
        g.restore();
        if (wpx < 0 || hpx < 0) return;
      }
    }
  };
}
// telegraph pole with wires to the next pole
export function pole(x, z, zNext) {
  return {
    z, draw: g => {
      const a = P(x, 0, z), c = P(x, 7.2, z), w = Math.max(1.2, .2 * pxPerM(z));
      g.fillStyle = hz('#5b3b2a', z); g.fillRect(a[0] - w / 2, c[1], w, a[1] - c[1]);
      const cb = [P(x - .9, 6.7, z), P(x + .9, 6.7, z)];
      g.strokeStyle = hz('#5b3b2a', z); g.lineWidth = Math.max(1, .12 * pxPerM(z)); g.beginPath(); g.moveTo(...cb[0]); g.lineTo(...cb[1]); g.stroke();
      if (zNext) {
        g.strokeStyle = hz('#3a2a24', z, .1); g.lineWidth = 1.6;
        for (const dx of [-.8, 0, .8]) {
          g.beginPath();
          for (let i = 0; i <= 16; i++) { const u = i / 16, zz = lerp(z, zNext, u), sag = Math.sin(u * Math.PI) * .45; const p = P(x + dx, 6.75 - sag, zz); i ? g.lineTo(...p) : g.moveTo(...p); }
          g.stroke();
        }
      }
    }
  };
}
// soft contact shadow under a character
export function contact(g, x, z, rx = .45, a = .55) {
  // sun shadow: a soft elongated shape falling to the lower left
  { const [sx, sy] = P(x, 0, z), [ex, ey] = P(x - .9, 0, z - .35), s = pxPerM(z);
    g.save(); g.translate(sx, sy); g.rotate(Math.atan2(ey - sy, ex - sx)); const L = Math.hypot(ex - sx, ey - sy);
    const q = g.createLinearGradient(0, 0, L, 0); q.addColorStop(0, 'rgba(120,62,40,.38)'); q.addColorStop(1, 'rgba(120,62,40,0)');
    g.fillStyle = q; g.beginPath(); g.ellipse(L * .45, 0, L * .6, .16 * s, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  const [sx, sy] = P(x, 0, z), s = pxPerM(z);
  const gr = g.createRadialGradient(sx, sy, 0, sx, sy, rx * s);
  gr.addColorStop(0, `rgba(110,60,30,${a})`); gr.addColorStop(1, 'rgba(110,60,30,0)');
  g.fillStyle = gr; g.save(); g.translate(sx, sy); g.scale(1, .28); g.translate(-sx, -sy);
  g.beginPath(); g.arc(sx, sy, rx * s, 0, Math.PI * 2); g.fill(); g.restore();
}
export function tumbleweed(g, x, z, rot, r = .35) {
  const [sx, sy] = P(x, r, z), s = pxPerM(z) * r;
  g.save(); g.translate(sx, sy); g.rotate(rot);
  g.strokeStyle = '#9a7340'; g.lineWidth = Math.max(1, s * .045); g.lineCap = 'round';
  const R = mulberry(3);
  for (let k = 0; k < 26; k++) {
    const a0 = R() * 6.28, a1 = a0 + 1.5 + R() * 2, rr = s * (.55 + R() * .45);
    g.beginPath(); g.ellipse(0, 0, rr, rr * (.6 + R() * .4), R() * 3, a0, a1); g.stroke();
  }
  g.strokeStyle = '#c9a265'; g.lineWidth *= .7;
  for (let k = 0; k < 14; k++) { const a0 = R() * 6.28, rr = s * (.4 + R() * .5); g.beginPath(); g.ellipse(0, 0, rr, rr * .7, R() * 3, a0, a0 + 2); g.stroke(); }
  g.restore();
}

// the street of Dustwater
export const TOWN = [
  { side: -1, z0: 9, z1: 17, h: 6.2, col: '#c8613f', sign: 'SALOON' },
  { side: -1, z0: 17.5, z1: 25, h: 5.2, col: '#d98b4e' },
  { side: -1, z0: 26, z1: 36, h: 6.8, col: '#b8553b', sign: 'GENERAL STORE' },
  { side: -1, z0: 37, z1: 46, h: 5.4, col: '#d4a06a' },
  { side: -1, z0: 47, z1: 60, h: 6.4, col: '#c46a46' },
  { side: -1, z0: 62, z1: 76, h: 5.6, col: '#cf8a58' },
  { side: 1, z0: 12, z1: 22, h: 5.8, col: '#a95a46', sign: 'POST OFFICE' },
  { side: 1, z0: 23, z1: 31, h: 6.6, col: '#c97b4f' },
  { side: 1, z0: 32, z1: 44, h: 5.3, col: '#b9694a', sign: 'BANK' },
  { side: 1, z0: 45, z1: 57, h: 6.2, col: '#d39463' },
  { side: 1, z0: 59, z1: 72, h: 5.5, col: '#b86448' },
];
export function setItems(t) {
  const items = [{ z: 1e5, blur: blurAt(3000), draw: g => { sky(g); clouds(g, t); } }, { z: 1800, draw: g => mesas(g) }];
  const zs = [cam.z + .3, 2, 3, 4, 5.5, 7, 9, 12, 16, 22, 30, 42, 60, 90, 140, 220, 400, 900, 1700];
  items.push(...groundItems(zs));
  for (const b of TOWN) items.push(building(b));
  for (let z = 14; z < 80; z += 16) items.push(pole(4.4, z, z + 16 < 80 ? z + 16 : null));
  return items;
}
