const { chromium } = require('playwright');
const fs = require('fs'); const { spawn } = require('child_process');
(async () => {
  const mode = process.argv[2] || 'preview';
  const tl = JSON.parse(fs.readFileSync(__dirname + '/timeline.json', 'utf8'));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:8769/render3d.html');
  try{await page.waitForFunction(()=>window.ready===true,null,{timeout:60000});}catch(e){console.log('NOT READY',errs.join('\n'));process.exit(1);}
  const ok = await page.evaluate(tl => window.init(tl), tl); console.log('font ok', ok);
  page.on('pageerror', e => console.log('ERRS', e.message));
  if (mode === 'preview') {
    const times = (process.argv[3] || '').split(',').filter(Boolean).map(Number);
    for (const t of times) {
      const url = await page.evaluate(f => renderFrame(f), Math.round(t * 30));
      fs.writeFileSync(`${__dirname}/frames/p_${t.toFixed(2)}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
    }
  } else if (mode === 'seg') {
    const a = +process.argv[3], b = +process.argv[4], out = process.argv[5];
    for (let f = Math.max(0, a - 45); f < a; f++) await page.evaluate(f => window.simFrame(f), f);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out + '.part.mp4']);
    for (let f = a; f < b; f++) {
      const url = await page.evaluate(f => renderFrame(f), f);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    fs.renameSync(out + '.part.mp4', out);
    console.log(`segment ${a}-${b} done`);
  } else {
    const N = Math.ceil(tl.total * 30);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', __dirname + '/video3d_noaudio.mp4']);
    ff.stderr.on('data', d => process.stderr.write(d));
    const t0 = Date.now();
    for (let f = 0; f < N; f++) {
      const url = await page.evaluate(f => renderFrame(f), f);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 150 === 0) console.log(`frame ${f}/${N} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  if (errs.length) console.log('ERRORS:', [...new Set(errs)].slice(0, 10).join('\n'));
  await browser.close();
})();
