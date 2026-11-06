"""Narration with a free local deep German voice (Piper 'thorsten' high), pitched down ~8 % and warmed with EQ +
light compression, then exact word times from Whisper (word_timestamps) aligned onto the script words.
Writes audio/voice.wav and timeline.json {total, words, scenes, env}. Run with the venv python that has piper + faster-whisper."""
import json, subprocess, re, sys, os, numpy as np, difflib
VENV = sys.argv[1] if len(sys.argv) > 1 else 'python3'
PIPER = os.path.join(os.path.dirname(VENV), 'piper'); MODEL = sys.argv[2]
SR = 48000; L = json.load(open('script.json'))
def sh(*a): subprocess.run(a, check=True)
parts = []
for i, l in enumerate(L):
    raw = f'audio/p{i:02d}.wav'; out = f'audio/v{i:02d}.wav'
    txt = l['text'].replace('Popcorn', 'Popkorn').replace("gibt's", 'gibts').replace('Gruen', 'Grün')
    subprocess.run([PIPER, '-m', MODEL, '-f', raw, '--length-scale', '0.8', '--sentence-silence', '0.14'], input=txt.encode(), check=True, capture_output=True)
    # deeper: resample-pitch 0.92 with tempo compensation, low-mid warmth, de-harsh, gentle compression
    sh('ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af',
       'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
       'asetrate=22050*0.92,aresample=48000,atempo=1.04,'
       'equalizer=f=140:t=q:w=1:g=4,equalizer=f=3500:t=q:w=1.5:g=-2,highpass=f=60,'
       'acompressor=threshold=-18dB:ratio=3:attack=8:release=120:makeup=2', '-ac', '1', '-ar', str(SR), out)
    a = np.frombuffer(subprocess.check_output(['ffmpeg', '-loglevel', 'error', '-i', out, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-']), np.int16).astype(np.float32) / 32768
    parts.append(a)
t = 0.3; starts = []
for i, a in enumerate(parts):
    if i: t += 0.24
    starts.append(t); t += len(a) / SR
total = round(t + 1.0, 2); N = int(total * SR); v = np.zeros(N, np.float32)
for st, a in zip(starts, parts): j = int(st * SR); v[j:j + len(a)] += a
v *= 0.89 / max(1e-6, np.abs(v).max())
import wave
with wave.open('audio/voice.wav', 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((v * 32767).astype(np.int16).tobytes())
# word times: whisper on the finished track, aligned to the script words by text similarity
from faster_whisper import WhisperModel
m = WhisperModel('small', device='cpu', compute_type='int8')
a16 = np.frombuffer(subprocess.check_output(['ffmpeg', '-loglevel', 'error', '-i', 'audio/voice.wav', '-f', 's16le', '-ac', '1', '-ar', '16000', '-']), np.int16).astype(np.float32) / 32768
segs, _ = m.transcribe(a16, language='de', word_timestamps=True, initial_prompt=' '.join(l['text'] for l in L))
hw = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
norm = lambda x: re.sub(r'[^a-zäöüß0-9]', '', x.lower().replace('popkorn', 'popcorn'))
sw = [(w, li) for li, l in enumerate(L) for w in l['text'].split()]
sm = difflib.SequenceMatcher(a=[norm(w) for w, _ in sw], b=[norm(w) for w, _, _ in hw], autojunk=False)
tim = [None] * len(sw)
for blk in sm.get_matching_blocks():
    for k in range(blk.size): tim[blk.a + k] = hw[blk.b + k][1:]
# fill gaps: interpolate inside each line between known neighbours / line bounds
for li, l in enumerate(L):
    idx = [k for k, (_, lj) in enumerate(sw) if lj == li]; a0 = starts[li]; a1 = starts[li] + len(parts[li]) / SR
    known = [(k, tim[k]) for k in idx if tim[k]]
    for k in idx:
        if tim[k]: continue
        prv = max([kk for kk, _ in known if kk < k], default=None); nxt = min([kk for kk, _ in known if kk > k], default=None)
        s0 = tim[prv][1] if prv is not None else a0; s1 = tim[nxt][0] if nxt is not None else a1
        cnt = (nxt if nxt is not None else idx[-1] + 1) - (prv if prv is not None else idx[0] - 1) - 1
        pos = k - (prv if prv is not None else idx[0] - 1)
        d = (s1 - s0) / max(1, cnt); tim[k] = (s0 + d * (pos - 1), s0 + d * pos)
# keep every word inside its own line and strictly ordered (whisper can smear across pauses)
for li, l in enumerate(L):
    idx = [k for k, (_, lj) in enumerate(sw) if lj == li]; a0 = starts[li]; a1 = starts[li] + len(parts[li]) / SR
    for n, k in enumerate(idx):
        s0 = min(max(tim[k][0], a0), a1 - 0.1 * (len(idx) - n))
        if n: s0 = max(s0, tim[idx[n - 1]][0] + 0.1)
        tim[k] = (s0, max(s0 + 0.08, min(tim[k][1], a1)))
words = [{'w': w, 's': round(tim[k][0], 3), 'e': round(tim[k][1], 3)} for k, (w, _) in enumerate(sw)]
print('aligned', sum(1 for b in sm.get_matching_blocks() for _ in range(b.size)), 'of', len(sw))
scenes = []
for li, l in enumerate(L):
    if not scenes or scenes[-1]['name'] != l['scene']: scenes.append({'name': l['scene'], 'start': 0 if not scenes else round(starts[li] - 0.18, 3)})
for i, s in enumerate(scenes): s['end'] = scenes[i + 1]['start'] if i + 1 < len(scenes) else total
hop = SR // 30; env = [float(np.sqrt(np.mean(v[k * hop:(k + 1) * hop] ** 2))) for k in range(int(total * 30))]; mx = max(env) or 1
env = [round(min(1, (e / mx) * 1.6), 3) for e in env]
json.dump({'total': total, 'words': words, 'scenes': scenes, 'env': env}, open('timeline.json', 'w'), ensure_ascii=False)
for s in scenes:
    ws = [w for w in words if s['start'] <= w['s'] < s['end']]
    print(f"{s['name']:9s}{s['start']:6.2f}-{s['end']:6.2f} " + ' '.join(f"{w['w']}@{w['s'] - s['start']:.2f}" for w in ws))
print('total', total)
