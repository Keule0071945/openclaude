"""Placeholder narration (Pico) per paragraph -> timeline.json with word times, scenes and a 30 fps loudness envelope.
When the real recording arrives, align.py replaces the word times; the envelope is recomputed from that file."""
import json,subprocess,re,numpy as np,sys
L=json.load(open('script.json'));SR=48000
def syl(w): return max(1,len(re.findall(r'[aeiouäöüy]+',w.lower())))
say=lambda t:t.replace('Popcorn','Popkorn')
t=0.35;words=[];prev=None;voice=[]
for i,l in enumerate(L):
    raw=f'audio/raw{i:02d}.wav';out=f'audio/l{i:02d}.wav'
    subprocess.run(['pico2wave','-l','de-DE','-w',raw,say(l['text'])],check=True)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',raw,'-af','silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,asetrate=16000*0.94,aresample=48000,atempo=1.25','-ac','1','-ar','48000',out],check=True)
    d=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',out]))
    if prev is not None: t+=0.45 if l['scene']!=prev else 0.3
    l['start']=round(t,3);l['dur']=round(d,3)
    ws=l['text'].split();S=[syl(w) for w in ws];tt=t
    for w,s in zip(ws,S): dd=d*s/sum(S);words.append({'w':w,'s':round(tt,3),'e':round(tt+dd,3)});tt+=dd
    t+=d;prev=l['scene']
total=round(t+1.2,2)
scenes=[]
for l in L:
    if not scenes or scenes[-1]['name']!=l['scene']: scenes.append({'name':l['scene'],'start':0 if not scenes else round(l['start']-0.2,3)})
for i,s in enumerate(scenes): s['end']=scenes[i+1]['start'] if i+1<len(scenes) else total
# voice track + envelope
N=int(total*SR);v=np.zeros(N,np.float32)
for i,l in enumerate(L):
    raw=subprocess.check_output(['ffmpeg','-loglevel','error','-i',f'audio/l{i:02d}.wav','-f','s16le','-ac','1','-ar',str(SR),'-'])
    a=np.frombuffer(raw,np.int16).astype(np.float32)/32768;j=int(l['start']*SR);v[j:j+len(a)]+=a[:N-j]
import wave
with wave.open('audio/voice.wav','wb') as w: w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(v,-1,1)*32767).astype(np.int16).tobytes())
hop=SR//30;env=[float(np.sqrt(np.mean(v[k*hop:(k+1)*hop]**2))) for k in range(int(total*30))];m=max(env) or 1
env=[round(min(1,(e/m)*1.6),3) for e in env]
json.dump(L,open('script.json','w'),ensure_ascii=False,indent=1)
json.dump({'total':total,'words':words,'scenes':scenes,'env':env},open('timeline.json','w'),ensure_ascii=False)
for s in scenes:
    ws=[w for w in words if s['start']<=w['s']<s['end']]
    print(f"{s['name']:8s}{s['start']:6.2f}-{s['end']:6.2f} "+' '.join(f"{w['w']}@{w['s']-s['start']:.1f}" for w in ws))
print('total',total)
