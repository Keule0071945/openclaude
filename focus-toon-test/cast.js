// cast.js — Shallow-Focus Toon characters. Local units are centimetres, origin at the feet, y down.
import { clamp, lerp } from '/core/lib.js';
import { INK, push, pop, translate, rotate, scale, shape, fillOnly, stroke, ell, arc, spline, rr, rect, noodle, quad, dot, text, S } from './toon.js';
import { P, pxPerM } from './world.js';

export const HEAD = '#fbfaf7', HEADS = '#e3ddd3';

// place a character at world (x, z) and scale it to the lens; line width follows size, within limits
export function place(x, z, fn, { y = 0, lean = 0 } = {}) {
  const [sx, sy] = P(x, y, z), s = pxPerM(z) / 100;
  push(); translate(sx, sy); scale(s); if (lean) rotate(lean);
  const old = S.lwScale; S.lwScale = clamp(Math.pow(s / 5.3, .7), .2, 1.25);
  fn(); S.lwScale = old; pop();
}

// —— shared face ——
// brow: + cross (stern), − worried; lid 0..1 heavy lid; look [-1..1, -1..1]
function face(cx, cy, r, { look = [0, 0], brow = 0, lid = .35, blink = false, browCol = '#3a2c2a', eyeR = .11, gap = .34 } = {}) {
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * r * gap + look[0] * r * .14, ey = cy - r * .02 + look[1] * r * .08;
    if (blink) stroke([[ex - r * .12, ey], [ex + r * .12, ey]], 5);
    else {
      dot(ex, ey, r * eyeR);
      if (lid > .05) stroke(quad([ex - r * .16, ey - r * .16 + lid * r * .08], [ex, ey - r * .2 + lid * r * .07], [ex + r * .16, ey - r * .16 + lid * r * .08], 8), 4);
    }
    // heavy brow wedge: inner end drops with +brow
    const bi = [cx + sgn * r * .1, cy - r * .3 + brow * r * .12], bo = [cx + sgn * r * .58, cy - r * .36 - brow * r * .06];
    const th = r * .12;
    shape([[bi[0], bi[1] - th * .5], [bo[0], bo[1] - th * .55], [bo[0] + sgn * r * .03, bo[1] + th * .35], [bi[0], bi[1] + th * .7]], { fill: browCol, lw: 3, line: browCol, boil: .4 });
  }
}

// —— a townsperson ——
export function person(o = {}) {
  const {
    body = '#e0a43a', bodyS = '#b98228', trim = '#2f8f8a', legs = '#3b3036', shoe = '#5a3a2a', hat = '#6e4630', hatS = '#4f311f', band = '#2b1d18',
    look = [0, 0], brow = 0, lid = .35, blink = false, stache = null, mouth = 0, droop = 0, breathe = 0, armL = 0, armR = 0, hold = null, hatOn = true,
    walk = -1, tilt = 0, lift = 0
  } = o;
  const by = 1 + breathe * .012;
  // legs (noodles) with a walk cycle
  const ph = walk < 0 ? 0 : walk;
  for (const sgn of [-1, 1]) {
    const sw = walk < 0 ? 0 : Math.sin(ph * Math.PI * 2 + (sgn > 0 ? Math.PI : 0)) * 10;
    const up = walk < 0 ? 0 : Math.max(0, Math.sin(ph * Math.PI * 2 + (sgn > 0 ? Math.PI : 0))) * 6;
    shape(noodle([sgn * 9, -74], [sgn * 11 + sw, -6 - up], sgn * 2, 6, 6), { fill: legs, lw: 5 });
    shape(ell(sgn * 13 + sw + sgn * 3, -5 - up, 11, 6.5, 18), { fill: shoe, lw: 5 });
  }
  push(); translate(0, -74); scale(1, by); rotate(tilt); translate(0, 74);
  // poncho / tunic
  const bodyP = spline([[-23, -150], [23, -150], [33, -110], [36, -72], [0, -66], [-36, -72], [-33, -110]]);
  shape(bodyP, {
    fill: body, lw: 6, shade: () => {
      fillOnly([[10, -160], [50, -160], [50, -60], [16, -60]], bodyS, { boil: .3 });
      // zig-zag band and dots
      const zz = []; for (let i = 0; i <= 12; i++) zz.push([-40 + i * 6.8, -98 + (i % 2 ? -5 : 5)]);
      stroke(zz, 7, { line: trim, boil: .3 });
      for (let i = 0; i < 6; i++) dot(-25 + i * 10, -84, 2.2, '#fff6dc');
    }
  });
  // arms
  const sh = [[-20, -140], [20, -140]];
  const hands = [[-30 - armL * 4, -96 - armL * 52], [30 + armR * 4, -96 - armR * 52]];
  for (let k = 0; k < 2; k++) {
    shape(noodle(sh[k], hands[k], (k ? -1 : 1) * 8, 7, 6), { fill: body, lw: 5 });
    shape(ell(hands[k][0], hands[k][1], 7.5, 7, 16), { fill: HEAD, lw: 5 });
  }
  if (hold) hold(hands[1]);
  // head
  const hy = -184 + lift;
  shape(ell(0, hy, 34, 33, 48), { fill: HEAD, lw: 6, shade: () => fillOnly(ell(14, hy + 8, 30, 32, 30), HEADS, { boil: .3 }) });
  face(0, hy + 4, 34, { look, brow, lid, blink });
  if (stache) {
    const m = spline([[-2, hy + 13], [-14, hy + 11], [-24, hy + 18], [-20, hy + 26], [-8, hy + 22], [0, hy + 19], [8, hy + 22], [20, hy + 26], [24, hy + 18], [14, hy + 11], [2, hy + 13]]);
    shape(m, { fill: stache, lw: 4 });
  } else {
    stroke(quad([-8, hy + 20 + mouth * 2], [0, hy + 20 - mouth * 5], [8, hy + 20 + mouth * 2], 8), 4);
  }
  // hat
  if (hatOn) {
    push(); translate(0, hy - 26); rotate(droop * .12); translate(0, droop * 6);
    shape(spline([[-22, 0], [-20, -30], [-8, -36], [0, -30], [8, -36], [20, -30], [22, 0]]), { fill: hat, lw: 6, shade: () => fillOnly(rect(8, -40, 20, 44), hatS, { boil: .3 }) });
    fillOnly(rect(-22, -9, 44, 8), band, { boil: .3 });
    const dr = droop * 14;
    shape(spline([[-62, 2 + dr], [-40, -6], [0, -9], [40, -6], [62, 2 + dr], [40, 9], [0, 10], [-40, 9]]), { fill: hat, lw: 6, shade: () => fillOnly(rect(-70, 4, 140, 20), hatS, { boil: .3 }) });
    pop();
  }
  pop();
}

