"""popcorn-story: original caper jazz bed + event-synced SFX + Piper narration; master to -14 LUFS."""
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



def clink(f=2600):
    t = t_(0.25); return (np.sin(2*np.pi*f*t)+0.6*np.sin(2*np.pi*f*1.48*t)+0.3*np.sin(2*np.pi*f*2.3*t))*np.exp(-t*22)
def coins(n, spread=0.25):
    out = np.zeros(int((spread+0.3)*SR))
    for k in range(n): add(out, clink(2200+rng.random()*1400), rng.random()*spread, 0.4+rng.random()*0.4)
    return out
def bounce_clinks():
    out = np.zeros(int(1.0*SR)); tt = 0; g = 1.0; gap = 0.16
    for k in range(6): add(out, clink(2400), tt, g); tt += gap; gap *= 0.7; g *= 0.65
    return out
def beep(f=1800, d=0.09):
    t = t_(d); return np.sign(np.sin(2*np.pi*f*t))*0.4*env(len(t), 0.003, 0.02)
def kaching():
    out = np.zeros(int(1.2*SR)); add(out, bandnoise(0.12, 300, 3000)*np.exp(-t_(0.12)*25), 0, 0.6)
    add(out, chime(2637, 1.0), 0.08, 0.8); add(out, chime(3520, 0.9), 0.12, 0.5); return out
def thunk():
    t = t_(0.5); return np.sin(2*np.pi*np.cumsum(180*np.exp(-t*6)+40)/SR)*np.exp(-t*8)
def suck(d=0.9):
    t = t_(d); return bandnoise(d, 400, 5000)*np.sin(np.pi*t/d)**2*np.linspace(0.6, 1, len(t))
def popping(d):
    out = np.zeros(int(d*SR))
    for k in range(int(d*14)):
        tt = rng.random()*d; add(out, bandnoise(0.025, 800, 6000)*np.exp(-t_(0.025)*120), tt, 0.4+rng.random()*0.6)
    return out
def sniff():
    out = np.zeros(int(0.8*SR))
    for k in range(2): s = bandnoise(0.22, 1200, 7000)*np.sin(np.pi*t_(0.22)/0.22); add(out, s, k*0.3, 0.6)
    return out
def zip_(d=0.45):
    t = t_(d); return bandnoise(d, 2000, 9000)*(0.5+0.5*np.sign(np.sin(2*np.pi*60*t)))*env(len(t), 0.01, 0.1)
def scratch():
    t = t_(0.35); return bandnoise(0.35, 300, 6000)*np.sin(2*np.pi*np.cumsum(8+30*np.sin(t*18))/SR)*env(len(t), 0.01, 0.08)
def rattle(d):
    out = np.zeros(int(d*SR))
    for k in range(int(d*90)): add(out, bandnoise(0.012, 2500, 10000)*np.exp(-t_(0.012)*300), rng.random()*d, 0.2+rng.random()*0.4)
    return out
def slide_down():
    t = t_(1.0); f = 300*np.exp(-t*0.9); s = np.sin(2*np.pi*np.cumsum(f)/SR)+0.4*np.sin(4*np.pi*np.cumsum(f)/SR)
    return s*env(len(t), 0.03, 0.3)*(0.8+0.2*np.sin(2*np.pi*6*t))
def swell(d=1.5):
    t = t_(d); return bandnoise(d, 3000, 12000)*(t/d)**2*env(len(t), 0.01, 0.05)
def ambience(d, lo, hi):
    return bandnoise(d, lo, hi)*env(int(d*SR), 0.3, 0.3)

fx = np.zeros(N); soft = np.zeros(N)
for s in tl['scenes'][1:]: add(soft, whoosh(0.32, 300, 4000), s['start']-0.18, 0.6)
ev = []
# street: dusk traffic + the single coin
ev += [(0, ambience(S['kasse'], 60, 600), 0.18), (wt('nichts','street')-0.05, bounce_clinks(), 0.9)]
# kasse
for k in range(5): ev.append((0.2+S['kasse']+k*0.36, step(), 0.45))
ev += [(wt('zwölf','kasse')-0.05, beep(), 0.5), (wt('zwölf','kasse')+0.08, beep(2200), 0.5), (wt('nimmt','kasse')+0.1, coins(6), 0.7),
       (wt('fliegt','kasse')-0.3, suck(1.4), 0.55), (wt('fliegt','kasse')-0.3, thunk(), 0.6), (wt('Hälfte','kasse'), coins(5, 0.6), 0.5)]
