"""Build narration + original music + synced SFX for the beer Short, then master to -14 LUFS."""
import json, wave, subprocess, numpy as np

SR = 48000
here = __file__.rsplit('/', 1)[0]
tl = json.load(open(f'{here}/timeline.json'))
N = int((tl['total'] + 0.5) * SR)
rng = np.random.default_rng(7)

def read_wav(p):
    raw = subprocess.check_output(['ffmpeg', '-loglevel', 'error', '-i', p, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'])
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768

def add(buf, sig, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf): return
    sig = sig[: len(buf) - i]
    buf[i:i + len(sig)] += sig * gain

def env(n, a=0.005, r=None):
    e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    if r: nr = min(n, int(r * SR)); e[-nr:] *= np.linspace(1, 0, nr)
    return e

def bandnoise(dur, lo, hi):
    n = int(dur * SR); x = rng.standard_normal(n); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    X[(f < lo) | (f > hi)] = 0; y = np.fft.irfft(X, n); return y / (np.abs(y).max() + 1e-9)

def t_(d): return np.arange(int(d * SR)) / SR

# ---------- SFX ----------
def thud():
    t = t_(0.45); f = 55 + 60 * np.exp(-t * 18)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    s += bandnoise(0.45, 200, 3000) * np.exp(-t * 40) * 0.5
    return s / np.abs(s).max()
def pop(f0=500, f1=1100, d=0.08):
    t = t_(d); f = np.linspace(f0, f1, len(t)); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35); return s
def whoosh(d=0.4, lo=300, hi=4000):
    n = bandnoise(d, lo, hi); t = t_(d); e = np.sin(np.pi * t / d) ** 2; return n * e
def clink():
    t = t_(0.9); s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) * a for f, k, a in [(2350, 6, 1), (3120, 8, .6), (4710, 11, .4), (1760, 5, .5)])
    s2 = np.roll(s, int(0.035 * SR)) * 0.8; return (s + s2) / 3
def chime(f=1320):
    t = t_(0.7); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t * 6)
def splash():
    t = t_(0.5); s = bandnoise(0.5, 400, 6000) * np.exp(-t * 9); p = pop(300, 120, 0.15); s[:len(p)] += p; return s
def bubble():
    out = np.zeros(int(1.0 * SR))
    for k in range(14):
        b = pop(250 + rng.random() * 500, 700 + rng.random() * 800, 0.05); add(out, b, rng.random() * 0.9, 0.5)
    return out
def tick():
    t = t_(0.03); return bandnoise(0.03, 2000, 7000) * np.exp(-t * 200)
def dig():
    t = t_(0.25); return bandnoise(0.25, 80, 1500) * np.exp(-t * 18)
def pour(d=2.0):
    t = t_(d); return bandnoise(d, 500, 5000) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t) ** 2) * env(len(t), 0.1, 0.3)

S = {s['name']: s['start'] for s in tl['scenes']}
def wt(word, after=-1):
    for w in tl['words']:
        if w['w'].replace('.','').replace(',','').replace('?','').replace(':','').replace('!','').replace('…','').strip()==word and w['s']>after: return w['s']
    raise KeyError(word)
sfx = np.zeros(N); sfx_soft = np.zeros(N)
for s in tl['scenes'][1:]: add(sfx_soft, whoosh(0.38), s['start'] - 0.22, 0.9)
ev = [
    (wt('1516') + 0.55, thud(), 1.0), (wt('Weizen') + 0.05, thud(), 0.9), (wt('Weizen') + 0.17, pop(700, 1300), 0.5),
    (wt('Alltag'), clink(), 1.0),
    (wt('tabu'), thud(), 0.7), (wt('Trinken'), whoosh(0.3, 800, 6000), 0.6), (wt('Flüssiges'), pop(600, 1400, 0.1), 0.8),
    (wt('Kräuter') + 0.3, splash(), 0.8), (wt('Rinde') + 0.3, splash(), 0.8), (wt('Bilsenkraut') + 0.45, splash(), 1.0),
    (wt('Gerste'), chime(1047), .8), (wt('Hopfen'), chime(1319), .8), (wt('Wasser'), chime(1568), .8),
    (S['yeastA'] + 0.15, pop(400, 900), .8), (wt('Hefe') + 0.3, whoosh(0.45, 300, 3000), 1.0), (wt('niemand'), thud(), .9),
    (wt('verboten') - 0.05, thud(), .9), (wt('heiß') + 0.4, chime(2093), .5),
    (wt('Schatten') + 0.1, pop(500, 1000), .7),
    (wt('Biergarten'), clink(), 1.0),
    (wt('Brauereien') + 0.6, chime(1568), .8),
    (wt('Bäcker'), whoosh(0.4, 200, 2000), .6),
    (wt('Brotgesetz') - 0.45, whoosh(0.25, 1500, 7000), .6), (wt('Brotgesetz'), thud(), 1.0),
]
for t, sig, g in ev: add(sfx, sig, t, g)
add(sfx_soft, pop(), wt('Kloster') - 0.1, 0.9)
for i in range(12): add(sfx_soft, pop(700 + i * 20, 1300), wt('Dorf') - 0.1 + i * 0.04, 0.35)
for i in range(24): add(sfx_soft, pop(900 + i * 15, 1600, 0.05), wt('Stadt') - 0.1 + i * 0.03, 0.25)
for k in range(4): add(sfx_soft, bubble(), S['cauldron'] + k * 1.0, 0.35)
for k in [0.2, 0.7, 1.2, 1.7, 2.2]: add(sfx_soft, dig(), S['cellar'] + k, 0.9)
for i in range(3): add(sfx_soft, pop(300, 700, 0.12), wt('Kastanien') + i * 0.2, 0.6)
add(sfx_soft, pour(1.8), wt('schenkten') - 0.2, 0.35)
r0 = wt('rund') - 0.3; r1 = wt('Brauereien') + 0.5
for k in range(int((r1 - r0) / 0.05)): add(sfx_soft, tick(), r0 + k * 0.05, 0.4)
for k in range(10): add(sfx_soft, pop(500, 900, 0.05), S['counter'] + 0.25 + k * 0.2, 0.2)