export const MORT = { body: '#e0a43a', bodyS: '#b98228', trim: '#2f8f8a', legs: '#3b3036', hat: '#6e4630', hatS: '#4f311f', stache: '#c9c1b6' };
export const FOLK = [
  { body: '#2f8f8a', bodyS: '#1f6b67', trim: '#f2d16b', legs: '#3b3036', hat: '#d9c7a0', hatS: '#b9a57c', band: '#7a2e1f' },
  { body: '#c9473a', bodyS: '#9b3027', trim: '#f4e6c6', legs: '#2d2a3a', hatOn: false },
  { body: '#7b4f9e', bodyS: '#5a3577', trim: '#f2d16b', legs: '#3b3036', hat: '#3a2a24', hatS: '#2a1d18' },
];

// —— Pedro, the mail tortoise ——
// view 'front' (walking toward camera) or 'side' (face = -1 looks left). step 0..1 cycle, reach lifts a front foot with the letter
export function pedro({ view = 'side', face = -1, step = -1, look = [0, 0], brow = .4, blink = false, reach = 0, letter = false } = {}) {
  const shell = '#7d9b4c', shellS = '#5d7a35', rim = '#c8b46a', skin = '#b8c58e', cap = '#2f6db5', capS = '#22508a', bag = '#c79a5b';
  const bob = step < 0 ? 0 : Math.abs(Math.sin(step * Math.PI * 2)) * 2;
  if (view === 'front') {
    for (const sgn of [-1, 1]) {
      const lift = step < 0 ? 0 : Math.max(0, Math.sin(step * Math.PI * 2 + (sgn > 0 ? Math.PI : 0))) * 5;
      shape(rr(sgn * 22 - 7, -16 - lift, 14, 16, 6), { fill: skin, lw: 5 });
    }
    push(); translate(0, -bob);
    shape(spline([[-34, -10], [-30, -32], [-14, -44], [14, -44], [30, -32], [34, -10], [0, -6]]), {
      fill: shell, lw: 6, shade: () => { fillOnly(rect(8, -50, 40, 50), shellS, { boil: .3 }); for (const [x, y] of [[-14, -30], [0, -36], [14, -30]]) shape(spline([[x - 7, y], [x, y - 6], [x + 7, y], [x + 5, y + 7], [x - 5, y + 7]]), { fill: null, lw: 3, line: '#4f6a2c' }); }
    });
    shape(rr(-36, -14, 72, 8, 4), { fill: rim, lw: 5 });
    // bag strap and bag on his right
    stroke(quad([-26, -34], [0, -26], [30, -16], 10), 5, { line: '#8a5f2f' });
    shape(rr(26, -24, 16, 16, 4), { fill: bag, lw: 4 });
    // head + neck
    shape(rr(-6, -20, 12, 12, 5), { fill: skin, lw: 5 });
    shape(ell(0, -26, 13, 12.5, 30), { fill: HEAD, lw: 6, shade: () => fillOnly(ell(6, -22, 12, 13, 20), HEADS, { boil: .3 }) });
    face(0, -24, 13, { look, brow, lid: .25, blink, eyeR: .13, gap: .38 });
    shape(spline([[-13, -33], [-10, -42], [10, -42], [13, -33]]), { fill: cap, lw: 5, shade: () => fillOnly(rect(4, -46, 12, 16), capS, { boil: .3 }) });
    shape(ell(0, -33, 15, 3.5, 20), { fill: capS, lw: 4 });
    pop();
    return;
  }
  push(); scale(-face, 1);   // local drawing faces right; mirror for face=-1
  // back legs
  const legs = [[-20, 0], [18, 1], [-10, 0.5], [26, 0]];
  legs.forEach(([lx, ph0], i) => {
    const lift = step < 0 ? 0 : Math.max(0, Math.sin((step + ph0 * .5) * Math.PI * 2)) * 5;
    const isReach = i === 3 && reach > 0;
    if (isReach) return;
    shape(rr(lx - 6, -14 - lift, 12, 14, 5), { fill: i < 2 ? '#9fae73' : skin, lw: 5 });
  });
  push(); translate(0, -bob);
  // tail
  shape(spline([[-34, -12], [-44, -8], [-34, -6]]), { fill: skin, lw: 4 });
  // shell
  shape(spline([[-38, -10], [-32, -34], [-8, -46], [20, -42], [36, -26], [38, -10], [0, -6]]), {
    fill: shell, lw: 6, shade: () => {
      fillOnly(spline([[-44, -20], [0, -16], [44, -18], [44, 0], [-44, 0]]), shellS, { boil: .3 });
      for (const [x, y] of [[-20, -26], [0, -32], [20, -26], [-6, -18], [14, -16]]) shape(spline([[x - 8, y], [x - 2, y - 7], [x + 7, y - 4], [x + 6, y + 5], [x - 4, y + 6]]), { fill: null, lw: 3, line: '#4f6a2c' });
    }
  });
  shape(rr(-40, -14, 80, 8, 4), { fill: rim, lw: 5 });
  // mail bag
  stroke(quad([-12, -44], [4, -30], [10, -14], 10), 5, { line: '#8a5f2f' });
  shape(spline([[-2, -22], [20, -24], [22, -6], [0, -6]]), { fill: bag, lw: 4, shade: () => fillOnly(rect(-4, -26, 30, 6), '#a77c44', { boil: .3 }) });
  // neck and head
  shape(noodle([30, -14], [46, -26], -3, 11, 10), { fill: skin, lw: 5 });
  push(); translate(50, -30);
  shape(ell(0, 0, 13, 12.5, 30), { fill: HEAD, lw: 6, shade: () => fillOnly(ell(-6, 5, 12, 12, 20), HEADS, { boil: .3 }) });
  face(4, 1, 12, { look: [look[0] * -face, look[1]], brow, lid: .25, blink, eyeR: .13, gap: .4 });
  shape(spline([[-12, -8], [-9, -18], [9, -18], [12, -8]]), { fill: cap, lw: 5, shade: () => fillOnly(rect(4, -22, 12, 16), capS, { boil: .3 }) });
  shape(spline([[6, -10], [22, -9], [22, -6], [6, -6]]), { fill: capS, lw: 4 });
  pop();
  // reaching front leg with the letter
  if (reach > 0) {
    const hx = lerp(30, 44, reach), hy = lerp(-6, -46, reach);
    shape(noodle([26, -12], [hx, hy], 4, 11, 10), { fill: skin, lw: 5 });
    if (letter) envelope(hx + 6, hy - 6, -.25, 1);
  }
  pop();
  pop();
}
export function envelope(x, y, a = 0, s = 1) {
  push(); translate(x, y); rotate(a); scale(s);
  shape(rect(-16, -11, 32, 22), { fill: '#fbf4e2', lw: 4 });
  stroke([[-16, -11], [0, 2], [16, -11]], 3);
  shape(ell(0, 1, 3.5, 3.5, 12), { fill: '#c9473a', lw: 2 });
  pop();
}
