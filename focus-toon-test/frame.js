// frame.js — style-frame page logic (one still): FG character out of focus, mid-street character sharp
import { frame, W, H } from './toon.js';
import { initLayers, composite, setCam, setItems, contact, tumbleweed, cam } from './world.js';
import { place, person, MORT, FOLK } from './cast.js';
import { word } from './captions.js';
const cv = document.getElementById('c'); const main = initLayers(cv);
window.DUR = 1;
window.render = t => {
  frame(t);
  setCam({ x: .55, y: 1.25, z: 0, f: 1650, hy: H * .5, focus: 9, K: 72 });
  const items = setItems(t);
  items.push({ z: 9, draw: g => { contact(g, .4, 9); tumbleweed(g, 1.9, 9.5, 1.2); } });
  items.push({ z: 9.01, draw: () => place(.4, 9, () => person({ ...FOLK[0], look: [-.4, .1], brow: .8, lid: .5 })) });
  items.push({ z: 2.9, draw: g => { contact(g, -.2, 2.9, .5); place(-.2, 2.9, () => person({ ...MORT, look: [.8, 0], brow: .9, lid: .55 })); } });
  composite(items);
  word(main, 'NOON.', 0, 1);
};
document.fonts.load('118px "Lilita One"').then(() => document.fonts.load('600 34px Fredoka')).then(() => { window.READY = true; });
