// QA run: framing/occlusion/speed report + one labelled frame per shot
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const tl = JSON.parse(fs.readFileSync(__dirname + '/timeline.json', 'utf8'));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/render3d.html'); await p.waitForFunction(() => window.ready === true);
  await p.evaluate(tl => window.init(tl), tl);
  const rep = await p.evaluate(() => window.qaShots());
  fs.writeFileSync(__dirname + '/qa_report.json', JSON.stringify(rep, null, 1));
  for (const r of rep) {
    if (r.peak) { console.log(`  ${r.scene} peak ${r.peak.ang}°/s @${r.peak.t}`); continue; }
    const bad = r.pts.filter(q => !q.ok || q.occ);
    console.log(`${r.scene}#${r.shot} t=${r.t} ${bad.length ? 'PROBLEM ' + bad.map(q => `[${q.p}] scr(${q.sx},${q.sy})${q.occ ? ' occ:' + q.occ : ''}`).join(' ') : 'ok'}`);
  }
  if (process.argv[2] === 'frames') {
    fs.mkdirSync(__dirname + '/qa', { recursive: true });
    for (const r of rep.filter(r => !r.peak)) {
      const u = await p.evaluate(f => renderFrame(f), Math.round(r.t * 30));
      fs.writeFileSync(`${__dirname}/qa/${String(r.t.toFixed(2)).padStart(6, '0')}_${r.scene}_${r.shot}.jpg`, Buffer.from(u.split(',')[1], 'base64'));
    }
  }
  if (errs.length) console.log('ERRORS', errs.join('\n'));
  await b.close();
})();
