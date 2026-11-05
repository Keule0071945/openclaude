"""Narration + original lo-fi bed + event-synced SFX for the food Short; master to -14 LUFS."""
import json, wave, subprocess, numpy as np

SR = 48000
here = __file__.rsplit('/', 1)[0]
tl = json.load(open(f'{here}/timeline.json'))
L = json.load(open(f'{here}/script.json'))
N = int((tl['total'] + 0.5) * SR)
rng = np.random.default_rng(11)
S = {s['name']: s['start'] for s in tl['scenes']}


def wt(word, scene):
    st = S[scene]
    for w in tl['words']:
        if w['w'].strip('.,?:!…') == word and w['s'] >= st - 0.01: return w['s']
    raise KeyError(word)


def read_wav(p):
    raw = subprocess.check_output(['ffmpeg', '-loglevel', 'error', '-i', p, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'])
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def add(buf, sig, t, g=1.0):
    i = int(t * SR)
    if i < 0 or i >= len(buf): return
    sig = sig[:len(buf) - i]; buf[i:i + len(sig)] += sig * g


def t_(d): return np.arange(int(d * SR)) / SR


def env(n, a=0.01, r=None):
    e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    if r: nr = min(n, int(r * SR)); e[-nr:] *= np.linspace(1, 0, nr)
    return e


def bandnoise(d, lo, hi):
    n = int(d * SR); x = rng.standard_normal(n); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    X[(f < lo) | (f > hi)] = 0; y = np.fft.irfft(X, n); return y / (np.abs(y).max() + 1e-9)


def thud(f0=60):
    t = t_(0.4); s = np.sin(2 * np.pi * np.cumsum(f0 + 50 * np.exp(-t * 20)) / SR) * np.exp(-t * 10)
    s += bandnoise(0.4, 200, 2500) * np.exp(-t * 45) * 0.4; return s / np.abs(s).max()
def pop(f0=500, f1=1100, d=0.08):
    t = t_(d); return np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f1, len(t))) / SR) * np.exp(-t * 35)
def whoosh(d=0.4, lo=300, hi=4000):
    t = t_(d); return bandnoise(d, lo, hi) * np.sin(np.pi * t / d) ** 2
def chime(f=1320, d=0.9):
    t = t_(d); return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4)) * np.exp(-t * 4.5)
def step():
    t = t_(0.12); return bandnoise(0.12, 80, 900) * np.exp(-t * 40)
def click():
    t = t_(0.05); return bandnoise(0.05, 1500, 8000) * np.exp(-t * 120)
def crunch():
    out = np.zeros(int(0.35 * SR))
    for k in range(9): add(out, bandnoise(0.03, 1500, 9000) * np.exp(-t_(0.03) * 90), rng.random() * 0.3, 0.6 + rng.random() * 0.4)
    return out
def hum(d, f=55):
    t = t_(d); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t)) * env(len(t), 0.3, 0.3)
def buzz(d):
    t = t_(d); s = np.sign(np.sin(2 * np.pi * 120 * t)) * 0.3 + np.sin(2 * np.pi * 240 * t) * 0.3; return s * env(len(t), 0.02, 0.2)
def sparkle():
    out = np.zeros(int(1.0 * SR))
    for k in range(10): add(out, chime(2000 + rng.random() * 2500, 0.4), rng.random() * 0.6, 0.25)
    return out
def musicbox(notes, start, dt=0.22):
    return [(start + i * dt, chime(440 * 2 ** ((n - 69) / 12), 1.2), 0.5) for i, n in enumerate(notes)]


