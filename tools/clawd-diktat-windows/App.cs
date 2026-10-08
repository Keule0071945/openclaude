// Clawd Diktat - speech to text for Windows, made for talking to Claude.
//
// Hold F9 (or tap it once), speak, release: the recording is transcribed offline by
// whisper.cpp and the text is pasted wherever the cursor is - Claude Desktop, Claude Code
// in the terminal, the browser, any editor. Voice commands: "absenden" presses Enter,
// "neue Zeile" inserts a line break, "Slash compact" types /compact, "abbrechen" presses Esc.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Media;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace ClawdDiktat
{
    static class Program
    {
        [DllImport("user32.dll")] static extern bool SetProcessDPIAware();

        [STAThread]
        static void Main(string[] args)
        {
            try { SetProcessDPIAware(); } catch { }
            if (args.Length > 0 && args[0] == "check") { Check.Run(); return; }
            if (args.Length > 1 && args[0] == "test") { Check.Transcribe(args[1]); return; }
            bool fresh;
            using (var single = new Mutex(true, "ClawdDiktat-single-instance", out fresh))
            {
                if (!fresh) { MessageBox.Show("Clawd Diktat läuft schon – schau unten rechts bei den Symbolen neben der Uhr.", "Clawd Diktat"); return; }
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new TrayApp());
            }
        }
    }

    // ── Windows plumbing: global key hook and synthetic key presses ──
    static class Native
    {
        public delegate IntPtr HookProc(int code, IntPtr wParam, IntPtr lParam);
        [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr SetWindowsHookEx(int id, HookProc fn, IntPtr mod, uint thread);
        [DllImport("user32.dll")] public static extern bool UnhookWindowsHookEx(IntPtr h);
        [DllImport("user32.dll")] public static extern IntPtr CallNextHookEx(IntPtr h, int code, IntPtr wParam, IntPtr lParam);
        [DllImport("kernel32.dll")] public static extern IntPtr GetModuleHandle(string name);
        [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint n, INPUT[] inputs, int size);

        [StructLayout(LayoutKind.Sequential)] public struct KBDLLHOOKSTRUCT { public uint vkCode, scanCode, flags, time; public IntPtr extra; }
        [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public InputUnion u; }
        [StructLayout(LayoutKind.Explicit)] struct InputUnion { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
        [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT { public int dx, dy; public uint data, flags, time; public IntPtr extra; }
        [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT { public ushort vk, scan; public uint flags, time; public IntPtr extra; }

        const uint KEYUP = 0x2, UNICODE = 0x4;

        static INPUT Key(ushort vk, ushort scan, uint flags)
        {
            return new INPUT { type = 1, u = new InputUnion { ki = new KEYBDINPUT { vk = vk, scan = scan, flags = flags } } };
        }

        public static void Press(params Keys[] chord)
        {
            var list = new List<INPUT>();
            foreach (var k in chord) list.Add(Key((ushort)k, 0, 0));
            foreach (var k in chord.Reverse()) list.Add(Key((ushort)k, 0, KEYUP));
            SendInput((uint)list.Count, list.ToArray(), Marshal.SizeOf(typeof(INPUT)));
        }

        /// <summary>Types text character by character. Line breaks become Shift+Enter so chat boxes don't send early.</summary>
        public static void Type(string text)
        {
            foreach (var ch in text.Replace("\r", ""))
            {
                if (ch == '\n') { Press(Keys.ShiftKey, Keys.Return); Thread.Sleep(5); continue; }
                var both = new[] { Key(0, ch, UNICODE), Key(0, ch, UNICODE | KEYUP) };
                SendInput(2, both, Marshal.SizeOf(typeof(INPUT)));
                Thread.Sleep(2);
            }
        }
    }

    /// <summary>Low-level keyboard hook: sees the dictation key everywhere, even in full-screen apps.</summary>
    sealed class KeyHook : IDisposable
    {
        const int WH_KEYBOARD_LL = 13, WM_KEYDOWN = 0x100, WM_KEYUP = 0x101, WM_SYSKEYDOWN = 0x104, WM_SYSKEYUP = 0x105, LLKHF_INJECTED = 0x10;
        readonly Native.HookProc proc;
        IntPtr hook;
        public Func<int, bool> Down = vk => false;   // return true to swallow the key
        public Func<int, bool> Up = vk => false;

        public KeyHook()
        {
            proc = Callback;
            hook = Native.SetWindowsHookEx(WH_KEYBOARD_LL, proc, Native.GetModuleHandle(null), 0);
        }
        public bool Active { get { return hook != IntPtr.Zero; } }

        IntPtr Callback(int code, IntPtr wParam, IntPtr lParam)
        {
            if (code >= 0)
            {
                var k = (Native.KBDLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(Native.KBDLLHOOKSTRUCT));
                if ((k.flags & LLKHF_INJECTED) == 0)
                {
                    int msg = wParam.ToInt32();
                    bool swallow = false;
                    try
                    {
                        if (msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN) swallow = Down((int)k.vkCode);
                        else if (msg == WM_KEYUP || msg == WM_SYSKEYUP) swallow = Up((int)k.vkCode);
                    }
                    catch { }
                    if (swallow) return new IntPtr(1);
                }
            }
            return Native.CallNextHookEx(hook, code, wParam, lParam);
        }

        public void Dispose() { if (hook != IntPtr.Zero) { Native.UnhookWindowsHookEx(hook); hook = IntPtr.Zero; } }
    }

    /// <summary>Records from the microphone into memory and reports the live level.</summary>
    sealed class Recorder : IDisposable
    {
        readonly MicStream mic;
        readonly MemoryStream pcm = new MemoryStream();
        readonly Thread reader;
        volatile bool stop;
        public volatile float Level;
        public readonly string DeviceName;

        public Recorder(string preferred)
        {
            var devices = MicStream.Devices();
            string name;
            int pick = MicStream.Pick(preferred, out name);
            var order = new List<int>();
            if (pick >= 0) order.Add(pick);
            for (int i = 0; i < devices.Count; i++) if (i != pick && !MicStream.IsVirtual(devices[i])) order.Add(i);
            if (order.Count == 0) order.Add(-1);
            Exception last = null;
            foreach (var dev in order)
            {
                try { mic = new MicStream(dev); DeviceName = dev >= 0 && dev < devices.Count ? devices[dev] : "Windows-Standard"; break; }
                catch (Exception ex) { last = ex; }
            }
            if (mic == null) throw new IOException(last != null ? last.Message : "Kein Mikrofon gefunden.");
            reader = new Thread(Read) { IsBackground = true, Name = "record" };
            reader.Start();
        }

        void Read()
        {
            var buf = new byte[3200];
            while (!stop)
            {
                int n;
                try { n = mic.Read(buf, 0, buf.Length); } catch { break; }
                if (n <= 0) break;
                lock (pcm) pcm.Write(buf, 0, n);
                Level = (float)Math.Min(1, Speech.Rms(buf, 0, n - n % 2) / 6000);
            }
        }

        public byte[] Stop()
        {
            stop = true;
            try { mic.Dispose(); } catch { }
            try { reader.Join(800); } catch { }
            lock (pcm) return pcm.ToArray();
        }

        public double Seconds { get { lock (pcm) return pcm.Length / 32000.0; } }

        public void Dispose() { if (!stop) Stop(); }
    }

    enum Phase { Hidden, Listening, Working, Done, Info, Error }

    /// <summary>The floating pill at the bottom of the screen. Never takes the focus away.</summary>
    sealed class Overlay : Form
    {
        public Phase Phase = Phase.Hidden;
        public string Title = "", Detail = "";
        public Func<float> LevelSource;
        public DateTime Started;
        readonly float[] levels = new float[34];
        readonly System.Windows.Forms.Timer anim = new System.Windows.Forms.Timer { Interval = 33 };
        readonly System.Windows.Forms.Timer hide = new System.Windows.Forms.Timer();
        int frame;
        static readonly Color Bg = Color.FromArgb(27, 31, 59), Ink = Color.FromArgb(236, 238, 255), Muted = Color.FromArgb(150, 156, 196),
            Accent = Color.FromArgb(232, 137, 106), Rec = Color.FromArgb(255, 92, 92), Ok = Color.FromArgb(61, 220, 151), Warn = Color.FromArgb(247, 192, 74);

        public Overlay()
        {
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            TopMost = true;
            StartPosition = FormStartPosition.Manual;
            BackColor = Bg;
            DoubleBuffered = true;
            Size = new Size(Dpi(470), Dpi(78));
            anim.Tick += (s, e) => { frame++; if (LevelSource != null && Phase == Phase.Listening) { Array.Copy(levels, 1, levels, 0, levels.Length - 1); levels[levels.Length - 1] = LevelSource(); } Invalidate(); };
            hide.Tick += (s, e) => { hide.Stop(); Phase = Phase.Hidden; anim.Stop(); Hide(); };
        }

        static int Dpi(int px) { using (var g = Graphics.FromHwnd(IntPtr.Zero)) return (int)(px * g.DpiX / 96f); }

        protected override bool ShowWithoutActivation { get { return true; } }
        protected override CreateParams CreateParams
        {
            get
            {
                var cp = base.CreateParams;
                cp.ExStyle |= 0x08000000 | 0x80 | 0x8; // NOACTIVATE | TOOLWINDOW | TOPMOST
                return cp;
            }
        }
        protected override void WndProc(ref Message m)
        {
            if (m.Msg == 0x21) { m.Result = new IntPtr(3); return; } // WM_MOUSEACTIVATE -> MA_NOACTIVATE
            base.WndProc(ref m);
        }

        public void Show(Phase phase, string title, string detail, int autoHideMs)
        {
            Phase = phase; Title = title ?? ""; Detail = detail ?? "";
            if (phase == Phase.Listening) { Started = DateTime.Now; Array.Clear(levels, 0, levels.Length); }
            var area = Screen.FromPoint(Cursor.Position).WorkingArea;
            Location = new Point(area.Left + (area.Width - Width) / 2, area.Bottom - Height - Dpi(28));
            using (var path = Round(new Rectangle(0, 0, Width, Height), Height / 2)) Region = new Region(path);
            hide.Stop();
            if (!Visible) base.Show();
            anim.Start();
            if (autoHideMs > 0) { hide.Interval = autoHideMs; hide.Start(); }
            Invalidate();
        }

        public void HideNow() { hide.Stop(); anim.Stop(); Phase = Phase.Hidden; Hide(); }

        static GraphicsPath Round(Rectangle r, int radius)
        {
            var p = new GraphicsPath();
            int d = radius * 2;
            p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            p.CloseFigure();
            return p;
        }

        // Clawd, 18x8 pixels (same art as the Academy and Claude Island).
        static readonly string[] Clawd = { "..................", "...############...", "...##.######.##...", ".################.", "...############...", "....#.#....#.#....", };
        static readonly string[] ClawdHappy = { ".##............##.", "...##.######.##...", "...#.#.####.#.#...", "...############...", "...############...", "....#.#....#.#....", };

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;
            float s = Height / 78f;
            Color ring = Phase == Phase.Listening ? Rec : Phase == Phase.Done ? Ok : Phase == Phase.Error ? Rec : Phase == Phase.Info ? Warn : Accent;
            using (var pen = new Pen(Color.FromArgb(150, ring), 2.5f * s)) using (var path = Round(new Rectangle(1, 1, Width - 3, Height - 3), Height / 2 - 1)) g.DrawPath(pen, path);

            // Clawd on the left, hopping while he works
            var rows = Phase == Phase.Done ? ClawdHappy : Clawd;
            float px = 3f * s, cx = 26 * s, cy = Height / 2f - rows.Length * px / 2;
            if (Phase == Phase.Working || Phase == Phase.Done) cy -= (float)Math.Abs(Math.Sin(frame / 4.0)) * 5 * s;
            if (Phase == Phase.Listening) cy -= (float)(Math.Sin(frame / 7.0) * 1.5 * s);
            using (var b = new SolidBrush(Color.FromArgb(215, 119, 87)))
            using (var eye = new SolidBrush(Bg))
                for (int r = 0; r < rows.Length; r++)
                    for (int c = 0; c < rows[r].Length; c++)
                    {
                        if (rows[r][c] == '#') g.FillRectangle(b, cx + c * px, cy + r * px, px + .5f, px + .5f);
                        else if (r == 2 && rows == Clawd && (c == 5 || c == 12) && frame % 90 > 3) g.FillRectangle(eye, cx + c * px, cy + r * px, px, px);
                    }

            float tx = 92 * s;
            using (var titleFont = new Font("Segoe UI Semibold", 15f * s, GraphicsUnit.Pixel))
            using (var detailFont = new Font("Segoe UI", 12.5f * s, GraphicsUnit.Pixel))
            using (var ink = new SolidBrush(Ink))
            using (var muted = new SolidBrush(Muted))
            using (var fmt = new StringFormat { Trimming = StringTrimming.EllipsisCharacter, FormatFlags = StringFormatFlags.NoWrap })
            {
                if (Phase == Phase.Listening)
                {
                    float pulse = (float)(0.6 + 0.4 * Math.Sin(frame / 5.0));
                    using (var red = new SolidBrush(Color.FromArgb((int)(255 * pulse), Rec))) g.FillEllipse(red, tx, 17 * s, 11 * s, 11 * s);
                    var secs = (int)(DateTime.Now - Started).TotalSeconds;
                    g.DrawString(Title + "  " + secs / 60 + ":" + (secs % 60).ToString("00"), titleFont, ink, tx + 17 * s, 9 * s);
                    using (var right = new StringFormat(fmt) { Alignment = StringAlignment.Far })
                        g.DrawString(Detail, detailFont, muted, new RectangleF(tx + 150 * s, 12 * s, Width - tx - 150 * s - 34 * s, 20 * s), right);
                    // live level meter, newest on the right
                    float bw = 5 * s, gap = 3.2f * s, mid = 54 * s, span = Width - tx - 34 * s;
                    int n = Math.Min(levels.Length, (int)(span / (bw + gap)));
                    for (int i = 0; i < n; i++)
                    {
                        float lv = levels[levels.Length - n + i];
                        float hgt = Math.Max(3 * s, (float)Math.Sqrt(lv) * 24 * s);
                        using (var lb = new SolidBrush(Color.FromArgb(90 + (int)(165f * i / n), Accent)))
                            g.FillRectangle(lb, tx + i * (bw + gap), mid - hgt / 2, bw, hgt);
                    }
                }
                else
                {
                    var t = Title;
                    if (Phase == Phase.Working) t += new string('.', 1 + frame / 8 % 3);
                    g.DrawString(t, titleFont, ink, tx, 13 * s);
                    g.DrawString(Detail.Replace("\n", " ⏎ "), detailFont, muted, new RectangleF(tx, 41 * s, Width - tx - 34 * s, 22 * s), fmt);
                }
            }
        }
    }

    sealed class TrayApp : ApplicationContext
    {
        readonly Settings settings = Settings.Load();
        readonly NotifyIcon tray = new NotifyIcon();
        readonly Overlay overlay = new Overlay();
        readonly KeyHook hook;
        readonly List<string> history = new List<string>();
        readonly SynchronizationContext ui;
        Recorder recorder;
        bool toggleMode, working, recording, keyHeld, stopping;
        DateTime downAt;
        IntPtr target;
        Icon iconIdle, iconRec;
        System.Windows.Forms.Timer maxTimer;

        static readonly Dictionary<int, string> KeyNames = new Dictionary<int, string>
        {
            { 0x77, "F8" }, { 0x78, "F9" }, { 0x79, "F10" }, { 0x7B, "F12" }, { 0x91, "Rollen (Scroll Lock)" }, { 0x13, "Pause" }, { 0xA3, "Strg rechts" }, { 0x5D, "Menütaste" },
        };
        string KeyName { get { string n; return KeyNames.TryGetValue(settings.Key, out n) ? n : "Taste " + settings.Key; } }

        static string ReplacementsFile { get { return Path.Combine(Settings.Dir, "ersetzungen.txt"); } }
        static string HistoryFile { get { return Path.Combine(Settings.Dir, "verlauf.txt"); } }

        public TrayApp()
        {
            ui = SynchronizationContext.Current ?? new WindowsFormsSynchronizationContext();
            iconIdle = MakeIcon(false); iconRec = MakeIcon(true);
            tray.Icon = iconIdle;
            tray.Text = "Clawd Diktat – " + KeyName + " halten und sprechen";
            tray.Visible = true;
            tray.ContextMenuStrip = new ContextMenuStrip();
            tray.ContextMenuStrip.Opening += (s, e) => BuildMenu();
            tray.MouseClick += (s, e) => { if (e.Button == MouseButtons.Left) ShowHelp(); };
            BuildMenu();
            try { Directory.CreateDirectory(Settings.Dir); if (!File.Exists(ReplacementsFile)) File.WriteAllText(ReplacementsFile, Speech.DefaultReplacements, new UTF8Encoding(true)); } catch { }
            try { if (File.Exists(HistoryFile)) history.AddRange(File.ReadAllLines(HistoryFile, Encoding.UTF8).Reverse().Take(20).Select(l => l.Replace("⏎", "\n"))); } catch { }

            hook = new KeyHook { Down = OnDown, Up = OnUp };
            if (!hook.Active) Balloon("Die Taste konnte nicht überwacht werden. Starte Clawd Diktat neu.", ToolTipIcon.Error);

            if (Engine.Exe() == null || Engine.Models().Count == 0)
                Balloon("Fast fertig: Die Spracherkennung fehlt noch. Rechtsklick auf das Clawd-Symbol → „Spracherkennung installieren“.", ToolTipIcon.Warning);
            else
                Balloon("Bereit! Halte " + KeyName + " gedrückt, sprich, und lass los – der Text landet dort, wo dein Cursor ist.", ToolTipIcon.Info);
        }

        void Balloon(string text, ToolTipIcon icon)
        {
            tray.BalloonTipTitle = "Clawd Diktat";
            tray.BalloonTipText = text;
            tray.BalloonTipIcon = icon;
            tray.ShowBalloonTip(6000);
        }

        // ── hotkey state machine ──
        // Hold the key: record while held. Tap it (< 350 ms): record until the next tap.
        // The hook runs on the UI thread; real work is posted so the hook returns at once.
        bool OnDown(int vk)
        {
            if (vk == 0x1B && recording) { ui.Post(_ => Cancel(), null); return true; } // Esc cancels
            if (vk != settings.Key) return false;
            if (keyHeld) return true; // auto-repeat while held
            keyHeld = true;
            if (working) { ui.Post(_ => overlay.Show(Phase.Working, "Moment", "Ich schreibe noch den letzten Text auf", 0), null); return true; }
            if (!recording)
            {
                recording = true; toggleMode = false; downAt = DateTime.Now;
                ui.Post(_ => Start(), null);
            }
            else if (toggleMode) { stopping = true; ui.Post(_ => Finish(), null); }
            return true;
        }

        bool OnUp(int vk)
        {
            if (vk != settings.Key) return false;
            keyHeld = false;
            if (stopping) { stopping = false; return true; }
            if (recording && !toggleMode)
            {
                if ((DateTime.Now - downAt).TotalMilliseconds < 350)
                {
                    toggleMode = true;
                    ui.Post(_ => { overlay.Detail = KeyName + " nochmal tippen = fertig · Esc = abbrechen"; }, null);
                }
                else ui.Post(_ => Finish(), null);
            }
            return true;
        }

        void Start()
        {
            if (recorder != null || working) return;
            target = Native.GetForegroundWindow();
            try { recorder = new Recorder(settings.Mic); }
            catch (Exception ex) { recorder = null; recording = false; Sound("error"); overlay.Show(Phase.Error, "Mikrofon geht nicht", ex.Message, 5000); return; }
            Sound("start");
            tray.Icon = iconRec;
            var rec = recorder;
            overlay.LevelSource = () => rec.Level;
            overlay.Show(Phase.Listening, "Ich höre zu", KeyName + " loslassen = fertig · Esc = abbrechen", 0);
            maxTimer = new System.Windows.Forms.Timer { Interval = 180000 };
            maxTimer.Tick += (s, e) => Finish();
            maxTimer.Start();
        }

        void Cancel()
        {
            if (recorder == null) return;
            StopTimer();
            recorder.Stop(); recorder = null; toggleMode = false; recording = false;
            tray.Icon = iconIdle;
            Sound("stop");
            overlay.Show(Phase.Info, "Abgebrochen", "Es wurde nichts eingefügt.", 1400);
        }

        void StopTimer() { if (maxTimer != null) { maxTimer.Stop(); maxTimer.Dispose(); maxTimer = null; } }

        void Finish()
        {
            if (recorder == null) { recording = false; return; }
            StopTimer();
            var pcm = recorder.Stop(); recorder = null; toggleMode = false; recording = false;
            tray.Icon = iconIdle;
            Sound("stop");
            double speech;
            var trimmed = Speech.TrimSilence(pcm, out speech);
            if (speech < 0.25 || trimmed.Length < 16000)
            {
                overlay.Show(Phase.Info, "Nichts gehört", pcm.Length < 16000 ? "Halte " + KeyName + " gedrückt, solange du sprichst." : "Sprich etwas lauter oder wähle ein anderes Mikrofon.", 2600);
                return;
            }
            // Whisper works better with a little silence at the end.
            var padded = new byte[trimmed.Length + 16000];
            Buffer.BlockCopy(trimmed, 0, padded, 0, trimmed.Length);
            working = true;
            overlay.Show(Phase.Working, "Schreibe auf", Engine.Describe(Path.GetFileName(Engine.ModelPath(settings) ?? "")), 0);
            var dest = target;
            ThreadPool.QueueUserWorkItem(_ =>
            {
                string error = null, raw = null;
                var watch = Stopwatch.StartNew();
                try
                {
                    var wav = Path.Combine(Path.GetTempPath(), "clawd-diktat.wav");
                    File.WriteAllBytes(wav, Speech.Wav(padded));
                    raw = Engine.Transcribe(wav, settings, out error);
                    try { File.Delete(wav); } catch { }
                }
                catch (Exception ex) { error = ex.Message; }
                var secs = watch.Elapsed.TotalSeconds;
                ui.Post(__ => { working = false; Deliver(raw, error, dest, secs); }, null);
            });
        }

        void Deliver(string raw, string error, IntPtr dest, double secs)
        {
            if (error != null) { Sound("error"); overlay.Show(Phase.Error, "Das hat nicht geklappt", error, 7000); Log("FEHLER: " + error); return; }
            List<KeyValuePair<System.Text.RegularExpressions.Regex, string>> rules = null;
            try { rules = Speech.ParseReplacements(File.ReadAllText(ReplacementsFile, Encoding.UTF8)); } catch { }
            var d = Speech.Process(raw, rules, settings.Commands, settings.AutoSend);
            Log(raw.Trim().Replace("\r", "").Replace("\n", " ") + "  →  " + d.Text.Replace("\n", "⏎") + (d.Send ? " [Enter]" : "") + (d.Escape ? " [Esc]" : ""));
            if (d.Escape) { Native.Press(Keys.Escape); overlay.Show(Phase.Done, "Esc gedrückt", "„abbrechen“ erkannt", 1500); return; }
            if (d.Text.Length == 0 && !d.Send) { overlay.Show(Phase.Info, "Nichts verstanden", "Versuch es nochmal – etwas näher am Mikrofon.", 2600); return; }

            if (Native.GetForegroundWindow() != dest && dest != IntPtr.Zero)
            {
                // The user switched windows while we were working: don't type into the wrong place.
                CopyToClipboard(d.Text);
                overlay.Show(Phase.Info, "In der Zwischenablage", "Du hast das Fenster gewechselt – mit Strg+V einfügen.", 4000);
                Remember(d.Text);
                return;
            }
            if (d.Text.Length > 0)
            {
                if (settings.TypeMode) Native.Type(d.Text);
                else Paste(d.Text);
            }
            if (d.Send)
            {
                var t = new System.Windows.Forms.Timer { Interval = settings.TypeMode ? 60 : 180 };
                t.Tick += (s, e) => { t.Stop(); t.Dispose(); Native.Press(Keys.Return); };
                t.Start();
            }
            Remember(d.Text);
            Sound("done");
            overlay.Show(Phase.Done, d.Send ? "Gesendet ⏎" : "Eingefügt", (d.Text.Length > 0 ? d.Text : "(nur Enter)") + "   ·   " + secs.ToString("0.0") + " s", 2600);
        }

        void Paste(string text)
        {
            string old = null;
            try { if (Clipboard.ContainsText()) old = Clipboard.GetText(); } catch { }
            if (!CopyToClipboard(text)) { Native.Type(text); return; }
            Native.Press(Keys.ControlKey, Keys.V);
            var t = new System.Windows.Forms.Timer { Interval = 700 };
            t.Tick += (s, e) =>
            {
                t.Stop(); t.Dispose();
                if (old == null) return;
                try { if (Clipboard.ContainsText() && Clipboard.GetText() == text) Clipboard.SetText(old); } catch { }
            };
            t.Start();
        }

        static bool CopyToClipboard(string text)
        {
            for (int i = 0; i < 6; i++)
            {
                try { Clipboard.SetText(text.Replace("\r\n", "\n").Replace("\n", "\r\n")); return true; }
                catch { Thread.Sleep(60); }
            }
            return false;
        }

        void Remember(string text)
        {
            if (string.IsNullOrEmpty(text)) return;
            history.Insert(0, text);
            while (history.Count > 20) history.RemoveAt(history.Count - 1);
            try { Directory.CreateDirectory(Settings.Dir); File.AppendAllText(HistoryFile, text.Replace("\r", "").Replace("\n", "⏎") + "\r\n", Encoding.UTF8); } catch { }
        }

        static void Log(string line)
        {
            try { Directory.CreateDirectory(Settings.Dir); File.AppendAllText(Path.Combine(Settings.Dir, "diktat.log"), DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "  " + line + "\r\n", Encoding.UTF8); } catch { }
        }

        void Sound(string kind)
        {
            if (!settings.Sounds) return;
            try
            {
                byte[] wav;
                switch (kind)
                {
                    case "start": wav = Speech.Tone(new[] { 660.0, 990.0 }, 60, .22); break;
                    case "stop": wav = Speech.Tone(new[] { 880.0, 587.0 }, 55, .2); break;
                    case "done": wav = Speech.Tone(new[] { 1046.0, 1318.0, 1568.0 }, 45, .14); break;
                    default: wav = Speech.Tone(new[] { 311.0, 233.0 }, 120, .2); break;
                }
                var p = new SoundPlayer(new MemoryStream(wav));
                p.Play();
            }
            catch { }
        }

        static Icon MakeIcon(bool recording)
        {
            var bmp = new Bitmap(32, 32);
            using (var g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.Transparent);
                using (var b = new SolidBrush(Color.FromArgb(215, 119, 87)))
                {
                    string[] rows = { "................", ".##............##", "..############..", "..##.######.##..", "################", "..############..", "...#.#....#.#...", };
                    for (int r = 0; r < rows.Length; r++)
                        for (int c = 0; c < rows[r].Length && c < 16; c++)
                            if (rows[r][c] == '#') g.FillRectangle(b, c * 2, 6 + r * 2 + 4, 2, 2);
                }
                if (recording) using (var red = new SolidBrush(Color.FromArgb(255, 70, 70))) { g.SmoothingMode = SmoothingMode.AntiAlias; g.FillEllipse(red, 19, 0, 13, 13); }
            }
            return Icon.FromHandle(bmp.GetHicon());
        }

        // ── tray menu ──
        void BuildMenu()
        {
            var m = tray.ContextMenuStrip;
            m.Items.Clear();
            var head = new ToolStripMenuItem("Clawd Diktat – " + KeyName + " halten und sprechen") { Enabled = false };
            m.Items.Add(head);
            m.Items.Add(new ToolStripSeparator());

            var keyMenu = new ToolStripMenuItem("Diktier-Taste");
            foreach (var kv in KeyNames)
            {
                int vk = kv.Key;
                keyMenu.DropDownItems.Add(new ToolStripMenuItem(kv.Value, null, (s, e) => { settings.Key = vk; settings.Save(); tray.Text = "Clawd Diktat – " + KeyName + " halten und sprechen"; }) { Checked = settings.Key == vk });
            }
            m.Items.Add(keyMenu);

            var modelMenu = new ToolStripMenuItem("Sprachmodell");
            var models = Engine.Models();
            var current = Path.GetFileName(Engine.ModelPath(settings) ?? "");
            foreach (var f in models)
            {
                var file = f;
                modelMenu.DropDownItems.Add(new ToolStripMenuItem(Engine.Describe(file), null, (s, e) => { settings.Model = file; settings.Save(); }) { Checked = file == current });
            }
            if (models.Count > 0) modelMenu.DropDownItems.Add(new ToolStripSeparator());
            modelMenu.DropDownItems.Add(new ToolStripMenuItem("Modell herunterladen …", null, (s, e) => RunInstaller("-ModelOnly")));
            m.Items.Add(modelMenu);

            var langMenu = new ToolStripMenuItem("Sprache");
            foreach (var l in new[] { new[] { "de", "Deutsch" }, new[] { "en", "Englisch" }, new[] { "auto", "Automatisch erkennen" } })
            {
                var code = l[0];
                langMenu.DropDownItems.Add(new ToolStripMenuItem(l[1], null, (s, e) => { settings.Language = code; settings.Save(); }) { Checked = settings.Language == code });
            }
            m.Items.Add(langMenu);

            var micMenu = new ToolStripMenuItem("Mikrofon");
            string picked;
            int pick = MicStream.Pick(settings.Mic, out picked);
            micMenu.DropDownItems.Add(new ToolStripMenuItem("Automatisch (" + (pick >= 0 ? picked : "Windows-Standard") + ")", null, (s, e) => { settings.Mic = ""; settings.Save(); }) { Checked = settings.Mic == "" });
            foreach (var dev in MicStream.Devices())
            {
                var name = dev;
                micMenu.DropDownItems.Add(new ToolStripMenuItem(name + (MicStream.IsVirtual(name) ? "  (virtuell)" : ""), null, (s, e) => { settings.Mic = name; settings.Save(); }) { Checked = settings.Mic == name });
            }
            m.Items.Add(micMenu);

            m.Items.Add(new ToolStripSeparator());
            m.Items.Add(Toggle("Sprachbefehle („absenden“, „neue Zeile“, „Slash …“)", settings.Commands, v => settings.Commands = v));
            m.Items.Add(Toggle("Nach jedem Diktat absenden (Enter)", settings.AutoSend, v => settings.AutoSend = v));
            m.Items.Add(Toggle("Tippen statt Einfügen (für Programme ohne Strg+V)", settings.TypeMode, v => settings.TypeMode = v));
            m.Items.Add(Toggle("Töne", settings.Sounds, v => settings.Sounds = v));
            m.Items.Add(Toggle("Mit Windows starten", Autostart, v => Autostart = v));

            m.Items.Add(new ToolStripSeparator());
            var hist = new ToolStripMenuItem("Verlauf (klick = kopieren)");
            if (history.Count == 0) hist.DropDownItems.Add(new ToolStripMenuItem("noch leer") { Enabled = false });
            foreach (var h in history.Take(15))
            {
                var text = h;
                var label = text.Replace("\n", " ⏎ ");
                if (label.Length > 70) label = label.Substring(0, 67) + "…";
                hist.DropDownItems.Add(new ToolStripMenuItem(label, null, (s, e) => { CopyToClipboard(text); Balloon("Kopiert – mit Strg+V einfügen.", ToolTipIcon.Info); }));
            }
            m.Items.Add(hist);
            m.Items.Add(new ToolStripMenuItem("Ersetzungen bearbeiten …", null, (s, e) => Open(ReplacementsFile)));
            m.Items.Add(new ToolStripMenuItem("Fachwörter bearbeiten …", null, (s, e) => EditVocabulary()));
            m.Items.Add(new ToolStripMenuItem("Spracherkennung installieren / reparieren …", null, (s, e) => RunInstaller("-EngineOnly")));
            m.Items.Add(new ToolStripMenuItem("Hilfe", null, (s, e) => ShowHelp()));
            m.Items.Add(new ToolStripSeparator());
            m.Items.Add(new ToolStripMenuItem("Beenden", null, (s, e) => ExitThread()));
        }

        ToolStripMenuItem Toggle(string text, bool on, Action<bool> set)
        {
            return new ToolStripMenuItem(text, null, (s, e) => { set(!on); settings.Save(); }) { Checked = on };
        }

        static bool Autostart
        {
            get
            {
                try { using (var k = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run")) return k != null && k.GetValue("ClawdDiktat") != null; }
                catch { return false; }
            }
            set
            {
                try
                {
                    using (var k = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run"))
                    {
                        if (value) k.SetValue("ClawdDiktat", "\"" + Application.ExecutablePath + "\"");
                        else k.DeleteValue("ClawdDiktat", false);
                    }
                }
                catch { }
            }
        }

        static void Open(string path) { try { Process.Start("notepad.exe", "\"" + path + "\""); } catch { } }

        void EditVocabulary()
        {
            var file = Path.Combine(Settings.Dir, "fachwoerter.txt");
            try
            {
                File.WriteAllText(file, "# Fachwörter und Namen, die Clawd Diktat richtig schreiben soll.\r\n# Durch Komma getrennt. Nach dem Speichern sofort aktiv.\r\n" + settings.Vocabulary + "\r\n", new UTF8Encoding(true));
                var p = Process.Start("notepad.exe", "\"" + file + "\"");
                if (p == null) return;
                p.EnableRaisingEvents = true;
                p.Exited += (s, e) => ui.Post(_ =>
                {
                    try
                    {
                        var words = File.ReadAllLines(file, Encoding.UTF8).Where(l => !l.TrimStart().StartsWith("#")).Select(l => l.Trim()).Where(l => l.Length > 0);
                        settings.Vocabulary = string.Join(", ", words); settings.Save();
                        Balloon("Fachwörter gespeichert.", ToolTipIcon.Info);
                    }
                    catch { }
                }, null);
            }
            catch { }
        }

        void RunInstaller(string mode)
        {
            var script = Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), "install.ps1");
            if (!File.Exists(script)) { Balloon("install.ps1 fehlt neben ClawdDiktat.exe. Installier Clawd Diktat neu mit dem Befehl aus der Anleitung.", ToolTipIcon.Error); return; }
            try { Process.Start(new ProcessStartInfo("powershell.exe", "-NoProfile -ExecutionPolicy Bypass -File \"" + script + "\" " + mode) { UseShellExecute = true }); }
            catch (Exception ex) { Balloon("Installer ließ sich nicht starten: " + ex.Message, ToolTipIcon.Error); }
        }

        void ShowHelp()
        {
            MessageBox.Show(
                "So funktioniert's:\n\n" +
                "  • " + KeyName + " gedrückt halten, sprechen, loslassen.\n" +
                "  • Oder " + KeyName + " kurz antippen, sprechen, nochmal antippen.\n" +
                "  • Esc während der Aufnahme bricht ab.\n\n" +
                "Der Text landet dort, wo dein Cursor ist – in Claude, im Terminal mit Claude Code, im Browser oder in jedem Editor.\n\n" +
                "Sprachbefehle:\n" +
                "  • „… absenden“ am Ende → drückt Enter (Claude bekommt die Nachricht sofort)\n" +
                "  • „neue Zeile“ / „neuer Absatz“ → Zeilenumbruch\n" +
                "  • „Slash compact“, „Slash clear“, „Slash review“ … → /compact, /clear, /review\n" +
                "  • nur „abbrechen“ → drückt Esc (stoppt Claude)\n\n" +
                "Alles läuft offline auf deinem PC – nichts wird ins Internet geschickt.\n" +
                "Erkennung zu ungenau? Im Menü ein größeres Sprachmodell wählen oder Fachwörter eintragen.",
                "Clawd Diktat – Hilfe", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        protected override void ExitThreadCore()
        {
            try { if (recorder != null) recorder.Stop(); } catch { }
            hook.Dispose();
            tray.Visible = false;
            tray.Dispose();
            overlay.Close();
            base.ExitThreadCore();
        }
    }

    /// <summary>"ClawdDiktat.exe check" writes check.txt; "ClawdDiktat.exe test file.wav" transcribes a file.</summary>
    static class Check
    {
        public static void Run()
        {
            var lines = new List<string> { "Clawd Diktat Selbsttest " + DateTime.Now.ToString("yyyy-MM-dd HH:mm") };
            var s = Settings.Load();
            lines.Add("Engine: " + (Engine.Exe() ?? "FEHLT"));
            int code = Engine.SelfTest();
            lines.Add("Engine-Start: " + (code == Engine.DllMissing ? "Visual C++ Laufzeit fehlt" : code < 0 ? "nicht möglich (" + code + ")" : "ok (Exit " + code + ")"));
            var models = Engine.Models();
            lines.Add("Modelle: " + (models.Count == 0 ? "KEINE" : string.Join(", ", models)) + "  -> benutzt: " + (Engine.ModelPath(s) ?? "-"));
            string name;
            int pick = MicStream.Pick(s.Mic, out name);
            var devs = MicStream.Devices();
            for (int i = 0; i < devs.Count; i++) lines.Add("Mikrofon " + i + ": " + devs[i] + (MicStream.IsVirtual(devs[i]) ? " (virtuell)" : "") + (i == pick ? "   <- wird benutzt" : ""));
            try
            {
                using (var r = new Recorder(s.Mic))
                {
                    Thread.Sleep(3000);
                    var pcm = r.Stop();
                    double speech;
                    Speech.TrimSilence(pcm, out speech);
                    lines.Add("Aufnahmetest (3 s) mit " + r.DeviceName + ": " + (pcm.Length / 32000.0).ToString("0.0") + " s Audio, Pegel max " + Math.Round(Enumerable.Range(0, Math.Max(1, pcm.Length / 640)).Select(f => Speech.Rms(pcm, f * 640, Math.Min(640, pcm.Length - f * 640))).DefaultIfEmpty(0).Max()) + ", Sprache " + speech.ToString("0.0") + " s");
                }
            }
            catch (Exception ex) { lines.Add("Aufnahmetest: " + ex.Message); }
            var file = Path.Combine(Settings.Dir, "check.txt");
            try { Directory.CreateDirectory(Settings.Dir); File.WriteAllLines(file, lines, Encoding.UTF8); } catch { }
            Console.WriteLine(string.Join(Environment.NewLine, lines));
        }

        public static void Transcribe(string wav)
        {
            string error;
            var raw = Engine.Transcribe(wav, Settings.Load(), out error);
            var line = error ?? Speech.Process(raw, null, true, false).Text;
            try { File.WriteAllText(Path.Combine(Settings.Dir, "test.txt"), line, Encoding.UTF8); } catch { }
            Console.WriteLine(line);
        }
    }
}
