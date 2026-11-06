"""koch-short: cosy lo-fi bed + kitchen ASMR, no voice; master to -15 LUFS."""
import json, wave, subprocess, numpy as np

SR = 48000
here = __file__.rsplit('/', 1)[0]
tl = json.load(open(f'{here}/timeline.json'))
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



fx = np.zeros(N)
S = {s['name']: s['start'] for s in tl['scenes']}
def lp_noise(d, lo, hi, mod=0):
    x = bandnoise(d, lo, hi); t = t_(d)
    if mod: x *= 0.6 + 0.4*np.sin(2*np.pi*mod*t + rng.random()*6)
    return x*env(len(x), 0.08, 0.15)
def pour(d, lo=150, hi=1400, glug=7): return lp_noise(d, lo, hi, glug)
def sizzle(d, k=1.0):
    out = bandnoise(d, 2500, 11000)*0.25*k; n = int(d*60*k)
    for i in range(n): add(out, bandnoise(0.01, 3000, 12000)*np.exp(-t_(0.01)*400), rng.random()*d, 0.3+rng.random()*0.7)
    return out*env(len(out), 0.3, 0.3)
def tap(): t = t_(0.06); return bandnoise(0.06, 800, 5000)*np.exp(-t*90)
def plop(f=180): t = t_(0.2); return np.sin(2*np.pi*np.cumsum(f+300*np.exp(-t*40))/SR)*np.exp(-t*22)
def crackk():
    out = np.zeros(int(0.25*SR))
    for k in range(6): add(out, bandnoise(0.015, 1500, 9000)*np.exp(-t_(0.015)*200), rng.random()*0.12, 0.5+rng.random()*0.5)
    return out
def swish(): t = t_(0.18); return bandnoise(0.18, 800, 6000)*np.sin(np.pi*t/0.18)**2
def tick(): t = t_(0.02); return bandnoise(0.02, 3000, 9000)*np.exp(-t*250)
def ding(): t = t_(1.6); return (np.sin(2*np.pi*1760*t)+0.4*np.sin(2*np.pi*3520*t)*np.exp(-t*3))*np.exp(-t*2.5)
def soft_thud(): t = t_(0.15); return np.sin(2*np.pi*np.cumsum(120+80*np.exp(-t*30))/SR)*np.exp(-t*25)
def plink(f): t = t_(0.15); return np.sin(2*np.pi*f*t)*np.exp(-t*30)
def scrape(d=0.35): return lp_noise(d, 1200, 5000, 25)
ev = []
ev += [(0, lp_noise(5.0, 2000, 6000, 0.3)*0.15, 0.4)]
for k in range(4): ev.append((0.2+k*1.2, plink(2600+k*300), 0.12))
t0 = S['trocken']; ev += [(t0+0.35, lp_noise(1.8, 400, 4000, 3), 0.6), (t0+2.9, tap(), 0.5), (t0+3.1, lp_noise(0.4, 2000, 8000), 0.3), (t0+4.4, tap(), 0.5), (t0+4.6, lp_noise(0.4, 2000, 8000), 0.3), (t0+5.7, lp_noise(0.6, 4000, 10000, 12), 0.35)]
t0 = S['nass']
for e in [0.3, 1.6]: ev += [(t0+e+0.05, tap(), 0.7), (t0+e+0.2, tap(), 0.6), (t0+e+0.42, crackk(), 0.8), (t0+e+0.95, plop(220), 0.6)]
ev += [(t0+3.0, pour(2.0), 0.7), (t0+5.4, pour(1.2, 200, 1800, 9), 0.5)]
t0 = S['ruehren']
for k in range(16): ev.append((t0+0.1+k*0.33, swish(), 0.45)); ev.append((t0+0.25+k*0.33, tap(), 0.12))
t0 = S['ruhen']
for k in range(7): ev.append((t0+0.2+k*0.5, tick(), 0.5))
ev += [(t0+3.6, ding(), 0.35)]
t0 = S['pfanne']; ev += [(t0+0.2, sizzle(S['stapel']-t0-0.2, 0.7), 0.35), (t0+0.3, sizzle(2.0, 1.4), 0.3), (t0+3.0, pour(1.3, 150, 900, 5), 0.5), (t0+3.3, sizzle(2.5, 1.5), 0.35)]
t0 = S['blasen']
for k in range(10): ev.append((t0+0.6+k*0.45, plink(900+rng.random()*600), 0.1))
t0 = S['wenden']; ev += [(t0+0.4, scrape(0.45), 0.5), (t0+1.0, swish(), 0.6), (t0+1.65, soft_thud(), 0.7), (t0+1.65, sizzle(2.0, 1.8), 0.45)]
t0 = S['stapel']
for i in range(5): ev.append((t0+0.2+i*0.45+0.33, soft_thud(), 0.55))
for i in range(16): ev.append((t0+2.6+rng.random()*0.6+0.35, plink(1400+rng.random()*900), 0.18))
ev += [(t0+3.9, soft_thud(), 0.3), (t0+4.3, pour(1.6, 100, 700, 3), 0.5), (t0+6.3, lp_noise(1.5, 3000, 9000, 6), 0.25)]
t0 = S['final']; ev += [(t0, lp_noise(5.0, 2000, 6000, 0.3)*0.15, 0.4), (57.4, ding(), 0.3)]
for t, sig, g in ev: add(fx, sig, t, g)