fx = np.zeros(N); soft = np.zeros(N)
for s in tl['scenes'][1:]: add(soft, whoosh(0.45, 200, 3000), s['start'] - 0.25, 0.7)
ev = []
# kitchen
for k in range(5): ev.append((0.15 + k * 0.38, step(), 0.55))
tdoor = wt('Kühlschrank', 'kitchen') - 0.05
ev += [(tdoor, click(), 0.8), (tdoor + 0.05, hum(4.3 - tdoor + 0.4), 0.18)]
# brain
tdop = wt('Dopamin', 'brain'); tsl = wt('nochmal', 'brain') + 0.05
ev += [(S['brain'] + tdop - S['brain'] + 0.0, buzz(0.5), 0.25), (tdop + 0.3, sparkle(), 0.9), (tsl, thud(70), 1.0), (tsl, sparkle(), 0.8)]
# savanna signs + eating
for w in ['Selten', 'seltener', 'nie']: ev.append((wt(w, 'savanna') - 0.05, pop(), 0.7))
ta = wt('Also', 'savanna')
for d in [0.9, 1.5, 2.1, 2.7, 3.3]: ev.append((ta + d + 0.25, crunch(), 0.55))
# market
for w in ['Chips', 'Donuts', 'Pizza']: ev.append((wt(w, 'market') - 0.05, pop(600, 1300, 0.1), 0.8))
ev += [(wt('Fett', 'market') + 0.2, whoosh(0.5, 600, 6000), 0.6), (wt('Fett', 'market') + 0.8, chime(1568), 0.6), (wt('anspringt', 'market'), chime(2093), 0.6)]
# lab
ev += [(S['lab'] + 0.3, click(), 0.5), (wt('Bliss', 'lab'), sparkle(), 0.9)]
# sofa: crunches while the feeling drains
for d in [0.3, 1.0, 1.7, 2.4, 3.0, 3.5, 4.0, 4.4, 4.8, 5.2]: ev.append((S['sofa'] + d + 0.25, crunch(), 0.45))
# freeze
ev += [(S['freeze'] + 0.05, whoosh(0.35, 2000, 8000)[::-1], 0.7), (S['freeze'] + 0.1, thud(45), 0.8)]
# nursery: music box + warm swell
ev += musicbox([76, 79, 84, 83, 79, 76, 72], wt('perfekt', 'nursery') - 0.2)
ev += [(wt('Muttermilch', 'nursery'), chime(1046, 1.6), 0.6)]
# ending
ev += [(S['ending'] + 0.65, crunch(), 0.6), (wt('Schluck', 'ending') + 0.3, chime(1318, 1.4), 0.5)]
for t, sig, g in ev: add(fx, sig, t, g)

# ---------- original lo-fi bed (88 BPM, Am-F-C-G) ----------
bpm = 88; beat = 60 / bpm; bar = 4 * beat
NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)
prog = [(45, [57, 60, 64, 67]), (41, [57, 60, 65, 69]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 67])]
def epiano(freqs, d):
    t = t_(d); s = np.zeros(len(t))
    for f in freqs: s += (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3)) * np.exp(-t * 0.9)
    return s * env(len(t), 0.02, 0.4) * (0.9 + 0.1 * np.sin(2 * np.pi * 4.5 * t)) / len(freqs)
music = np.zeros(N)
for b in range(int(tl['total'] / bar) + 2):
    root, ch = prog[b % 4]; t0 = b * bar
    add(music, epiano([NOTE(n) for n in ch], bar * 0.98), t0, 0.5)
    add(music, np.sin(2 * np.pi * NOTE(root - 12) * t_(bar * 0.9)) * env(int(bar * 0.9 * SR), 0.02, 0.3), t0, 0.35)
    for k in range(4):
        if k % 2 == 0: add(music, np.sin(2 * np.pi * np.cumsum(50 + 60 * np.exp(-t_(0.3) * 30)) / SR) * np.exp(-t_(0.3) * 12), t0 + k * beat, 0.5)
        else: add(music, bandnoise(0.12, 1500, 7000) * np.exp(-t_(0.12) * 30), t0 + k * beat, 0.12)
        add(music, bandnoise(0.04, 6000, 12000) * np.exp(-t_(0.04) * 80), t0 + (k + 0.5) * beat, 0.05)
gain = np.ones(N)
def ramp(a, b, g): gain[int(a * SR):int(b * SR)] = g
ramp(S['freeze'], S['nursery'], 0.25); ramp(S['nursery'], S['ending'], 0.8)
k = int(0.35 * SR); c = np.cumsum(np.concatenate([np.full(k, gain[0]), gain])); gain = (c[k:] - c[:-k]) / k
music *= gain
music[:int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))

voice = np.zeros(N)
for i, l in enumerate(L): add(voice, read_wav(f'{here}/audio/l{i:02d}.wav'), l['start'])
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
vr = rms(voice)
def at_db(x, db): return x / rms(x) * vr * 10 ** (db / 20)
mix = voice + at_db(music, -18) + at_db(fx, -11) + at_db(soft, -16)
mix /= np.abs(mix).max() * 1.05
with wave.open(f'{here}/audio/mix_raw.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{here}/audio/mix_raw.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '2', f'{here}/audio/mix.wav'], check=True)
print('audio done')
