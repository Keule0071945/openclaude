"""gruen-story: original lounge-muzak bed + event-synced SFX + Piper narration; master to -14 LUFS."""
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
def plastic():
    out = np.zeros(int(0.4*SR))
    for k in range(5): add(out, bandnoise(0.03, 1200, 6000)*np.exp(-t_(0.03)*90), rng.random()*0.25, 0.5+rng.random()*0.5)
    return out
def crunch_big():
    out = np.zeros(int(0.7*SR)); add(out, thud(50), 0, 1.0)
    for k in range(16): add(out, bandnoise(0.04, 800, 7000)*np.exp(-t_(0.04)*60), rng.random()*0.35, 0.5+rng.random()*0.5)
    return out
def hiss(d=0.6): t = t_(d); return bandnoise(d, 2000, 9000)*env(len(t), 0.01, 0.3)
def printer(d=0.6):
    out = np.zeros(int(d*SR))
    for k in range(int(d*30)): add(out, bandnoise(0.02, 1500, 5000)*np.exp(-t_(0.02)*80), k/30, 0.5)
    return out
def drip():
    t = t_(0.25); return np.sin(2*np.pi*np.cumsum(900+900*np.exp(-t*30))/SR)*np.exp(-t*18)
ev = []
def bell():
    t = t_(1.2); return (np.sin(2*np.pi*1046*t)+0.5*np.sin(2*np.pi*1568*t))*np.exp(-t*3)
def steps(n, start, gap=0.34, g=0.35): return [(start+k*gap, step(), g) for k in range(n)]
def growl():
    t = t_(0.7); return np.sin(2*np.pi*np.cumsum(70+20*np.sin(t*30))/SR)*env(len(t), 0.05, 0.2)*(0.6+0.4*np.sin(t*40))
def tick(): t = t_(0.03); return bandnoise(0.03, 3000, 9000)*np.exp(-t*150)
def neon_buzz(d): t = t_(d); return (np.sign(np.sin(2*np.pi*100*t))*0.2+np.sin(2*np.pi*200*t)*0.3)*env(len(t), 0.01, 0.1)
def crumple():
    out = np.zeros(int(0.5*SR))
    for k in range(20): add(out, bandnoise(0.02, 1500, 8000)*np.exp(-t_(0.02)*100), rng.random()*0.45, 0.4+rng.random()*0.6)
    return out
def stamp(): return thud(90)
# parkplatz: outdoor air, thought-bubble pop, plan pops, entrance door
ev += [(0, ambience(S['pfeile'], 100, 1200), 0.14), (0.3, pop(500, 1200, 0.1), 0.6), (wt('Fünfzig-Euro-Schein','parkplatz'), sparkle(), 0.5)]
for w in ['rein','Birne','raus']: ev.append((wt(w,'parkplatz')-0.05, pop(600, 1400, 0.08), 0.7))
ev += steps(6, wt('rein','parkplatz'), 0.36)
# pfeile: footsteps all along, whooshy jump cuts, red route line drawing
ev += steps(18, S['pfeile']+0.1, 0.36, 0.3) + [(wt('Einmal','pfeile'), zip_(1.4), 0.4)]
# abkuerzung: tiny sign shimmer
ev += [(S['abkuerzung']+0.2, chime(2637, 0.6), 0.35)] + steps(5, wt('Aber','abkuerzung')-0.3, 0.36, 0.3)
# restaurant: stomach growl, cutlery, clock ticks
ev += [(wt('knurrt','restaurant'), growl(), 0.8), (wt('Mitte','restaurant'), pop(), 0.5), (wt('satt','restaurant')-0.1, clink(3200), 0.4), (wt('satt','restaurant')+0.6, clink(2900), 0.35)]
tk = WTg = wt('Und','restaurant')
k = S['restaurant']+5.6
while k < S['markthalle']: ev.append((k, tick(), 0.5)); k += 0.12
ev += [(wt('mehr','restaurant'), kaching(), 0.6)]
# markthalle: items whoosh into the cart
for k in range(16): ev.append((wt('Kerzen','markthalle')-0.2+k*0.24, whoosh(0.18, 800, 6000), 0.35))
ev += [(wt('Euro','markthalle'), beep(2200, 0.05), 0.3), (wt('geschenkt','markthalle'), sparkle(), 0.5)]
# kasse: scanner beeps, receipt printer, sad slide, stamps
for k in range(10): ev.append((S['kasse']+0.2+k*0.16, beep(2600, 0.05), 0.35))
ev += [(S['kasse']+0.3, printer(3.5), 0.4), (wt('zwei','kasse'), slide_down(), 0.5), (wt('Vergessen','kasse')-0.1, thud(70), 0.5)]
for k in range(6): ev.append((wt('Hälfte','kasse')-0.1+k*0.12, thud(160), 0.35))
# groschen
ev += [(S['groschen']+0.02, scratch(), 0.8), (wt('Wer','groschen'), pop(), 0.4)]
# labyrinth: neon flicker on, dizzy swirl
ev += [(wt('Namen','labyrinth')-0.2, neon_buzz(2.0), 0.35), (wt('Gruen-Effekt','labyrinth'), chime(1760, 0.8), 0.4), (wt('irrst','labyrinth'), whoosh(1.4, 300, 3000), 0.4), (wt('vergisst','labyrinth'), pop(900, 400, 0.15), 0.5)]
# rueckblende: film projector crackle + wind for snow
ev += [(S['rueckblende'], bandnoise(S['unterhalt']-S['rueckblende'], 1500, 7000)*0.25, 0.25), (wt('Amerika','rueckblende')-0.3, ambience(3.0, 300, 2500), 0.2), (wt('Wien','rueckblende'), bell(), 0.35)]
# unterhalt: model collapse, stamp
ev += [(wt('verachtet','unterhalt'), crumple(), 0.7), (wt('verachtet','unterhalt')+0.1, thud(60), 0.5), (wt('keinen','unterhalt')+0.05, stamp(), 1.0)]
# abend: evening ambience, door chime, bubble pop
ev += [(S['abend'], ambience(tl['total']-S['abend'], 100, 1500), 0.14), (S['abend']+0.1, chime(1318, 1.0), 0.4), (wt('Glühbirne','abend')-0.1, pop(500, 1200, 0.1), 0.6), (wt('noch','abend')+0.3, chime(1046, 1.6), 0.5)]
for t, sig, g in ev: add(fx, sig, t, g)

