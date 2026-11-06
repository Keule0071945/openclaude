// QA: sample every 3rd frame; report where the spring arm had to pull the camera in front of a wall
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('http://127.0.0.1:8769/render3d.html');await p.waitForFunction(()=>window.ready===true,null,{timeout:60000});
const tl=JSON.parse(fs.readFileSync(__dirname+'/timeline.json'));await p.evaluate(tl=>window.init(tl),tl);await p.evaluate(()=>renderFrame(0));
const N=Math.ceil(tl.total*30);const res=await p.evaluate(N=>{const out={};for(let f=0;f<N;f+=3){const r=window.__camcheck(f);const k=r.scene+'#'+r.k;out[k]=out[k]||{n:0,hit:0,min:99};out[k].n++;if(r.hit){out[k].hit++;out[k].min=Math.min(out[k].min,r.safe/r.dist);}}return out;},N);
for(const [k,v] of Object.entries(res))if(v.hit)console.log(k.padEnd(14),`pulled in ${v.hit}/${v.n} samples, down to ${(v.min*100).toFixed(0)}% of planned distance`);
console.log('checked',Object.keys(res).length,'shots');await b.close();})();