# ---------- original cosy lo-fi bed: 78 BPM, soft e-piano 7ths, brushed beat, vinyl crackle ----------
bpm = 78; beat = 60/bpm; bar = 4*beat
NOTE = lambda n: 440*2**((n-69)/12)
prog = [(41, [57, 60, 64, 69]), (40, [55, 59, 62, 67]), (38, [53, 57, 60, 65]), (36, [55, 59, 64, 67])]
def ep(freqs, d):
    t = t_(d); s = sum((np.sin(2*np.pi*f*t)+0.25*np.sin(4*np.pi*f*t)*np.exp(-t*3))*np.exp(-t*0.8) for f in freqs)
    return s*env(len(t), 0.02, 0.5)*(0.9+0.1*np.sin(2*np.pi*5*t))/len(freqs)
music = np.zeros(N)
for b in range(int(tl['total']/bar)+2):
    root, ch = prog[b % 4]; t0 = b*bar
    add(music, ep([NOTE(n) for n in ch], bar*0.98), t0, 0.55)
    add(music, np.sin(2*np.pi*NOTE(root-12)*t_(bar*0.9))*env(int(bar*0.9*SR), 0.03, 0.4), t0, 0.3)
    for k in range(4):
        if k in (0, 2): add(music, np.sin(2*np.pi*np.cumsum(55+45*np.exp(-t_(0.25)*28))/SR)*np.exp(-t_(0.25)*14), t0+k*beat+(0.04 if k == 2 else 0), 0.45)
        else: add(music, bandnoise(0.16, 1200, 6000)*np.exp(-t_(0.16)*22), t0+k*beat, 0.12)
        add(music, bandnoise(0.05, 6000, 12000)*np.exp(-t_(0.05)*60), t0+(k+0.5)*beat+0.03, 0.04)
    if b % 2 == 1:
        for k, n in enumerate([ch[3]+12, ch[2]+12, ch[1]+12, ch[2]+12]): add(music, ep([NOTE(n)], beat*0.9), t0+beat*k*0.5+beat*2, 0.22)
crack = np.zeros(N)
for i in range(int(tl['total']*9)): add(crack, bandnoise(0.004, 2000, 9000)*np.exp(-t_(0.004)*800), rng.random()*tl['total'], 0.1+rng.random()*0.3)
music += crack*0.5 + bandnoise(tl['total']+0.5, 200, 3000)[:N]*0.01
music[:int(0.4*SR)] *= np.linspace(0, 1, int(0.4*SR)); music[-int(1.5*SR):] *= np.linspace(1, 0, int(1.5*SR))
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4]**2)+1e-12)
mix = music/rms(music)*0.1 + fx/rms(fx)*0.1*10**(-3/20)
mix /= np.abs(mix).max()*1.05
with wave.open(f'{here}/audio/mix_raw.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{here}/audio/mix_raw.wav', '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '2', f'{here}/audio/mix.wav'], check=True)
print('audio done')