# studio
ev += [(S['studio'], coins(14, 1.1), 0.6), (S['studio']+0.1, thud(48), 0.7)]
# office
for w, n in [('Miete', 2), ('Kevin', 2), ('Strom', 1), ('Projektor', 1)]: ev.append((wt(w,'office')+0.35, coins(n, 0.18), 0.8))
ev += [(wt('Strom','office'), buzz(0.6), 0.25), (wt('nichts','office')-0.3, slide_down(), 0.55)]
# groschen: record scratch, music stops
ev += [(S['groschen']+0.02, scratch(), 0.8), (wt('Wovon','groschen'), pop(), 0.5)]
# entrance
ev += [(S['entrance'], popping(1.6), 0.6), (S['entrance']+0.6, ambience(6.5, 60, 500), 0.12), (wt('riecht','entrance')-0.1, sniff(), 0.7), (wt('direkt','entrance')-0.3, zip_(), 0.6)]
# counter
ev += [(wt('kleinen','counter'), pop(), 0.5), (wt('Euro','counter')-0.3, whoosh(0.5, 200, 2500), 0.8), (wt('Euro','counter'), pop(600, 1400, 0.1), 0.8), (wt('großen','counter'), thud(70), 0.6)]
# scale
ev += [(S['scale']+0.2, rattle(wt('Mais','scale')-S['scale']), 0.5), (wt('Cent','scale'), beep(2400, 0.06), 0.4)]
te = [w['s'] for w in tl['words'] if w['w']=='Euro' and w['s']>S['scale']][0]
ev += [(te-0.15, kaching(), 0.95), (wt('reiner','scale'), sparkle(), 0.8)]
# saal
ev += [(S['saal'], ambience(S['finale']-S['saal'], 300, 2500)*0.5, 0.12), (wt('Mais','saal'), crunch(), 0.5), (wt('zwanzig','saal')+0.3, chime(1760, 0.8), 0.6)]
# finale
tp = wt('Popcornverkäuferin','finale')
ev += [(tp-0.2, whoosh(0.4, 600, 6000), 0.8), (tp-0.1, sparkle(), 0.6), (wt('Mit','finale')-0.9, swell(1.0), 0.7), (wt('Mit','finale')+0.05, thud(55), 0.7), (wt('Fernseher','finale')+0.4, chime(1046, 1.8), 0.6)]
for t, sig, g in ev: add(fx, sig, t, g)

# ---------- original caper bed: 112 BPM swing, walking bass + brushed hats + muted stabs (C major ii-V-I-vi) ----------
bpm = 112; beat = 60 / bpm; bar = 4 * beat
NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)
prog = [(50, [62, 65, 69, 72]), (43, [59, 62, 65, 67]), (48, [60, 64, 67, 71]), (45, [57, 60, 64, 67])]
def pluck(f, d=0.35):
    t = t_(d); return (np.sin(2*np.pi*f*t)+0.5*np.sin(4*np.pi*f*t)*np.exp(-t*12))*np.exp(-t*9)
def stab(freqs, d=0.18):
    t = t_(d); s = sum(np.sin(2*np.pi*f*t)+0.3*np.sin(6*np.pi*f*t) for f in freqs); return s*np.exp(-t*14)/len(freqs)
music = np.zeros(N); sw = beat*0.16
for b in range(int(tl['total']/bar)+2):
    root, ch = prog[b % 4]; t0 = b*bar
    walk = [root, root+4, root+7, root+9] if b % 2 == 0 else [root+12, root+9, root+7, root+4]
    for k, n in enumerate(walk): add(music, pluck(NOTE(n-12)*1.0, 0.5), t0+k*beat, 0.9)
    for k in range(4):
        add(music, bandnoise(0.06, 6000, 12000)*np.exp(-t_(0.06)*50), t0+k*beat, 0.10)
        add(music, bandnoise(0.05, 6000, 12000)*np.exp(-t_(0.05)*70), t0+k*beat+beat/2+sw, 0.06)
    for k in [1, 3]: add(music, bandnoise(0.12, 800, 5000)*np.exp(-t_(0.12)*25), t0+k*beat, 0.10)
    add(music, stab([NOTE(n) for n in ch]), t0+beat*1.5+sw, 0.35); add(music, stab([NOTE(n) for n in ch]), t0+beat*3.5+sw, 0.25)
    if b % 2 == 1:
        mel = [ch[3]+12, ch[2]+12, ch[1]+12]
        for k, n in enumerate(mel): add(music, pluck(NOTE(n), 0.3), t0+beat*(2+k*0.5)+sw*(k % 2), 0.25)
gain = np.ones(N)
def ramp(a, b, g): gain[int(a*SR):int(b*SR)] = g
ramp(S['groschen'], S['groschen']+1.6, 0.0)           # the record-scratch stop
ramp(S['saal'], S['finale'], 0.55); ramp(wt('Mit','finale'), tl['total']+0.5, 1.25)
k = int(0.12*SR); c = np.cumsum(np.concatenate([np.full(k, gain[0]), gain])); gain = (c[k:]-c[:-k])/k
music *= gain; music[:int(0.05*SR)] *= np.linspace(0, 1, int(0.05*SR))
voice = np.zeros(N); add(voice, read_wav(f'{here}/audio/voice.wav'), 0)
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4]**2)+1e-12)
vr = rms(voice)
def at_db(x, db): return x/rms(x)*vr*10**(db/20)
mix = voice + at_db(music, -17) + at_db(fx, -10) + at_db(soft, -15)
mix /= np.abs(mix).max()*1.05
with wave.open(f'{here}/audio/mix_raw.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{here}/audio/mix_raw.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '2', f'{here}/audio/mix.wav'], check=True)
print('audio done')
