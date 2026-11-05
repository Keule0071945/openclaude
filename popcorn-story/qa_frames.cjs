// Per-frame QA: renders every Nth frame, checks framing + luminance jumps, saves thumbnails for review.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const step = +(process.argv[2] || 3);
  const tl = JSON.parse(fs.readFileSync(__dirname + '/timeline.json', 'utf8'));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('http://127.0.0.1:8768/render3d.html'); await p.waitForFunction(() => window.ready === true);
  await p.evaluate(tl => window.init(tl), tl);
  fs.mkdirSync(__dirname + '/qaf', { recursive: true });
  const N = Math.ceil(tl.total * 30), out = []; let prev = null;
  for (let f = 0; f < N; f += step) {
    const r = await p.evaluate(f => window.qaFrame(f), f);
    fs.writeFileSync(`${__dirname}/qaf/${String(f).padStart(5, '0')}.jpg`, Buffer.from(r.thumb.split(',')[1], 'base64')); delete r.thumb;
    r.jump = prev ? +(r.lum - prev.lum).toFixed(1) : 0; prev = r; out.push(r);
  }
  fs.writeFileSync(__dirname + '/qa_frames.json', JSON.stringify(out));
  const blockedF = out.filter(r => r.blocked);
  const off = out.filter(r => r.bad.length), jumps = out.filter(r => Math.abs(r.jump) > 18 && !r.nearCut);
  console.log(`frames checked: ${out.length}, subject out of safe area: ${off.length}, luminance jumps outside dissolves: ${jumps.length}`);
  off.slice(0, 40).forEach(r => console.log(`  OFF ${r.scene}#${r.k} t=${r.t} ${JSON.stringify(r.bad)}`));
  jumps.forEach(r => console.log(`  JUMP ${r.scene} t=${r.t} dL=${r.jump}`));
  console.log(`camera blocked by geometry: ${blockedF.length}`);blockedF.slice(0,30).forEach(r => console.log(`  BLOCK ${r.scene}#${r.k} t=${r.t} ${r.blocked}`));
  await b.close();
})();
