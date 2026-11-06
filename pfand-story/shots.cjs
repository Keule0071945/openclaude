// render the middle frame of every camera segment -> frames/s_XX.jpg and print the shot table
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:1080,height:1920}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8769/render3d.html');await p.waitForFunction(()=>window.ready===true,null,{timeout:60000});
const tl=JSON.parse(fs.readFileSync(__dirname+'/timeline.json'));await p.evaluate(tl=>window.init(tl),tl);
await p.evaluate(()=>renderFrame(0));const segs=await p.evaluate(()=>{const S=[];for(const g of window.__segs())S.push(g);return S;});
const only=(process.argv[2]||'').split(',').filter(Boolean).map(Number);
for(let i=0;i<segs.length;i++){if(only.length&&!only.includes(i))continue;const g=segs[i];const t=Math.min(g.end-0.12,(g.start+g.end)/2+0.1);const url=await p.evaluate(f=>renderFrame(f),Math.round(t*30));
  fs.writeFileSync(`${__dirname}/frames/s_${String(i).padStart(2,'0')}.jpg`,Buffer.from(url.split(',')[1],'base64'));console.log(i,g.scene,g.k,g.start.toFixed(2),'-',g.end.toFixed(2),'@',t.toFixed(2));}
if(errs.length)console.log('ERRS',errs.slice(0,5).join('\n'));await b.close();})();