# ---------- original oompah-polka bed (116 BPM, F major) ----------
bpm = 116; beat = 60 / bpm
def tone(f, d, harm, decay):
    t = t_(d); s = sum(a * np.sin(2 * np.pi * f * h * t) for h, a in harm); return s * np.exp(-t * decay) * env(len(t), 0.01, 0.04)
def accordion(freqs, d):
    t = t_(d); s = np.zeros(len(t))
    for f in freqs:
        for det in (0.997, 1.003):
            ph = 2 * np.pi * f * det * t; s += sum(np.sin(ph * h) / h for h in range(1, 7))
    return s * (0.85 + 0.15 * np.sin(2 * np.pi * 6 * t)) * env(len(t), 0.015, 0.06) / len(freqs)
NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)
prog = [('F', 41, [65, 69, 72]), ('C', 36, [64, 67, 72]), ('C', 36, [64, 67, 70]), ('F', 41, [65, 69, 72]),
        ('Bb', 46, [65, 70, 74]), ('F', 41, [65, 69, 72]), ('C', 36, [64, 67, 70]), ('F', 41, [65, 69, 72])]
melody = [72, 74, 76, 77, 79, 77, 76, 74, 72, 76, 79, 76, 74, 72, 70, 72]
music = np.zeros(N); bar = 4 * beat; nb = int(tl['total'] / bar) + 2
for b in range(nb):
    name, root, chord = prog[b % len(prog)]; t0 = b * bar
    add(music, tone(NOTE(root - 12), beat * 0.9, [(1, 1), (2, .5), (3, .25)], 4), t0, 0.9)
    add(music, tone(NOTE(root - 12 + 7), beat * 0.9, [(1, 1), (2, .5), (3, .25)], 4), t0 + 2 * beat, 0.8)
    for k in (1, 3): add(music, accordion([NOTE(n) for n in chord], beat * 0.45), t0 + k * beat, 0.32)
    for k in (0.5, 1.5, 2.5, 3.5): add(music, bandnoise(0.05, 5000, 12000) * np.exp(-t_(0.05) * 60), t0 + k * beat, 0.05)
    if b % 4 in (1, 3):
        for k in range(4): add(music, tone(NOTE(melody[(b * 4 + k) % 16]), beat * 0.6, [(1, 1), (3, .2)], 5), t0 + k * beat, 0.18)
# mood: music dips (filtered quieter) in cauldron + yeast, swells at garden
gain = np.ones(N)
def ramp(t0, t1, g):
    i0, i1 = int(t0 * SR), int(t1 * SR); gain[i0:i1] = g
ramp(S['cauldron'], S['decree'], 0.55); ramp(S['yeastA'], S['summer'], 0.5); ramp(S['garden'], S['counter'], 1.25)
k = int(0.3 * SR); c = np.cumsum(np.concatenate([np.full(k, gain[0]), gain])); gain = (c[k:] - c[:-k]) / k
music *= gain

# ---------- voice ----------
voice = np.zeros(N)
add(voice, read_wav(f"{here}/voice_trim.wav"), 0.0)

def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
v_r = rms(voice)
def at_db(x, db): return x / rms(x) * v_r * 10 ** (db / 20)
mix = voice + at_db(music, -18) + at_db(sfx, -10) + at_db(sfx_soft, -15)
fade = int(0.4 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
mix /= np.abs(mix).max() * 1.05
pcm = (mix * 32767).astype(np.int16)
with wave.open(f'{here}/audio/mix_raw.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{here}/audio/mix_raw.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '2', f'{here}/audio/mix.wav'], check=True)
print('audio done', len(mix) / SR, 's')