# ---------- original lounge-muzak bed: 104 BPM, warm e-piano + walking bass + brushes (Bb maj7 - Gm7 - Eb maj7 - F7) ----------
bpm = 104; beat = 60/bpm; bar = 4*beat
NOTE = lambda n: 440*2**((n-69)/12)
prog = [(46, [62, 65, 69, 70]), (43, [58, 62, 65, 70]), (39, [58, 62, 67, 70]), (41, [57, 60, 63, 69])]
def ep(freqs, d):
    t = t_(d); s = sum((np.sin(2*np.pi*f*t)+0.3*np.sin(4*np.pi*f*t)*np.exp(-t*4))*np.exp(-t*1.2) for f in freqs)
    return s*env(len(t), 0.01, 0.3)/len(freqs)
def pl(f, d=0.45):
    t = t_(d); return (np.sin(2*np.pi*f*t)+0.4*np.sin(4*np.pi*f*t)*np.exp(-t*10))*np.exp(-t*6)
music = np.zeros(N)
for b in range(int(tl['total']/bar)+2):
    root, ch = prog[b % 4]; t0 = b*bar
    add(music, ep([NOTE(n) for n in ch], bar*0.95), t0, 0.5); add(music, ep([NOTE(n) for n in ch], beat*1.2), t0+beat*2.5, 0.25)
    for k, n in enumerate([root, root+7, root+12, root+7]): add(music, pl(NOTE(n-12)), t0+k*beat, 0.75)
    for k in range(8): add(music, bandnoise(0.09, 4000, 10000)*np.exp(-t_(0.09)*25), t0+k*beat/2+(beat*0.08 if k % 2 else 0), 0.05)
gain = np.ones(N)
def ramp(a, b, g): gain[int(a*SR):int(b*SR)] = g
ramp(S['groschen'], S['groschen']+1.0, 0.0); ramp(S['rueckblende'], S['abend'], 0.55); ramp(S['unterhalt'], S['abend'], 0.4)
k = int(0.15*SR); c = np.cumsum(np.concatenate([np.full(k, gain[0]), gain])); gain = (c[k:]-c[:-k])/k
music *= gain; music[:int(0.05*SR)] *= np.linspace(0, 1, int(0.05*SR))
# sepia flashback: lo-fi the music (old-radio band-pass) during rueckblende + unterhalt
a0, a1 = int(S['rueckblende']*SR), int(S['abend']*SR)
seg = music[a0:a1].copy(); X = np.fft.rfft(seg); f = np.fft.rfftfreq(len(seg), 1/SR); X[(f < 300) | (f > 3200)] *= 0.08; music[a0:a1] = np.fft.irfft(X, len(seg))
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
