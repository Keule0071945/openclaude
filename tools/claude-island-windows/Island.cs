// Claude Island - the window.
//
// A Dynamic-Island-style notch at the top edge of the screen with Clawd, the
// Claude Code mascot, sitting in it - his legs dangle out of the bottom. Clawd
// acts out what Claude Code is doing (with a costume per tool), the left side
// says it in words, the right side shows the 5-hour usage limit. Hover it and
// the island opens: approvals, usage, today's stats, sessions, quick commands
// and a drop zone - feed Clawd a PDF, a screenshot or the clipboard and ask.

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Windows.Threading;
using Drawing = System.Drawing;
using Path = System.Windows.Shapes.Path;
using Typography = System.Windows.Documents.Typography;
using WinForms = System.Windows.Forms;

namespace ClaudeIsland
{
    static class Palette
    {
        public static readonly Color Clawd = Color.FromRgb(215, 119, 87);
        public static readonly Color ClawdHover = Color.FromRgb(227, 136, 102);
        public static readonly Color Text = Color.FromRgb(245, 245, 247);
        public static readonly Color Secondary = Color.FromRgb(142, 142, 150);
        public static readonly Color Faint = Color.FromRgb(125, 125, 134);
        public static readonly Color Busy = Color.FromRgb(240, 133, 92);
        public static readonly Color Ready = Color.FromRgb(61, 220, 151);
        public static readonly Color Waiting = Color.FromRgb(247, 192, 74);
        public static readonly Color Error = Color.FromRgb(255, 107, 107);
        public static readonly Color Idle = Color.FromRgb(111, 111, 120);
        public static readonly Color Panel = Color.FromRgb(14, 14, 16);
        public static readonly Color PanelLine = Color.FromRgb(31, 31, 35);
        public static readonly Color Field = Color.FromRgb(18, 18, 20);
        public static readonly Color Control = Color.FromRgb(26, 26, 29);
        public static readonly Color ControlHover = Color.FromRgb(35, 35, 39);
        public static readonly Color ControlLine = Color.FromRgb(42, 42, 48);
        public static readonly Color Track = Color.FromRgb(31, 31, 35);

        public static Color For(Mode m)
        {
            switch (m)
            {
                case Mode.Busy: return Busy;
                case Mode.Waiting: return Waiting;
                case Mode.Error: return Error;
                case Mode.Ready: case Mode.Done: return Ready;
                default: return Idle;
            }
        }

        public static Color Level(double pct)
        {
            return pct >= 85 ? Error : pct >= 60 ? Waiting : Ready;
        }

        public static SolidColorBrush Brush(Color c)
        {
            var b = new SolidColorBrush(c);
            b.Freeze();
            return b;
        }

        /// <summary>Colors of the pixel art. '#' is the sprite's own body color.</summary>
        static readonly Dictionary<char, Brush> Cells = new Dictionary<char, Brush>
        {
            { 'w', Brush(Color.FromRgb(246, 243, 238)) },  // tooth
            { 'm', Brush(Color.FromRgb(58, 13, 20)) },     // mouth
            { 'p', Brush(Color.FromRgb(250, 250, 250)) },  // paper
            { 'r', Brush(Color.FromRgb(229, 72, 77)) },    // red
            { 'g', Brush(Color.FromRgb(200, 205, 214)) },  // glasses
            { 'b', Brush(Color.FromRgb(255, 143, 163)) },  // blush / eraser
            { 'h', Brush(Color.FromRgb(214, 40, 57)) },    // santa hat
            { 'W', Brush(Color.FromRgb(255, 255, 255)) },  // white
            { 'y', Brush(Color.FromRgb(247, 192, 74)) },   // yellow
            { 'k', Brush(Color.FromRgb(42, 42, 48)) },     // dark
            { 'l', Brush(Color.FromRgb(154, 160, 170)) },  // light grey
            { 'c', Brush(Color.FromRgb(110, 198, 255)) },  // sweat
            { 'o', Brush(Color.FromRgb(242, 140, 40)) },   // pumpkin
            { 'G', Brush(Color.FromRgb(61, 220, 151)) },   // green
            { 'n', Brush(Color.FromRgb(139, 90, 60)) },    // coffee
            { 's', Brush(Color.FromArgb(150, 220, 220, 220)) }, // steam
        };

        public static Brush Cell(char c, Brush body)
        {
            if (c == '#') return body;
            Brush b;
            return Cells.TryGetValue(c, out b) ? b : null;
        }
    }

    /// <summary>A grid of crisp square pixels showing string art ('.' is empty).</summary>
    class PixelSprite : Canvas
    {
        public readonly int Cols, Rows;
        public readonly double Px;
        readonly Rectangle[] cells;
        string key;

        public PixelSprite(int cols, int rows, double px)
        {
            Cols = cols;
            Rows = rows;
            Px = px;
            Width = cols * px;
            Height = rows * px;
            SnapsToDevicePixels = true;
            IsHitTestVisible = false;
            RenderOptions.SetEdgeMode(this, EdgeMode.Aliased);
            cells = new Rectangle[cols * rows];
            for (int y = 0; y < rows; y++)
                for (int x = 0; x < cols; x++)
                {
                    var r = new Rectangle { Width = px, Height = px, Visibility = Visibility.Hidden };
                    SetLeft(r, x * px);
                    SetTop(r, y * px);
                    cells[y * cols + x] = r;
                    Children.Add(r);
                }
        }

        public void Show(string[] rows, Color body)
        {
            string k = body.ToString() + "|" + string.Join("|", rows);
            if (k == key) return;
            key = k;
            var bodyBrush = Palette.Brush(body);
            for (int y = 0; y < Rows; y++)
                for (int x = 0; x < Cols; x++)
                {
                    char ch = y < rows.Length && x < rows[y].Length ? rows[y][x] : '.';
                    var cell = cells[y * Cols + x];
                    Brush fill = ch == '.' ? null : Palette.Cell(ch, bodyBrush);
                    cell.Visibility = fill != null ? Visibility.Visible : Visibility.Hidden;
                    if (fill != null) cell.Fill = fill;
                }
        }
    }

    /// <summary>Everything that shapes one frame of Clawd.</summary>
    sealed class Look
    {
        public string Eyes = "c";   // c | l | r | shut
        public string Arms = "side"; // side | up | down | wave
        public bool LegsB, Happy, Food, Glasses, Blush;
        public int Mouth, Belly;
        public string Hat = "";     // "" | santa | party
    }

    /// <summary>Clawd, decoded from the logo Claude Code prints on start (18 columns).</summary>
    static class ClawdArt
    {
        public const int Cols = 18, Rows = 11, MaxMouth = 4;

        const string E = "..................";
        const string Top = "...############...";
        const string Body = "...############...";
        const string Arms = ".################.";
        static readonly Dictionary<string, string> Eyes = new Dictionary<string, string>
        {
            { "c", "...##.######.##..." },
            { "l", "...#.######.###..." },
            { "r", "...###.######.#..." },
            { "shut", "...############..." },
        };
        const string LegsA = "....#.#....#.#....";
        const string LegsB = ".....#.#..#.#.....";

        public static string[] Pose(Look look)
        {
            string r0 = E, r1 = Top, r2 = Eyes.ContainsKey(look.Eyes) ? Eyes[look.Eyes] : Eyes["c"], r3 = Arms, r4 = Body;
            if (look.Happy) { r1 = "...##.######.##..."; r2 = "...#.#.####.#.#..."; }
            if (look.Arms == "up") { r0 = ".##............##."; r3 = Body; }
            else if (look.Arms == "down") { r3 = Body; r4 = Arms; }
            else if (look.Arms == "wave") { r0 = "................##"; r3 = ".###############.."; }
            if (r0 == E && look.Hat == "santa") r0 = "....hhhhhhhhhW....";
            else if (r0 == E && look.Hat == "party") r0 = ".......yyyy.......";
            if (look.Glasses && !look.Happy) r2 = WithGlasses(r2);

            var rows = new List<string> { r0, r1, r2 };
            int mouth = Math.Max(0, Math.Min(MaxMouth, look.Mouth));
            if (mouth == 1) rows.Add("...#mmmmmmmmmm#...");
            else if (mouth >= 2)
            {
                rows.Add("...#wmwmwmwmwm#...");
                for (int i = 0; i < mouth - 2; i++)
                {
                    if (look.Food && i == 0) rows.Add("...#mmmppppmmm#...");
                    else if (look.Food && i == 1) rows.Add("...#mmmprrpmmm#...");
                    else rows.Add("...#mmmmmmmmmm#...");
                }
                rows.Add("...#mwmwmwmwmw#...");
            }
            if (look.Blush) r3 = Set(Set(r3, 4, 'b'), 13, 'b');
            // A full context window shows as a round belly.
            if (look.Belly == 1 && r4 == Body) r4 = "..##############..";
            else if (look.Belly >= 2 && r4 == Body) r4 = Arms;
            rows.Add(r3);
            rows.Add(r4);
            rows.Add(look.LegsB ? LegsB : LegsA);
            return rows.ToArray();
        }

        static string WithGlasses(string eyesRow)
        {
            var c = eyesRow.ToCharArray();
            for (int x = 4; x <= 13; x++)
                if (c[x] == '#' && (eyesRow[x - 1] == '.' || eyesRow[x + 1] == '.')) c[x] = 'g';
            return new string(c);
        }

        static string Set(string row, int x, char ch)
        {
            if (row[x] != '#') return row;
            var c = row.ToCharArray();
            c[x] = ch;
            return new string(c);
        }

        // Props Clawd holds next to him (6 x 7).
        public static readonly string[] Pencil = { ".....b", "....yb", "...yy.", "..yy..", ".yy...", "kl....", "......" };
        public static readonly string[] Keyboard = { "......", "......", "......", "......", "llllll", "lWlWlW", "llllll" };
        public static readonly string[] Magnifier = { ".lll..", "lcccl.", "lcccl.", ".lll..", "....k.", ".....k", "......" };
        public static readonly string[] Cup = { "..s.s.", "...s..", ".WWWW.", ".WnnWW", ".WWWW.", "..WW..", "......" };
        public static readonly string[] Pumpkin = { "......", "...G..", ".oooo.", "okookk", "oooooo", ".oooo.", "......" };
        public static readonly string[] Heart = { ".r.r.", "rrrrr", ".rrr.", "..r.." };
        public static readonly string[] Drop = { ".c.", "ccc", "ccc", ".c." };
    }

    /// <summary>Full-screen overlay to drag a rectangle; saves it as PNG.</summary>
    sealed class SnipWindow : Window
    {
        readonly Action<string> done;
        Point start;
        bool dragging;
        readonly Rectangle selection = new Rectangle { Stroke = Brushes.White, StrokeThickness = 1.5, StrokeDashArray = new DoubleCollection { 4, 3 }, Fill = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255)), Visibility = Visibility.Collapsed };
        readonly Canvas surface = new Canvas();

        public SnipWindow(Action<string> onDone)
        {
            done = onDone;
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = new SolidColorBrush(Color.FromArgb(90, 0, 0, 0));
            Topmost = true;
            ShowInTaskbar = false;
            Cursor = Cursors.Cross;
            Left = SystemParameters.VirtualScreenLeft;
            Top = SystemParameters.VirtualScreenTop;
            Width = SystemParameters.VirtualScreenWidth;
            Height = SystemParameters.VirtualScreenHeight;
            var hint = new TextBlock { Text = "Bereich ziehen – Clawd frisst ihn  ·  Esc bricht ab", Foreground = Brushes.White, FontSize = 16, FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 60, 0, 0) };
            surface.Background = Brushes.Transparent;
            surface.Children.Add(selection);
            var grid = new Grid();
            grid.Children.Add(surface);
            grid.Children.Add(new Border { Child = hint, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Top, IsHitTestVisible = false });
            Content = grid;
            MouseLeftButtonDown += (s, e) => { start = e.GetPosition(surface); dragging = true; CaptureMouse(); selection.Visibility = Visibility.Visible; Update(start); };
            MouseMove += (s, e) => { if (dragging) Update(e.GetPosition(surface)); };
            MouseLeftButtonUp += (s, e) => { if (dragging) Finish(e.GetPosition(surface)); };
            KeyDown += (s, e) => { if (e.Key == Key.Escape) { Close(); done(null); } };
            Loaded += (s, e) => Activate();
        }

        void Update(Point p)
        {
            Canvas.SetLeft(selection, Math.Min(p.X, start.X));
            Canvas.SetTop(selection, Math.Min(p.Y, start.Y));
            selection.Width = Math.Abs(p.X - start.X);
            selection.Height = Math.Abs(p.Y - start.Y);
        }

        void Finish(Point end)
        {
            dragging = false;
            ReleaseMouseCapture();
            var rect = new Rect(start, end);
            Matrix toDevice = PresentationSource.FromVisual(this).CompositionTarget.TransformToDevice;
            double left = Left, top = Top;
            Close();
            if (rect.Width < 4 || rect.Height < 4) { done(null); return; }
            // Let the overlay disappear before capturing.
            Dispatcher.BeginInvoke(new Action(() =>
            {
                try
                {
                    var topLeft = toDevice.Transform(new Point(left + rect.X, top + rect.Y));
                    var size = toDevice.Transform(new Point(rect.Width, rect.Height));
                    int w = Math.Max(1, (int)size.X), h = Math.Max(1, (int)size.Y);
                    Directory.CreateDirectory(AppPaths.Shots);
                    string path = System.IO.Path.Combine(AppPaths.Shots, "Bildschirmfoto-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + ".png");
                    using (var bmp = new Drawing.Bitmap(w, h))
                    {
                        using (var g = Drawing.Graphics.FromImage(bmp))
                            g.CopyFromScreen((int)topLeft.X, (int)topLeft.Y, 0, 0, new Drawing.Size(w, h));
                        bmp.Save(path, Drawing.Imaging.ImageFormat.Png);
                    }
                    done(path);
                }
                catch (Exception ex)
                {
                    AppPaths.LogError("screenshot", ex);
                    done(null);
                }
            }), DispatcherPriority.ApplicationIdle);
        }
    }

    sealed class IslandWindow : Window
    {
        // Geometry (DIPs)
        const double WindowW = 960, WindowH = 860;
        const double Shoulder = 10;
        const double RowH = 48;
        const double ClosedW = 470;
        const double GameW = 190;
        const double OpenW = 660;
        const double PanelTop = 62;
        const double PanelInset = 14;
        const double ClawdPx = 6;
        const long ChompMs = 760;

        readonly bool demoOnStart;
        readonly SessionStore store = new SessionStore();
        readonly Settings settings = Settings.Load();
        readonly ClaudeRunner runner = new ClaudeRunner();
        readonly Random random = new Random();

        // Physics
        readonly Spring width = new Spring(120, 300, 26);
        readonly Spring height = new Spring(0, 260, 24);
        readonly Spring shake = new Spring(0, 1100, 14);
        readonly Spring hop = new Spring(0, 520, 16);
        bool rendering;
        TimeSpan lastRender;

        // Visual tree
        Canvas canvas;
        Rectangle catcher;
        Path glowShape, body, edge;
        DropShadowEffect glow;
        Grid row;
        StackPanel left;
        Ellipse dot;
        DropShadowEffect dotGlow;
        TextBlock label, timeLabel;
        StackPanel minis;
        StackPanel usageView;
        TextBlock usageKind, usagePct;
        Path ringValue;
        PixelSprite clawd, prop, sweat;
        TranslateTransform clawdBob;
        readonly List<PixelSprite> babies = new List<PixelSprite>();
        readonly List<PixelSprite> hearts = new List<PixelSprite>();
        readonly List<Ellipse> balls = new List<Ellipse>();
        TextBlock zzz;
        Border toast;
        TextBlock toastText;
        Border panel;
        StackPanel panelContent;

        Border approvalCard;
        TextBlock approvalTitle, approvalDetail;
        StackPanel usagePanel;
        TextBlock costText, todayText, weekText;
        StackPanel sessionsPanel;
        Grid drop;
        Rectangle dropBorder;
        TextBlock dropHint;
        WrapPanel chips, quickChips;
        TextBox input;
        TextBlock placeholder;
        Border projectButton;
        TextBlock projectText;
        StackPanel answerPanel;
        TextBlock activityText;
        TextBox answerBox;
        ScrollViewer answerScroll;
        Border continueButton;

        // State
        Mode mode = (Mode)(-1);
        long modeSince;
        bool open, interactive, dragOver, demoOpen;
        long hoverSince, leftSince;
        readonly Dictionary<string, Mode> lastModes = new Dictionary<string, Mode>();
        bool firstPoll = true, pendingFlash;
        long demoStart;
        bool demoChomped;
        bool hiddenForFullscreen, gameMode;
        long blinkUntil, nextBlink, nextGlance, waveUntil, earUntil, happyUntil, petUntil, yawnUntil, nextYawn;
        string glance = "c";
        double mouth;
        bool fileDrag, nearDrag;
        long chompStart, chompUntil;
        readonly List<long> heartSpawns = new List<long>();
        readonly List<long> petTurns = new List<long>();
        double lastPetX = double.NaN;
        int lastPetDir;
        IntPtr hwnd;
        WinForms.NotifyIcon tray;
        readonly List<string> attachments = new List<string>();
        string project;
        bool answerVisible;
        string answerSessionId;
        List<Session> lastSessions = new List<Session>();
        Usage lastUsage = new Usage();
        string usageKey, sessionsKey;
        ApprovalRequest pendingApproval;
        bool wasLimited;
        int lastBellyContext = -1;
        long lastStatsLoad;
        string toolNow = "";
        int agentsNow, contextNow;
        string monitorKey = "";
        PetWindow pet;
        WinForms.ToolStripMenuItem petItem;
        bool pulling, buttonWasDown;
        Point pullFrom;
        readonly UsageForecast forecast = new UsageForecast();
        long lastUsageSample, forecastWarnedFor;
        readonly Dictionary<string, long> phoneSent = new Dictionary<string, long>();
        bool approvalKeys;

        public IslandWindow(bool demo)
        {
            demoOnStart = demo;
            Title = "Claude Island";
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = Brushes.Transparent;
            ResizeMode = ResizeMode.NoResize;
            ShowInTaskbar = false;
            ShowActivated = false;
            Topmost = true;
            Width = WindowW;
            Height = WindowH;
            Top = 0;
            Left = SystemParameters.PrimaryScreenWidth / 2 - WindowW / 2;
            AllowDrop = true;
            TextOptions.SetTextFormattingMode(this, TextFormattingMode.Ideal);
            TextOptions.SetTextRenderingMode(this, TextRenderingMode.ClearType);

            BuildVisualTree();
            WireRunner();
            SourceInitialized += OnSourceInitialized;
            Loaded += OnLoaded;
            Closed += (s, e) => { if (tray != null) tray.Dispose(); runner.Cancel(); };
            DragEnter += OnDragOver;
            DragOver += OnDragOver;
            DragLeave += (s, e) => { dragOver = false; fileDrag = false; Refresh(); };
            Drop += OnDrop;
        }

        // ── window plumbing ───────────────────────────────────────────────

        [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
        [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr h, int i, int v);
        [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
        [DllImport("user32.dll")] static extern bool GetCursorPos(out POINT p);
        [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder sb, int max);
        [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
        [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO info);
        [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
        [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LASTINPUTINFO info);
        [DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr h, int id, uint mods, uint vk);
        [DllImport("user32.dll")] static extern bool UnregisterHotKey(IntPtr h, int id);
        [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);

        [StructLayout(LayoutKind.Sequential)] struct POINT { public int X, Y; }
        [StructLayout(LayoutKind.Sequential)] struct RECT { public int Left, Top, Right, Bottom; }
        [StructLayout(LayoutKind.Sequential)]
        struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
        [StructLayout(LayoutKind.Sequential)] struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }

        const int GWL_EXSTYLE = -20;
        const int WS_EX_TRANSPARENT = 0x20, WS_EX_TOOLWINDOW = 0x80, WS_EX_LAYERED = 0x80000, WS_EX_NOACTIVATE = 0x8000000;
        static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
        const uint SWP_NOSIZE = 0x1, SWP_NOMOVE = 0x2, SWP_NOACTIVATE = 0x10;
        const int WM_HOTKEY = 0x0312, HotkeyOpen = 1, HotkeyShot = 2, HotkeyAllow = 3, HotkeyDeny = 4;
        const uint MOD_ALT = 0x1, MOD_CONTROL = 0x2, MOD_NOREPEAT = 0x4000;

        void OnSourceInitialized(object sender, EventArgs e)
        {
            hwnd = new WindowInteropHelper(this).Handle;
            int ex = GetWindowLong(hwnd, GWL_EXSTYLE);
            SetWindowLong(hwnd, GWL_EXSTYLE, ex | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_LAYERED | WS_EX_NOACTIVATE);
            // Global shortcuts: Ctrl+Alt+C opens the island, Ctrl+Alt+S feeds Clawd a screenshot.
            try
            {
                var source = HwndSource.FromHwnd(hwnd);
                if (source != null) source.AddHook(WndProc);
                RegisterHotKey(hwnd, HotkeyOpen, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, 0x43);
                RegisterHotKey(hwnd, HotkeyShot, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, 0x53);
                Closed += (s, a) => { UnregisterHotKey(hwnd, HotkeyOpen); UnregisterHotKey(hwnd, HotkeyShot); SetApprovalKeys(false); };
            }
            catch (Exception ex2) { AppPaths.LogError("hotkeys", ex2); }
        }

        IntPtr WndProc(IntPtr h, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            if (msg == WM_HOTKEY)
            {
                handled = true;
                int id = wParam.ToInt32();
                if (id == HotkeyOpen) Dispatcher.BeginInvoke(new Action(FocusComposer));
                else if (id == HotkeyShot) Dispatcher.BeginInvoke(new Action(TakeScreenshot));
                else if (id == HotkeyAllow) Dispatcher.BeginInvoke(new Action(() => AnswerApproval("allow")));
                else if (id == HotkeyDeny) Dispatcher.BeginInvoke(new Action(() => AnswerApproval("deny")));
            }
            return IntPtr.Zero;
        }

        /// <summary>Ctrl+Alt+J / Ctrl+Alt+N answer an approval - only claimed while one is waiting.</summary>
        void SetApprovalKeys(bool on)
        {
            if (on == approvalKeys || hwnd == IntPtr.Zero) return;
            approvalKeys = on;
            if (on)
            {
                RegisterHotKey(hwnd, HotkeyAllow, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, 0x4A);
                RegisterHotKey(hwnd, HotkeyDeny, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, 0x4E);
            }
            else
            {
                UnregisterHotKey(hwnd, HotkeyAllow);
                UnregisterHotKey(hwnd, HotkeyDeny);
            }
        }

        /// <summary>Click-through while closed; takes mouse, drops and keys when hovered or open.</summary>
        void SetInteractive(bool on)
        {
            if (on == interactive || hwnd == IntPtr.Zero) return;
            interactive = on;
            int ex = GetWindowLong(hwnd, GWL_EXSTYLE);
            if (on) ex &= ~(WS_EX_TRANSPARENT | WS_EX_NOACTIVATE);
            else ex |= WS_EX_TRANSPARENT | WS_EX_NOACTIVATE;
            SetWindowLong(hwnd, GWL_EXSTYLE, ex);
        }

        void OnLoaded(object sender, RoutedEventArgs e)
        {
            var poll = new DispatcherTimer(DispatcherPriority.Background) { Interval = TimeSpan.FromMilliseconds(250) };
            poll.Tick += (s, a) => Guard("poll", Poll);
            poll.Start();

            var life = new DispatcherTimer(DispatcherPriority.Input) { Interval = TimeSpan.FromMilliseconds(40) };
            life.Tick += (s, a) => Guard("animate", () => { CheckHover(); Animate(); });
            life.Start();

            // Re-assert "topmost" often: games and video players like to claim it too.
            var chores = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(500) };
            chores.Tick += (s, a) => Guard("chores", () => { KeepOnTop(); CheckFullscreen(); FollowMonitor(); });
            chores.Start();

            nextYawn = Clock.NowMs() + 25000;
            if (demoOnStart) StartDemo();
            Guard("poll", Poll);
            StartRendering();

            // Last and guarded: a problem with the tray icon must never keep the island hidden.
            try { SetupTray(); }
            catch (Exception ex) { AppPaths.LogError("tray", ex); }
            if (settings.PetOut) Dispatcher.BeginInvoke(new Action(() => Guard("pet", () => LetOut(false))), DispatcherPriority.ApplicationIdle);
        }

        /// <summary>Runs a timer step; a failure is logged once per kind, never fatal.</summary>
        readonly HashSet<string> loggedFailures = new HashSet<string>();
        void Guard(string what, Action step)
        {
            try { step(); }
            catch (Exception ex)
            {
                if (loggedFailures.Add(what + ex.GetType().Name)) AppPaths.LogError(what, ex);
            }
        }

        void KeepOnTop()
        {
            if (hwnd != IntPtr.Zero)
                SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
            if (pet != null) pet.KeepOnTop();
        }

        static long IdleMs()
        {
            var info = new LASTINPUTINFO { cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO)) };
            if (!GetLastInputInfo(ref info)) return 0;
            return (uint)Environment.TickCount - info.dwTime;
        }

        void CheckFullscreen()
        {
            bool fullscreen = false;
            try
            {
                IntPtr fg = GetForegroundWindow();
                if (fg != IntPtr.Zero && fg != hwnd)
                {
                    var cls = new StringBuilder(64);
                    GetClassName(fg, cls, cls.Capacity);
                    string c = cls.ToString();
                    if (c != "Progman" && c != "WorkerW" && c != "Shell_TrayWnd")
                    {
                        RECT r;
                        var mi = new MONITORINFO { cbSize = Marshal.SizeOf(typeof(MONITORINFO)) };
                        IntPtr mon = MonitorFromWindow(fg, 2);
                        if (GetWindowRect(fg, out r) && GetMonitorInfo(mon, ref mi))
                            fullscreen = r.Left <= mi.rcMonitor.Left && r.Top <= mi.rcMonitor.Top &&
                                         r.Right >= mi.rcMonitor.Right && r.Bottom >= mi.rcMonitor.Bottom;
                    }
                }
            }
            catch { }
            // In a game: shrink to just Clawd (focus mode), or hide if the user asked for that.
            bool game = fullscreen && !settings.HideInFullscreen;
            if (game != gameMode) { gameMode = game; Refresh(); }
            bool hide = fullscreen && settings.HideInFullscreen;
            if (hide == hiddenForFullscreen) return;
            hiddenForFullscreen = hide;
            canvas.BeginAnimation(OpacityProperty, new DoubleAnimation(hide ? 0 : 1, TimeSpan.FromMilliseconds(hide ? 180 : 320)));
        }

        /// <summary>Move to the top of the monitor the mouse is on.</summary>
        void FollowMonitor()
        {
            if (!settings.FollowMonitor || open || interactive) return;
            var screen = WinForms.Screen.FromPoint(WinForms.Cursor.Position);
            string key = screen.Bounds.ToString();
            if (key == monitorKey) return;
            bool first = monitorKey.Length == 0;
            monitorKey = key;
            var source = PresentationSource.FromVisual(this);
            if (source == null) return;
            Matrix fromDevice = source.CompositionTarget.TransformFromDevice;
            var tl = fromDevice.Transform(new Point(screen.Bounds.Left, screen.Bounds.Top));
            var sz = fromDevice.Transform(new Point(screen.Bounds.Width, screen.Bounds.Height));
            Left = tl.X + sz.X / 2 - WindowW / 2;
            Top = tl.Y;
            if (!first) canvas.BeginAnimation(OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(300)));
        }

        // ── visual tree ───────────────────────────────────────────────────

        static readonly FontFamily UiFont = new FontFamily("Segoe UI Variable Text, Segoe UI");
        static readonly FontFamily DisplayFont = new FontFamily("Segoe UI Variable Display, Segoe UI");

        static TextBlock Text(double size, Color color, FontWeight weight)
        {
            return new TextBlock { FontFamily = UiFont, FontSize = size, Foreground = Palette.Brush(color), FontWeight = weight };
        }

        void BuildVisualTree()
        {
            canvas = new Canvas { Width = WindowW, Height = WindowH };
            Content = canvas;

            // Nearly invisible (alpha 1) so a file dragged near Clawd reaches this
            // layered window; only shown while the mouse button is held nearby.
            catcher = new Rectangle { Width = 380, Height = 260, Fill = Palette.Brush(Color.FromArgb(1, 0, 0, 0)), Visibility = Visibility.Collapsed };
            canvas.Children.Add(catcher);

            glow = new DropShadowEffect { ShadowDepth = 0, BlurRadius = 30, Color = Colors.Black, Opacity = 0, RenderingBias = RenderingBias.Performance };
            glowShape = new Path { Fill = Brushes.Black, Effect = glow };
            body = new Path
            {
                Fill = Brushes.Black,
                Effect = new DropShadowEffect { ShadowDepth = 8, Direction = 270, BlurRadius = 26, Color = Colors.Black, Opacity = 0.55, RenderingBias = RenderingBias.Performance }
            };
            edge = new Path { Stroke = Palette.Brush(Color.FromArgb(22, 255, 255, 255)), StrokeThickness = 1 };
            canvas.Children.Add(glowShape);
            canvas.Children.Add(body);
            canvas.Children.Add(edge);

            BuildPanel();
            BuildRow();

            clawdBob = new TranslateTransform();
            clawd = new PixelSprite(ClawdArt.Cols, ClawdArt.Rows, ClawdPx) { RenderTransform = clawdBob };
            canvas.Children.Add(clawd);
            prop = new PixelSprite(6, 7, 4) { Visibility = Visibility.Collapsed };
            canvas.Children.Add(prop);
            sweat = new PixelSprite(3, 4, 3) { Visibility = Visibility.Collapsed };
            sweat.Show(ClawdArt.Drop, Palette.Clawd);
            canvas.Children.Add(sweat);
            for (int i = 0; i < 3; i++)
            {
                var b = new PixelSprite(ClawdArt.Cols, 6, 2.4) { Visibility = Visibility.Collapsed };
                babies.Add(b);
                canvas.Children.Add(b);
            }
            for (int i = 0; i < 5; i++)
            {
                var h = new PixelSprite(5, 4, 3) { Visibility = Visibility.Collapsed };
                h.Show(ClawdArt.Heart, Palette.Clawd);
                hearts.Add(h);
                canvas.Children.Add(h);
            }
            var ballColors = new[] { Palette.Busy, Palette.Ready, Palette.Waiting };
            for (int i = 0; i < 3; i++)
            {
                var e = new Ellipse { Width = 6, Height = 6, Fill = Palette.Brush(ballColors[i]), Visibility = Visibility.Collapsed, IsHitTestVisible = false };
                balls.Add(e);
                canvas.Children.Add(e);
            }
            zzz = Text(11, Palette.Secondary, FontWeights.Bold);
            zzz.Text = "z";
            zzz.Opacity = 0;
            zzz.IsHitTestVisible = false;
            canvas.Children.Add(zzz);

            toastText = Text(12.5, Palette.Text, FontWeights.Normal);
            toastText.TextWrapping = TextWrapping.Wrap;
            toastText.MaxWidth = 380;
            toast = new Border
            {
                Child = toastText, Background = Palette.Brush(Color.FromArgb(240, 16, 16, 18)), BorderBrush = Palette.Brush(Palette.ControlLine),
                BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(12), Padding = new Thickness(12, 8, 12, 9), Opacity = 0, IsHitTestVisible = false,
                Effect = new DropShadowEffect { ShadowDepth = 4, Direction = 270, BlurRadius = 16, Opacity = 0.5 }
            };
            canvas.Children.Add(toast);
        }

        void BuildRow()
        {
            row = new Grid { Height = RowH };
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(ClawdArt.Cols * ClawdPx + 64) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            canvas.Children.Add(row);

            left = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
            dotGlow = new DropShadowEffect { ShadowDepth = 0, BlurRadius = 10, Color = Palette.Ready, Opacity = 0.9 };
            dot = new Ellipse { Width = 8, Height = 8, Fill = Palette.Brush(Palette.Ready), Effect = dotGlow, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 9, 0), RenderTransformOrigin = new Point(0.5, 0.5), RenderTransform = new ScaleTransform(1, 1) };
            label = new TextBlock { FontFamily = DisplayFont, FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Palette.Brush(Palette.Text), VerticalAlignment = VerticalAlignment.Center };
            timeLabel = new TextBlock { FontFamily = DisplayFont, FontSize = 14, FontWeight = FontWeights.Medium, Foreground = Palette.Brush(Palette.Secondary), Margin = new Thickness(8, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center };
            Typography.SetNumeralAlignment(timeLabel, FontNumeralAlignment.Tabular);
            // One tiny Clawd per session when more than one is open.
            minis = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(10, 2, 0, 0), VerticalAlignment = VerticalAlignment.Center };
            left.Children.Add(dot);
            left.Children.Add(label);
            left.Children.Add(timeLabel);
            left.Children.Add(minis);
            row.Children.Add(left);

            usageView = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Center };
            usageKind = Text(10.5, Palette.Faint, FontWeights.SemiBold);
            usageKind.VerticalAlignment = VerticalAlignment.Center;
            usageKind.Margin = new Thickness(0, 0, 8, 0);
            var ring = new Grid { Width = 18, Height = 18, VerticalAlignment = VerticalAlignment.Center };
            ring.Children.Add(new Ellipse { Stroke = Palette.Brush(Color.FromRgb(38, 38, 43)), StrokeThickness = 2.6 });
            ringValue = new Path { StrokeThickness = 2.6, StrokeStartLineCap = PenLineCap.Round, StrokeEndLineCap = PenLineCap.Round, Stroke = Palette.Brush(Palette.Ready) };
            ring.Children.Add(ringValue);
            usagePct = new TextBlock { FontFamily = DisplayFont, FontSize = 13, FontWeight = FontWeights.Medium, Foreground = Palette.Brush(Color.FromRgb(201, 201, 207)), Margin = new Thickness(8, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center };
            Typography.SetNumeralAlignment(usagePct, FontNumeralAlignment.Tabular);
            usageView.Children.Add(usageKind);
            usageView.Children.Add(ring);
            usageView.Children.Add(usagePct);
            Grid.SetColumn(usageView, 2);
            row.Children.Add(usageView);
        }

        static Geometry RingArc(double pct)
        {
            double p = Math.Max(0.001, Math.Min(99.9, pct)) / 100;
            double r = 7.7, c = 9;
            double a = p * 2 * Math.PI;
            var g = new StreamGeometry();
            using (var ctx = g.Open())
            {
                ctx.BeginFigure(new Point(c, c - r), false, false);
                ctx.ArcTo(new Point(c + r * Math.Sin(a), c - r * Math.Cos(a)), new Size(r, r), 0, p > 0.5, SweepDirection.Clockwise, true, false);
            }
            g.Freeze();
            return g;
        }

        void BuildPanel()
        {
            panelContent = new StackPanel { Margin = new Thickness(18, 16, 18, 18) };
            panel = new Border
            {
                CornerRadius = new CornerRadius(22), Background = Palette.Brush(Palette.Panel), BorderBrush = Palette.Brush(Palette.PanelLine),
                BorderThickness = new Thickness(1), Child = panelContent, Opacity = 0, ClipToBounds = true
            };
            canvas.Children.Add(panel);

            // Approval card (only while Claude asks for permission).
            var card = new StackPanel();
            approvalTitle = Text(12, Palette.Waiting, FontWeights.SemiBold);
            approvalDetail = Text(14, Palette.Text, FontWeights.SemiBold);
            approvalDetail.TextWrapping = TextWrapping.Wrap;
            approvalDetail.Margin = new Thickness(0, 4, 0, 10);
            var approvalButtons = new StackPanel { Orientation = Orientation.Horizontal };
            var allow = MakeButton("Erlauben", true, () => AnswerApproval("allow"));
            var deny = MakeButton("Ablehnen", false, () => AnswerApproval("deny"));
            var inTerminal = MakeButton("Im Terminal entscheiden", false, () => AnswerApproval("terminal"));
            deny.Margin = inTerminal.Margin = new Thickness(8, 0, 0, 0);
            approvalButtons.Children.Add(allow);
            approvalButtons.Children.Add(deny);
            approvalButtons.Children.Add(inTerminal);
            var keysHint = Text(11.5, Palette.Secondary, FontWeights.Normal);
            keysHint.Text = "Von überall: Strg+Alt+J erlauben · Strg+Alt+N ablehnen";
            keysHint.Margin = new Thickness(0, 9, 0, 0);
            card.Children.Add(approvalTitle);
            card.Children.Add(approvalDetail);
            card.Children.Add(approvalButtons);
            card.Children.Add(keysHint);
            approvalCard = new Border
            {
                Child = card, CornerRadius = new CornerRadius(14), Background = Palette.Brush(Color.FromRgb(30, 24, 12)),
                BorderBrush = Palette.Brush(Palette.Waiting), BorderThickness = new Thickness(1.5), Padding = new Thickness(14, 12, 14, 14),
                Margin = new Thickness(0, 0, 0, 16), Visibility = Visibility.Collapsed
            };
            panelContent.Children.Add(approvalCard);

            panelContent.Children.Add(SectionTitle("Nutzungslimit"));
            usagePanel = new StackPanel { Margin = new Thickness(0, 2, 0, 4) };
            panelContent.Children.Add(usagePanel);
            costText = Text(12, Palette.Secondary, FontWeights.Normal);
            costText.Margin = new Thickness(0, 2, 0, 0);
            panelContent.Children.Add(costText);

            var todayTitle = SectionTitle("Heute");
            todayTitle.Margin = new Thickness(0, 14, 0, 8);
            panelContent.Children.Add(todayTitle);
            todayText = Text(12.5, Palette.Text, FontWeights.Normal);
            todayText.TextWrapping = TextWrapping.Wrap;
            weekText = Text(12, Palette.Secondary, FontWeights.Normal);
            weekText.TextWrapping = TextWrapping.Wrap;
            weekText.Margin = new Thickness(0, 2, 0, 0);
            var today = new StackPanel { Margin = new Thickness(0, 0, 0, 14) };
            today.Children.Add(todayText);
            today.Children.Add(weekText);
            panelContent.Children.Add(today);

            panelContent.Children.Add(SectionTitle("Sitzungen"));
            sessionsPanel = new StackPanel { Margin = new Thickness(0, 0, 0, 14) };
            panelContent.Children.Add(sessionsPanel);

            panelContent.Children.Add(SectionTitle("Frag Claude oder gib einen Befehl"));
            quickChips = new WrapPanel { Margin = new Thickness(0, 0, 0, 8) };
            foreach (var q in settings.Quick)
            {
                var cmd = q;
                var t = Text(12, Color.FromRgb(232, 232, 236), FontWeights.Normal);
                t.Text = cmd.Label;
                var chip = MakeButton(t, false, () => { input.Text = cmd.Prompt; Send(cmd.Edits); });
                chip.CornerRadius = new CornerRadius(14);
                chip.Padding = new Thickness(10, 4, 10, 5);
                chip.Margin = new Thickness(0, 0, 6, 6);
                ToolTipService.SetToolTip(chip, cmd.Prompt);
                quickChips.Children.Add(chip);
            }
            panelContent.Children.Add(quickChips);

            drop = new Grid();
            dropBorder = new Rectangle
            {
                RadiusX = 16, RadiusY = 16, StrokeThickness = 1.5, StrokeDashArray = new DoubleCollection { 4, 3 },
                Stroke = Palette.Brush(Color.FromRgb(52, 52, 58)), Fill = Palette.Brush(Palette.Field)
            };
            drop.Children.Add(dropBorder);
            var composer = new StackPanel { Margin = new Thickness(14, 12, 14, 12) };
            drop.Children.Add(composer);

            dropHint = Text(12, Palette.Faint, FontWeights.Normal);
            composer.Children.Add(dropHint);
            chips = new WrapPanel { Margin = new Thickness(0, 4, 0, 0) };
            composer.Children.Add(chips);

            var inputHost = new Grid { Margin = new Thickness(0, 8, 0, 0) };
            input = new TextBox
            {
                FontFamily = UiFont, FontSize = 14, Foreground = Palette.Brush(Palette.Text), CaretBrush = Palette.Brush(Palette.Clawd),
                Background = Brushes.Transparent, BorderThickness = new Thickness(0), AcceptsReturn = true, TextWrapping = TextWrapping.Wrap,
                MinHeight = 22, MaxHeight = 96, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Padding = new Thickness(-2, 0, 0, 0),
                SelectionBrush = Palette.Brush(Palette.Clawd)
            };
            placeholder = Text(14, Color.FromRgb(95, 95, 104), FontWeights.Normal);
            placeholder.Text = "Was soll Claude tun? Zum Beispiel: Was steht in der PDF zur Kündigungsfrist?";
            placeholder.IsHitTestVisible = false;
            placeholder.TextTrimming = TextTrimming.CharacterEllipsis;
            input.TextChanged += (s, e) => { placeholder.Visibility = input.Text.Length == 0 ? Visibility.Visible : Visibility.Collapsed; Refresh(); };
            input.PreviewKeyDown += OnInputKey;
            inputHost.Children.Add(placeholder);
            inputHost.Children.Add(input);
            composer.Children.Add(inputHost);

            var actions = new DockPanel { Margin = new Thickness(0, 12, 0, 0), LastChildFill = false };
            projectText = Text(12.5, Color.FromRgb(232, 232, 236), FontWeights.SemiBold);
            projectButton = MakeButton(projectText, false, ShowProjectMenu);
            DockPanel.SetDock(projectButton, Dock.Left);
            actions.Children.Add(projectButton);
            var ask = MakeButton("Fragen  ↵", true, () => Send(false));
            var run = MakeButton("Ausführen", false, () => Send(true));
            var term = MakeButton("Terminal", false, () => SafeRun(() => ClaudeRunner.OpenTerminal(CurrentProject(), null)));
            foreach (var b in new[] { ask, run, term })
            {
                DockPanel.SetDock(b, Dock.Right);
                b.Margin = new Thickness(8, 0, 0, 0);
                actions.Children.Add(b);
            }
            ToolTipService.SetToolTip(ask, "Claude antwortet hier (liest nur, ändert nichts)");
            ToolTipService.SetToolTip(run, "Claude darf im Projekt Dateien bearbeiten und Befehle ausführen (Strg+Enter)");
            ToolTipService.SetToolTip(term, "Claude Code im Projektordner öffnen");
            composer.Children.Add(actions);

            var feeders = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 8, 0, 0) };
            var clip = MakeButton("Zwischenablage", false, FeedClipboard);
            var shot = MakeButton("Bildschirmfoto", false, TakeScreenshot);
            var voice = MakeButton("Diktieren", false, Dictate);
            shot.Margin = voice.Margin = new Thickness(8, 0, 0, 0);
            ToolTipService.SetToolTip(clip, "Text, Bild oder Dateien aus der Zwischenablage an Clawd verfüttern");
            ToolTipService.SetToolTip(shot, "Bildschirmbereich auswählen (Strg+Alt+S)");
            ToolTipService.SetToolTip(voice, "Frage sprechen – nutzt die Windows-Spracheingabe (Win+H)");
            feeders.Children.Add(clip);
            feeders.Children.Add(shot);
            feeders.Children.Add(voice);
            composer.Children.Add(feeders);
            panelContent.Children.Add(drop);

            answerPanel = new StackPanel { Margin = new Thickness(0, 14, 0, 0), Visibility = Visibility.Collapsed };
            answerPanel.Children.Add(new Border { Height = 1, Background = Palette.Brush(Palette.PanelLine), Margin = new Thickness(0, 0, 0, 12) });
            activityText = Text(12, Palette.Clawd, FontWeights.SemiBold);
            answerPanel.Children.Add(activityText);
            answerBox = new TextBox
            {
                FontFamily = UiFont, FontSize = 13.5, Foreground = Palette.Brush(Color.FromRgb(236, 236, 240)), Background = Brushes.Transparent,
                BorderThickness = new Thickness(0), IsReadOnly = true, TextWrapping = TextWrapping.Wrap, Padding = new Thickness(-2, 0, 0, 0),
                SelectionBrush = Palette.Brush(Palette.Clawd)
            };
            answerScroll = new ScrollViewer { Content = answerBox, MaxHeight = 200, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Margin = new Thickness(0, 6, 0, 0) };
            answerPanel.Children.Add(answerScroll);
            var answerActions = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 12, 0, 0) };
            continueButton = MakeButton("Im Terminal weiter", false, () => SafeRun(() => ClaudeRunner.OpenTerminal(CurrentProject(), answerSessionId)));
            var copy = MakeButton("Kopieren", false, () => SafeRun(() => Clipboard.SetText(answerBox.Text)));
            var clear = MakeButton("Schließen", false, ClearComposer);
            copy.Margin = clear.Margin = new Thickness(8, 0, 0, 0);
            answerActions.Children.Add(continueButton);
            answerActions.Children.Add(copy);
            answerActions.Children.Add(clear);
            answerPanel.Children.Add(answerActions);
            panelContent.Children.Add(answerPanel);

            UpdateDropHint();
            UpdateProjectLabel();
        }

        static TextBlock SectionTitle(string text)
        {
            var t = Text(11, Palette.Faint, FontWeights.SemiBold);
            t.Text = text.ToUpperInvariant();
            t.Margin = new Thickness(0, 0, 0, 8);
            return t;
        }

        static Border MakeButton(string text, bool primary, Action onClick)
        {
            var t = Text(12.5, primary ? Colors.White : Color.FromRgb(232, 232, 236), FontWeights.SemiBold);
            t.Text = text;
            return MakeButton(t, primary, onClick);
        }

        static Border MakeButton(TextBlock content, bool primary, Action onClick)
        {
            var fill = new SolidColorBrush(primary ? Palette.Clawd : Palette.Control);
            Color normal = primary ? Palette.Clawd : Palette.Control;
            Color hover = primary ? Palette.ClawdHover : Palette.ControlHover;
            var b = new Border
            {
                Child = content, Background = fill, CornerRadius = new CornerRadius(10), Padding = new Thickness(12, 6, 12, 7), Cursor = Cursors.Hand,
                BorderThickness = new Thickness(1), BorderBrush = Palette.Brush(primary ? Palette.Clawd : Palette.ControlLine)
            };
            b.MouseEnter += (s, e) => fill.BeginAnimation(SolidColorBrush.ColorProperty, new ColorAnimation(hover, TimeSpan.FromMilliseconds(120)));
            b.MouseLeave += (s, e) => fill.BeginAnimation(SolidColorBrush.ColorProperty, new ColorAnimation(normal, TimeSpan.FromMilliseconds(160)));
            b.MouseLeftButtonUp += (s, e) => { e.Handled = true; onClick(); };
            return b;
        }

        void SafeRun(Action action)
        {
            try { action(); }
            catch (Exception ex)
            {
                AppPaths.LogError("action", ex);
                ShowAnswer();
                activityText.Foreground = Palette.Brush(Palette.Error);
                activityText.Text = "Das hat nicht geklappt: " + ex.Message;
            }
        }

        // ── toast (a speech bubble under the island) ─────────────────────

        long toastUntil;

        void Toast(string text, double seconds)
        {
            toastText.Text = text;
            toastUntil = Clock.NowMs() + (long)(seconds * 1000);
            toast.BeginAnimation(OpacityProperty, new DoubleAnimation(1, TimeSpan.FromMilliseconds(220)));
            LayoutToast();
        }

        // ── Clawd lives ───────────────────────────────────────────────────

        static string HatForToday(Settings s)
        {
            var d = DateTime.Today;
            if (d.Month == 12 && d.Day <= 26) return "santa";
            if ((d.Month == 12 && d.Day == 31) || (d.Month == 1 && d.Day == 1)) return "party";
            if (s.Birthday.Length == 5 && d.ToString("MM-dd") == s.Birthday) return "party";
            return "";
        }

        /// <summary>Picks Clawd's look, his props and the ambient motions; every 40 ms.</summary>
        void Animate()
        {
            long now = Clock.NowMs();
            if (now > nextBlink) { blinkUntil = now + 130; nextBlink = now + 2600 + random.Next(3200); }
            bool blink = now < blinkUntil;
            long since = now - modeSince;
            long idle = IdleMs();
            int hour = DateTime.Now.Hour;
            var look = new Look { Hat = HatForToday(settings) };
            Color color = Palette.Clawd;
            string[] propArt = null;
            double bob = 0;
            bool juggling = false;

            // Mouth: chomp sequence after a drop, otherwise open wider the closer a file gets.
            double mouthTarget = 0;
            if (chompStart > 0)
            {
                long t = now - chompStart;
                if (t < 90) { mouthTarget = ClawdArt.MaxMouth; look.Food = true; }
                else if (t < 210) mouthTarget = 0;
                else if (t < 330) mouthTarget = 2;
                else if (t < 450) mouthTarget = 0;
                else if (t < 570) mouthTarget = 2;
                else if (t < ChompMs) mouthTarget = 0;
                else
                {
                    chompStart = 0;
                    happyUntil = now + 800;
                    hop.Velocity -= 240;
                    StartRendering();
                    if (attachments.Count > 0) FocusComposer();
                    Refresh();
                }
                mouth = mouthTarget;
            }
            else
            {
                double dt = demoStart > 0 ? (now - demoStart) / 1000.0 : -1;
                if (dt >= 20.0 && dt < 21.6) mouthTarget = 1.6 + (dt - 20.0) / 1.6 * (ClawdArt.MaxMouth - 1.6);
                else if (dt >= 21.6 && !demoChomped) { demoChomped = true; chompStart = now; }
                if (fileDrag) mouthTarget = Math.Max(1.6, Math.Min(ClawdArt.MaxMouth, (230 - DistanceToMouth()) / 160 * ClawdArt.MaxMouth));
                if (now < yawnUntil) mouthTarget = 2;
                mouth += (mouthTarget - mouth) * 0.35;
                if (Math.Abs(mouth - mouthTarget) < 0.05) mouth = mouthTarget;
            }
            look.Mouth = (int)Math.Round(mouth);
            bool demoDrag = demoStart > 0 && now - demoStart >= 20000 && now - demoStart < 21600;
            bool bored = mode == Mode.Ready && !open && idle > 3 * 60 * 1000;

            if (look.Mouth > 0 || fileDrag || chompStart > 0)
            {
                look.Arms = fileDrag || demoDrag || look.Food ? "up" : "side";
                look.Eyes = now < yawnUntil ? "shut" : "c";
            }
            else if (now < petUntil) { look.Happy = true; look.Blush = true; }
            else if (now < happyUntil) look.Happy = true;
            else if (now < earUntil) { look.Arms = "wave"; look.Eyes = blink ? "shut" : "c"; }
            else if (dragOver) look.Arms = "up";
            else if (now < waveUntil) { look.Arms = (now / 180) % 2 == 1 ? "wave" : "side"; look.Eyes = blink ? "shut" : "c"; }
            else if (bored && idle > 15 * 60 * 1000) { look.Eyes = "shut"; color = Color.FromRgb(184, 104, 78); }
            else if (bored && idle > 8 * 60 * 1000)
            {
                // Push-ups at the screen edge.
                bool down = (now / 450) % 2 == 1;
                look.Arms = down ? "down" : "side";
                bob = down ? 4 : 0;
            }
            else if (bored)
            {
                juggling = true;
                look.Arms = (now / 300) % 2 == 1 ? "up" : "side";
            }
            else
            {
                switch (mode)
                {
                    case Mode.Busy:
                    {
                        bool f = (now / 170) % 2 == 1;
                        look.Eyes = blink ? "shut" : new[] { "l", "c", "r", "c" }[(now / 900) % 4];
                        look.Arms = f ? "down" : "side";
                        look.LegsB = f;
                        break;
                    }
                    case Mode.Waiting:
                        look.Eyes = blink ? "shut" : "c";
                        look.Arms = (now / 260) % 2 == 1 ? "up" : "side";
                        bob = -Math.Abs(Math.Sin(now / 260.0)) * 3;
                        break;
                    case Mode.Done:
                        look.Happy = true;
                        look.Arms = since < 900 ? "up" : "side";
                        break;
                    case Mode.Error:
                        look.Eyes = "shut";
                        color = Color.FromRgb(168, 87, 74);
                        break;
                    case Mode.None:
                        look.Eyes = "shut";
                        color = Color.FromRgb(154, 90, 70);
                        break;
                    default:
                        look.Eyes = blink ? "shut" : EyesTowardMouse(now);
                        // Late at night he yawns now and then.
                        if (hour < 5 && now > nextYawn) { yawnUntil = now + 900; nextYawn = now + 20000 + random.Next(15000); }
                        break;
                }
            }

            // Costume for the tool Claude is using.
            if (mode == Mode.Busy && chompStart == 0 && look.Mouth == 0)
            {
                switch (toolNow)
                {
                    case "Read": case "Grep": case "Glob": case "NotebookRead": case "LS": look.Glasses = true; break;
                    case "Edit": case "Write": case "MultiEdit": case "NotebookEdit": propArt = ClawdArt.Pencil; break;
                    case "Bash": case "PowerShell": propArt = ClawdArt.Keyboard; break;
                    case "WebSearch": case "WebFetch": propArt = ClawdArt.Magnifier; look.Glasses = true; break;
                }
            }
            else if (mode == Mode.Ready && !bored && hour >= 6 && hour < 10) propArt = ClawdArt.Cup;
            if (propArt == null && DateTime.Today.Month == 10 && DateTime.Today.Day >= 24) propArt = ClawdArt.Pumpkin;

            look.Belly = contextNow >= 80 ? 2 : contextNow >= 50 ? 1 : 0;
            clawd.Show(ClawdArt.Pose(look), color);
            clawdBob.Y = bob;
            // Out on the desktop: the island stays empty, except when a file comes to be eaten.
            bool away = pet != null && !fileDrag && chompStart == 0 && !dragOver && look.Mouth == 0;
            if (pet != null) pet.Sync(mode, look.Hat, look.Glasses, propArt, color, gameMode || hiddenForFullscreen);
            clawd.Visibility = away ? Visibility.Hidden : Visibility.Visible;

            double cx = Canvas.GetLeft(clawd), cy = Canvas.GetTop(clawd);
            if (double.IsNaN(cx) || double.IsNaN(cy)) return;

            // Prop in his right hand.
            if (propArt != null && !gameMode && !away)
            {
                prop.Show(propArt, Palette.Clawd);
                prop.Visibility = Visibility.Visible;
                Canvas.SetLeft(prop, cx + clawd.Width + 2);
                Canvas.SetTop(prop, cy + 3 * ClawdPx - prop.Height / 2 + bob);
            }
            else prop.Visibility = Visibility.Collapsed;

            // Sweat when the limit is nearly used up.
            double headline = lastUsage.FiveHour >= 0 ? lastUsage.FiveHour : lastUsage.SevenDay;
            if (headline >= 85 && !away)
            {
                sweat.Visibility = Visibility.Visible;
                double p = (now % 900) / 900.0;
                Canvas.SetLeft(sweat, cx + 1);
                Canvas.SetTop(sweat, cy + ClawdPx + p * 10);
                sweat.Opacity = 1 - p;
            }
            else sweat.Visibility = Visibility.Collapsed;

            // Baby Clawds for sub-agents, hopping under the island.
            for (int i = 0; i < babies.Count; i++)
            {
                var b = babies[i];
                if (i < agentsNow && !gameMode)
                {
                    bool f = ((now / 200) + i) % 2 == 0;
                    b.Show(ClawdArt.Pose(new Look { Arms = f ? "down" : "side", LegsB = f, Eyes = new[] { "l", "c", "r" }[(i + now / 700) % 3] }), Palette.Clawd);
                    b.Visibility = Visibility.Visible;
                    double side = i % 2 == 0 ? -1 : 1;
                    double bx = cx + clawd.Width / 2 + side * (clawd.Width / 2 + 10 + (i / 2) * 48) - (side < 0 ? b.Width : 0);
                    Canvas.SetLeft(b, bx);
                    Canvas.SetTop(b, Math.Min(height.Value, RowH) + 6 - Math.Abs(Math.Sin(now / 230.0 + i)) * 5);
                }
                else b.Visibility = Visibility.Collapsed;
            }

            // Juggling when you have been away for a while.
            for (int i = 0; i < balls.Count; i++)
            {
                var ball = balls[i];
                if (juggling && !away)
                {
                    double ph = ((now / 1100.0) + i / 3.0) % 1.0;
                    double x = cx + clawd.Width / 2 + Math.Cos(ph * 2 * Math.PI) * 30 - 3;
                    double y = cy - 2 - Math.Abs(Math.Sin(ph * 2 * Math.PI)) * 14 + 6;
                    Canvas.SetLeft(ball, x);
                    Canvas.SetTop(ball, Math.Max(1, y));
                    ball.Visibility = Visibility.Visible;
                }
                else ball.Visibility = Visibility.Collapsed;
            }

            // Hearts rise when he is petted.
            heartSpawns.RemoveAll(t => now - t > 1400);
            for (int i = 0; i < hearts.Count; i++)
            {
                var h = hearts[i];
                if (i < heartSpawns.Count)
                {
                    double age = (now - heartSpawns[i]) / 1400.0;
                    h.Visibility = Visibility.Visible;
                    h.Opacity = 1 - age;
                    Canvas.SetLeft(h, cx + clawd.Width / 2 - 8 + (i - 2) * 16 + Math.Sin(age * 6 + i) * 4);
                    Canvas.SetTop(h, cy + 4 - age * 22);
                }
                else h.Visibility = Visibility.Collapsed;
            }
            if (now < petUntil && heartSpawns.Count < hearts.Count && (heartSpawns.Count == 0 || now - heartSpawns[heartSpawns.Count - 1] > 260))
                heartSpawns.Add(now);

            // Asleep: z's drift up.
            bool sleeping = !away && (mode == Mode.None || (bored && idle > 15 * 60 * 1000));
            if (sleeping)
            {
                double p = (now % 2400) / 2400.0;
                zzz.Opacity = p < 0.3 ? p / 0.3 * 0.9 : 0.9 * (1 - (p - 0.3) / 0.7);
                Canvas.SetLeft(zzz, cx + clawd.Width - 6 + p * 10);
                Canvas.SetTop(zzz, cy + 2 - p * 14);
            }
            else zzz.Opacity = 0;

            double pulse = mode == Mode.Busy ? 1 - 0.3 * (0.5 + 0.5 * Math.Sin(now / 190.0))
                         : mode == Mode.Waiting ? 1 - 0.3 * (0.5 + 0.5 * Math.Sin(now / 110.0)) : 1;
            var st = (ScaleTransform)dot.RenderTransform;
            st.ScaleX = st.ScaleY = pulse;

            if (toastUntil > 0 && now > toastUntil)
            {
                toastUntil = 0;
                toast.BeginAnimation(OpacityProperty, new DoubleAnimation(0, TimeSpan.FromMilliseconds(300)));
            }
        }

        string EyesTowardMouse(long now)
        {
            POINT p;
            if (GetCursorPos(out p) && PresentationSource.FromVisual(canvas) != null)
            {
                Point local = canvas.PointFromScreen(new Point(p.X, p.Y));
                double dx = local.X - (Canvas.GetLeft(clawd) + clawd.Width / 2);
                double dy = local.Y - Canvas.GetTop(clawd);
                if (Math.Abs(dx) < 1500 && dy < 1200)
                    return dx < -50 ? "l" : dx > 50 ? "r" : "c";
            }
            if (now > nextGlance)
            {
                glance = new[] { "l", "c", "r", "c", "c" }[random.Next(5)];
                nextGlance = now + 1800 + random.Next(3500);
            }
            return glance;
        }

        // ── state → visuals ──────────────────────────────────────────────

        void Poll()
        {
            long now = Clock.NowMs();
            List<Session> sessions;
            Usage usage;
            ApprovalRequest request;
            double demoT = -1;
            if (demoStart > 0)
            {
                demoT = (now - demoStart) / 1000.0;
                if (demoT > Demo.Length) { demoStart = 0; demoOpen = false; demoT = -1; }
            }
            if (demoT >= 0)
            {
                sessions = Demo.At(demoT, demoStart);
                usage = Demo.FakeUsage(demoStart);
                request = Demo.Request(demoT, demoStart);
                demoOpen = demoT > 15.4 && demoT < 19.6;
            }
            else
            {
                sessions = store.Load();
                usage = Usage.Load();
                var pending = PermissionBroker.Pending();
                request = pending.Count > 0 ? pending[0] : null;
            }
            lastSessions = sessions;
            lastUsage = usage;
            if (demoT < 0 && usage.FiveHour >= 0 && usage.Updated != lastUsageSample)
            {
                lastUsageSample = usage.Updated;
                forecast.Add(usage.Updated > 0 ? usage.Updated : now, usage.FiveHour, usage.FiveHourResets);
                long full = forecast.FullAt(now);
                if (full > 0 && full - now < 30 * 60 * 1000 && usage.FiveHourResets != forecastWarnedFor)
                {
                    forecastWarnedFor = usage.FiveHourResets;
                    Toast("Achtung: Bei diesem Tempo ist dein Limit um " + LocalTime(full) + " voll.", 7);
                }
            }

            foreach (var s in sessions)
            {
                Mode m = SessionStore.DisplayMode(s, now);
                Mode prev;
                bool known = lastModes.TryGetValue(s.Id, out prev);
                lastModes[s.Id] = m;
                if (firstPoll || !known || prev == m) continue;
                if (m == Mode.Done)
                {
                    pendingFlash = true;
                    if (settings.Sound) System.Media.SystemSounds.Asterisk.Play();
                    if (s.Summary.Length > 0) Toast(s.Project + ": " + s.Summary, 7);
                    Notify("Claude ist fertig – " + s.Project, s.Summary.Length > 0 ? s.Summary : "Wartet auf deinen nächsten Befehl.");
                    ToPhone("done:" + s.Id, "Claude ist fertig – " + s.Project, s.Summary.Length > 0 ? s.Summary : "Wartet auf deinen nächsten Befehl.", "white_check_mark", 3);
                }
                else if (m == Mode.Waiting)
                {
                    shake.Velocity += 480;
                    StartRendering();
                    if (settings.Sound) System.Media.SystemSounds.Exclamation.Play();
                    Notify("Claude braucht dich – " + s.Project, s.Detail.Length > 0 ? "Freigabe: " + s.Detail : "Bitte antworte im Terminal.");
                    if (request == null) ToPhone("wait:" + s.Id, "Claude braucht dich – " + s.Project, s.Detail.Length > 0 ? "Freigabe: " + s.Detail : "Bitte antworte im Terminal.", "warning", 4);
                }
            }
            firstPoll = false;

            Mode overall = sessions.Count > 0 ? Mode.Ready : Mode.None;
            Func<Mode, int> count = x => sessions.Count(s => SessionStore.DisplayMode(s, now) == x);
            int waiting = count(Mode.Waiting), busy = count(Mode.Busy), done = count(Mode.Done), error = count(Mode.Error);
            if (waiting > 0 || request != null) overall = Mode.Waiting;
            else if (busy > 0) overall = Mode.Busy;
            else if (error > 0) overall = Mode.Error;
            else if (done > 0) overall = Mode.Done;

            var busySession = sessions.FirstOrDefault(s => SessionStore.DisplayMode(s, now) == Mode.Busy);
            toolNow = busySession != null ? busySession.Tool : "";
            agentsNow = Math.Min(3, sessions.Sum(s => s.Agents));
            int ctx = sessions.Select(s => s.Context).DefaultIfEmpty(-1).Max();
            if (lastBellyContext >= 0 && lastBellyContext < 80 && ctx >= 80)
            {
                // Burp!
                yawnUntil = now + 500;
                Toast("Bäuerchen! Kontext " + ctx + " % voll – /compact schafft wieder Platz.", 6);
            }
            lastBellyContext = ctx;
            contextNow = Math.Max(0, ctx);

            // Limit reached / released.
            double headline = usage.FiveHour >= 0 ? usage.FiveHour : usage.SevenDay;
            bool limited = headline >= 99.5;
            if (wasLimited && !limited && usage.Known)
            {
                Celebrate();
                Toast("Limit wieder frei – weiter geht's!", 5);
            }
            wasLimited = limited;

            string text, time = "";
            switch (overall)
            {
                case Mode.Waiting: text = "Braucht dich"; break;
                case Mode.Busy:
                {
                    long longest = sessions.Where(s => SessionStore.DisplayMode(s, now) == Mode.Busy && s.TurnStart > 0)
                                           .Select(s => now - s.TurnStart).DefaultIfEmpty(0).Max();
                    text = "Arbeitet";
                    time = Clock.Duration(longest);
                    var planned = sessions.FirstOrDefault(s => SessionStore.DisplayMode(s, now) == Mode.Busy && s.TodoTotal > 0);
                    if (planned != null) time += " · " + planned.TodoDone + "/" + planned.TodoTotal;
                    break;
                }
                case Mode.Done:
                {
                    var s = sessions.First(x => SessionStore.DisplayMode(x, now) == Mode.Done);
                    text = "Fertig";
                    if (s.Duration > 0) time = Clock.Duration(s.Duration);
                    break;
                }
                case Mode.Error: text = "Fehler"; break;
                case Mode.Ready: text = DateTime.Now.Hour >= 1 && DateTime.Now.Hour < 5 ? "Bereit · geh schlafen" : "Bereit"; break;
                default: text = "Schläft"; break;
            }
            if (limited && overall != Mode.Busy && overall != Mode.Waiting)
            {
                long reset = usage.FiveHour >= 99.5 ? usage.FiveHourResets : usage.SevenDayResets;
                text = "Limit erreicht";
                time = reset > 0 ? "frei in " + Countdown(reset) : "";
            }

            ApplyMode(overall, now);
            if (pendingFlash) { pendingFlash = false; Celebrate(); }
            label.Text = text;
            timeLabel.Text = time;
            timeLabel.Visibility = time.Length > 0 ? Visibility.Visible : Visibility.Collapsed;
            label.Foreground = overall == Mode.Busy ? ShimmerBrush() : Palette.Brush(limited ? Palette.Error : Palette.Text);

            UpdateMinis(sessions, now);
            UpdateApproval(request);
            UpdateUsage(usage);
            UpdateCost(sessions);
            if (now - lastStatsLoad > 3000) { lastStatsLoad = now; UpdateStats(); }
            UpdateSessions(sessions, now);
            if (open) UpdateProjectLabel();
            Refresh();
        }

        static string Countdown(long resetsAtSeconds)
        {
            long s = Math.Max(0, resetsAtSeconds - Clock.NowMs() / 1000);
            return (s / 3600) + ":" + (s / 60 % 60).ToString("00") + ":" + (s % 60).ToString("00");
        }

        void Notify(string title, string text)
        {
            // Only when you're probably not looking: in a game or away from the keyboard.
            if (!settings.Notify || tray == null || demoStart > 0) return;
            if (!gameMode && IdleMs() < 30000) return;
            try { tray.ShowBalloonTip(5000, title, text.Length > 0 ? text : " ", WinForms.ToolTipIcon.None); }
            catch (Exception ex) { AppPaths.LogError("notify", ex); }
        }

        /// <summary>A push to the phone - only while you are away from the PC, at most once a minute per event.</summary>
        void ToPhone(string key, string title, string text, string tag, int priority)
        {
            if (settings.PhoneTopic.Length == 0 || demoStart > 0) return;
            if (IdleMs() < 2 * 60 * 1000) return;
            long now = Clock.NowMs(), last;
            if (phoneSent.TryGetValue(key, out last) && now - last < 60000) return;
            phoneSent[key] = now;
            Phone.Send(settings.PhoneTopic, title, text, tag, priority, null);
        }

        void ApplyMode(Mode next, long now)
        {
            if (next == mode) return;
            Mode prev = mode;
            mode = next;
            modeSince = now;

            Color c = Palette.For(next);
            dot.Fill = Palette.Brush(c);
            dotGlow.Color = c;

            var lift = new TranslateTransform(0, 6);
            left.RenderTransform = lift;
            lift.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(6, 0, TimeSpan.FromMilliseconds(320)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } });
            left.BeginAnimation(OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(260)));

            glow.BeginAnimation(DropShadowEffect.OpacityProperty, null);
            glow.BeginAnimation(DropShadowEffect.ColorProperty, new ColorAnimation(c, TimeSpan.FromMilliseconds(400)));
            switch (next)
            {
                case Mode.Busy:
                    glow.BeginAnimation(DropShadowEffect.OpacityProperty, new DoubleAnimation(0.2, 0.5, TimeSpan.FromSeconds(1.4)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, EasingFunction = new SineEase() });
                    break;
                case Mode.Waiting:
                    glow.BeginAnimation(DropShadowEffect.OpacityProperty, new DoubleAnimation(0.3, 0.85, TimeSpan.FromSeconds(0.65)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, EasingFunction = new SineEase() });
                    break;
                case Mode.Error:
                    glow.BeginAnimation(DropShadowEffect.OpacityProperty, new DoubleAnimation(0.6, TimeSpan.FromMilliseconds(300)));
                    break;
                case Mode.Done:
                    break;
                default:
                    glow.BeginAnimation(DropShadowEffect.OpacityProperty, new DoubleAnimation(0, TimeSpan.FromMilliseconds(500)));
                    break;
            }
            if (prev != (Mode)(-1)) height.Velocity -= 50;
            StartRendering();
        }

        void Celebrate()
        {
            glow.BeginAnimation(DropShadowEffect.ColorProperty, null);
            glow.Color = Palette.Ready;
            var a = new DoubleAnimationUsingKeyFrames();
            a.KeyFrames.Add(new LinearDoubleKeyFrame(0.95, KeyTime.FromTimeSpan(TimeSpan.FromMilliseconds(90))));
            a.KeyFrames.Add(new EasingDoubleKeyFrame(0, KeyTime.FromTimeSpan(TimeSpan.FromMilliseconds(1800)), new CubicEase { EasingMode = EasingMode.EaseOut }));
            glow.BeginAnimation(DropShadowEffect.OpacityProperty, a);
            hop.Velocity -= 260;
            StartRendering();
        }

        Brush shimmer;

        Brush ShimmerBrush()
        {
            if (shimmer != null) return shimmer;
            var dim = Color.FromRgb(142, 142, 150);
            var b = new LinearGradientBrush { StartPoint = new Point(0, 0.5), EndPoint = new Point(1, 0.5) };
            b.GradientStops.Add(new GradientStop(dim, 0));
            b.GradientStops.Add(new GradientStop(dim, 0.38));
            b.GradientStops.Add(new GradientStop(Colors.White, 0.5));
            b.GradientStops.Add(new GradientStop(dim, 0.62));
            b.GradientStops.Add(new GradientStop(dim, 1));
            var move = new TranslateTransform(-1, 0);
            b.RelativeTransform = move;
            move.BeginAnimation(TranslateTransform.XProperty, new DoubleAnimation(-1, 1, TimeSpan.FromSeconds(1.9)) { RepeatBehavior = RepeatBehavior.Forever, EasingFunction = new SineEase { EasingMode = EasingMode.EaseInOut } });
            shimmer = b;
            return b;
        }

        // ── mini Clawds (one per session) ────────────────────────────────

        string minisKey;

        void UpdateMinis(List<Session> sessions, long now)
        {
            var shown = sessions.Count > 1 && !gameMode ? sessions.Take(4).ToList() : new List<Session>();
            string key = string.Join(",", shown.Select(s => s.Id));
            if (key != minisKey)
            {
                minisKey = key;
                minis.Children.Clear();
                foreach (var s in shown)
                {
                    var sess = s;
                    var sprite = new PixelSprite(ClawdArt.Cols, 6, 1.6) { IsHitTestVisible = true, Background = Brushes.Transparent, Margin = new Thickness(0, 0, 4, 0), Cursor = Cursors.Hand };
                    ToolTipService.SetToolTip(sprite, sess.Project + " – klicken: zum Terminal");
                    sprite.MouseLeftButtonUp += (o, e) => JumpTo(sess);
                    minis.Children.Add(sprite);
                }
            }
            for (int i = 0; i < shown.Count && i < minis.Children.Count; i++)
            {
                Mode m = SessionStore.DisplayMode(shown[i], now);
                bool f = (now / 200 + i) % 2 == 0;
                var l = new Look
                {
                    Arms = m == Mode.Busy && f ? "down" : m == Mode.Waiting && f ? "up" : "side",
                    LegsB = m == Mode.Busy && f,
                    Happy = m == Mode.Done,
                    Eyes = m == Mode.None || m == Mode.Error ? "shut" : "c"
                };
                ((PixelSprite)minis.Children[i]).Show(ClawdArt.Pose(l), m == Mode.Error ? Color.FromRgb(168, 87, 74) : Palette.Clawd);
            }
        }

        void JumpTo(Session s)
        {
            if (!TerminalWindow.Focus(s.Hwnd))
                Toast("Das Terminal von " + s.Project + " habe ich nicht gefunden. Es meldet sich beim nächsten Befehl neu an.", 5);
        }

        // ── approvals ─────────────────────────────────────────────────────

        void UpdateApproval(ApprovalRequest r)
        {
            bool changed = (r == null) != (pendingApproval == null) || (r != null && pendingApproval != null && r.Id != pendingApproval.Id);
            pendingApproval = r;
            approvalCard.Visibility = r != null ? Visibility.Visible : Visibility.Collapsed;
            SetApprovalKeys(r != null && demoStart == 0);
            if (r != null && changed) ToPhone("approval:" + r.Id, "Claude braucht deine Freigabe – " + (r.Project.Length > 0 ? r.Project : "Claude"), r.Detail, "warning", 4);
            if (r == null) return;
            approvalTitle.Text = (r.Project.Length > 0 ? r.Project : "Claude") + " möchte " + (r.Tool.Length > 0 ? r.Tool : "etwas") + " ausführen";
            long remaining = PermissionBroker.WaitSeconds - (Clock.NowMs() - r.Created) / 1000;
            approvalDetail.Text = (r.Detail.Length > 0 ? r.Detail : r.Tool) + (remaining > 0 && remaining < 30 ? "\n(noch " + remaining + " s, dann fragt das Terminal)" : "");
            if (changed)
            {
                shake.Velocity += 480;
                StartRendering();
            }
        }

        void AnswerApproval(string answer)
        {
            var r = pendingApproval;
            if (r == null) return;
            if (r.Id != "demo") PermissionBroker.Answer(r.Id, answer);
            pendingApproval = null;
            approvalCard.Visibility = Visibility.Collapsed;
            if (answer == "allow") { happyUntil = Clock.NowMs() + 700; hop.Velocity -= 200; StartRendering(); }
            Toast(answer == "allow" ? "Erlaubt: " + r.Detail : answer == "deny" ? "Abgelehnt: " + r.Detail : "Entscheide im Terminal.", 3);
            Refresh();
        }

        // ── usage, cost, stats ────────────────────────────────────────────

        void UpdateUsage(Usage u)
        {
            double headline = u.FiveHour >= 0 ? u.FiveHour : u.SevenDay;
            string key = Math.Round(u.FiveHour) + "|" + Math.Round(u.SevenDay) + "|" + Usage.ResetText(u.FiveHourResets) + "|" + Usage.ResetText(u.SevenDayResets) +
                         (headline >= 99.5 ? "|" + (Clock.NowMs() / 1000) : "") + "|" + forecast.FullAt(Clock.NowMs()) / 60000 + "|" + demoStart;
            if (key == usageKey) return;
            usageKey = key;

            if (headline >= 0)
            {
                usageKind.Text = u.FiveHour >= 0 ? "5h" : "WOCHE";
                ringValue.Data = RingArc(headline);
                ringValue.Stroke = Palette.Brush(Palette.Level(headline));
                usagePct.Text = Math.Round(headline) + " %";
            }

            usagePanel.Children.Clear();
            if (!u.Known)
            {
                var t = Text(12.5, Palette.Secondary, FontWeights.Normal);
                t.Text = "Erscheint nach der ersten Antwort in Claude Code (Pro- und Max-Abos).";
                t.TextWrapping = TextWrapping.Wrap;
                usagePanel.Children.Add(t);
                return;
            }
            if (u.FiveHour >= 0) usagePanel.Children.Add(UsageRow("5 Stunden", u.FiveHour, u.FiveHourResets));
            if (u.SevenDay >= 0) usagePanel.Children.Add(UsageRow("Woche", u.SevenDay, u.SevenDayResets));

            // At this pace ... ?
            long now = Clock.NowMs();
            long full = demoStart > 0 ? demoStart + 100 * 60 * 1000 : forecast.FullAt(now);
            if (u.FiveHour >= 0 && u.FiveHour < 99.5 && full >= 0)
            {
                var f = Text(12, full > 0 ? Palette.Waiting : Palette.Secondary, FontWeights.Normal);
                f.TextWrapping = TextWrapping.Wrap;
                f.Margin = new Thickness(0, 2, 0, 0);
                f.Text = full > 0
                    ? "Bei deinem Tempo ist das 5-Stunden-Limit um " + LocalTime(full) + " voll (in " + Hours(full - now) + ")."
                    : "Bei deinem Tempo reicht das 5-Stunden-Limit bis zum Reset.";
                usagePanel.Children.Add(f);
            }
        }

        static string LocalTime(long unixMs)
        {
            return new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddMilliseconds(unixMs).ToLocalTime().ToString("HH:mm");
        }

        static Grid UsageRow(string name, double pct, long resets)
        {
            var g = new Grid { Margin = new Thickness(0, 4, 0, 4) };
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(78) });
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            var n = Text(12.5, Palette.Text, FontWeights.SemiBold);
            n.Text = name;
            n.VerticalAlignment = VerticalAlignment.Center;
            g.Children.Add(n);
            var track = new Border { Height = 6, CornerRadius = new CornerRadius(3), Background = Palette.Brush(Palette.Track), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 14, 0) };
            var fill = new Border { CornerRadius = new CornerRadius(3), Background = Palette.Brush(Palette.Level(pct)), HorizontalAlignment = HorizontalAlignment.Left, Width = 0 };
            track.Child = fill;
            track.SizeChanged += (s, e) => fill.BeginAnimation(WidthProperty, new DoubleAnimation(track.ActualWidth * Math.Max(0, Math.Min(100, pct)) / 100, TimeSpan.FromMilliseconds(600)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } });
            Grid.SetColumn(track, 1);
            g.Children.Add(track);
            var v = Text(12.5, Palette.Secondary, FontWeights.Normal);
            Typography.SetNumeralAlignment(v, FontNumeralAlignment.Tabular);
            string reset = pct >= 99.5 && resets > 0 ? "frei in " + Countdown(resets) : Usage.ResetText(resets);
            v.Text = Math.Round(pct) + " %" + (reset.Length > 0 ? " · " + (pct >= 99.5 ? "" : "Reset ") + reset : "");
            Grid.SetColumn(v, 2);
            g.Children.Add(v);
            return g;
        }

        void UpdateCost(List<Session> sessions)
        {
            var today = DateTime.Today;
            var epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            double sum = sessions.Where(s => s.Cost >= 0 && epoch.AddMilliseconds(s.Updated).ToLocalTime().Date == today).Sum(s => s.Cost);
            costText.Text = sum > 0 ? "Heute ≈ " + sum.ToString("0.00", new System.Globalization.CultureInfo("de-DE")) + " $ API-Gegenwert (bei Abos nur zur Orientierung)" : "";
            costText.Visibility = sum > 0 ? Visibility.Visible : Visibility.Collapsed;
        }

        void UpdateStats()
        {
            var d = demoStart > 0
                ? new DayStats { Tasks = 7, BusyMs = 72 * 60 * 1000, Files = new List<KeyValuePair<string, int>> { new KeyValuePair<string, int>("App.tsx", 5) } }
                : Stats.Load(DateTime.Today);
            todayText.Text = d.Tasks == 0 ? "Noch keine Aufgabe erledigt."
                : d.Tasks + (d.Tasks == 1 ? " Aufgabe" : " Aufgaben") + " · " + Hours(d.BusyMs) + " gearbeitet" +
                  (d.Files.Count > 0 ? " · meist bearbeitet: " + d.Files[0].Key + " (" + d.Files[0].Value + "×)" : "");
            var dow = DateTime.Today.DayOfWeek;
            if (dow == DayOfWeek.Friday || dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday)
            {
                var w = Stats.Week();
                weekText.Text = "Diese Woche: " + w.Tasks + " Aufgaben · " + Hours(w.BusyMs) + (w.Files.Count > 0 ? " · Top-Datei " + w.Files[0].Key : "");
                weekText.Visibility = w.Tasks > 0 ? Visibility.Visible : Visibility.Collapsed;
            }
            else weekText.Visibility = Visibility.Collapsed;
        }

        static string Hours(long ms)
        {
            long m = ms / 60000;
            return m < 60 ? m + " min" : (m / 60) + " h " + (m % 60).ToString("00") + " min";
        }

        // ── sessions ──────────────────────────────────────────────────────

        /// <summary>Claude's task list as a thin bar with "Schritt 3 von 7".</summary>
        static FrameworkElement TodoBar(int done, int total)
        {
            var g = new Grid { Margin = new Thickness(16, -3, 0, 8) };
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            var track = new Border { Height = 4, CornerRadius = new CornerRadius(2), Background = Palette.Brush(Palette.Track), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 10, 0) };
            var fill = new Border { CornerRadius = new CornerRadius(2), Background = Palette.Brush(Palette.Clawd), HorizontalAlignment = HorizontalAlignment.Left, Width = 0 };
            track.Child = fill;
            double share = total > 0 ? (double)done / total : 0;
            track.SizeChanged += (s, e) => fill.BeginAnimation(WidthProperty, new DoubleAnimation(track.ActualWidth * share, TimeSpan.FromMilliseconds(500)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } });
            g.Children.Add(track);
            var t = Text(11.5, Palette.Secondary, FontWeights.Normal);
            Typography.SetNumeralAlignment(t, FontNumeralAlignment.Tabular);
            t.Text = done >= total ? "Alle " + total + " Schritte erledigt" : "Schritt " + Math.Min(total, done + 1) + " von " + total;
            Grid.SetColumn(t, 1);
            g.Children.Add(t);
            return g;
        }

        void UpdateSessions(List<Session> sessions, long now)
        {
            var lines = new List<Tuple<Session, Color, string, string, string>>();
            foreach (var s in sessions.Take(3))
            {
                Mode m = SessionStore.DisplayMode(s, now);
                string detail, right = s.Context >= 0 ? "Kontext " + s.Context + " %" : "";
                switch (m)
                {
                    case Mode.Busy:
                        detail = s.Detail.Length > 0 ? s.Detail : "Denkt nach …";
                        if (s.TodoNow.Length > 0) detail = s.TodoNow + " · " + detail;
                        if (s.Agents > 0) detail += " · " + s.Agents + " Helfer";
                        if (s.TurnStart > 0) right = Clock.Duration(now - s.TurnStart) + (right.Length > 0 ? " · " + right : "");
                        break;
                    case Mode.Waiting:
                        detail = s.Tool.Length > 0 ? "Freigabe: " + s.Detail : (s.Detail.Length > 0 ? s.Detail : "Wartet auf deine Antwort");
                        break;
                    case Mode.Done:
                        detail = s.Summary.Length > 0 ? s.Summary : "Fertig – wartet auf deinen nächsten Befehl";
                        if (s.Duration > 0) right = Clock.Duration(s.Duration) + (right.Length > 0 ? " · " + right : "");
                        break;
                    case Mode.Error:
                        detail = s.Detail.Length > 0 ? "Fehler · " + s.Detail : "Abbruch mit Fehler";
                        break;
                    default:
                        detail = s.Summary.Length > 0 ? "Zuletzt: " + s.Summary : "Bereit für den nächsten Befehl";
                        break;
                }
                if (s.Context >= 80) right += " – /compact";
                lines.Add(Tuple.Create(s, Palette.For(m), s.Project + (s.Model.Length > 0 ? "  ·  " + s.Model : ""), detail, right));
            }
            string key = string.Join("\n", lines.Select(l => l.Item2 + l.Item3 + l.Item4 + l.Item5 + "|" + l.Item1.TodoDone + "/" + l.Item1.TodoTotal));
            if (key == sessionsKey) return;
            sessionsKey = key;

            sessionsPanel.Children.Clear();
            if (lines.Count == 0)
            {
                var t = Text(12.5, Palette.Secondary, FontWeights.Normal);
                t.Text = "Keine laufende Sitzung. Starte Claude Code oder frag hier unten.";
                t.TextWrapping = TextWrapping.Wrap;
                sessionsPanel.Children.Add(t);
                return;
            }
            for (int i = 0; i < lines.Count; i++)
            {
                var l = lines[i];
                var sess = l.Item1;
                var r = new Grid { Background = Brushes.Transparent, Cursor = Cursors.Hand };
                ToolTipService.SetToolTip(r, "Klicken: zum Terminal dieser Sitzung springen");
                r.MouseLeftButtonUp += (o, e) => JumpTo(sess);
                if (i > 0) r.Children.Add(new Border { Height = 1, Background = Palette.Brush(Color.FromRgb(26, 26, 29)), VerticalAlignment = VerticalAlignment.Top });
                var g = new Grid { Margin = new Thickness(0, 7, 0, 7) };
                g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(16) });
                g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
                g.Children.Add(new Ellipse { Width = 7, Height = 7, Fill = Palette.Brush(l.Item2), VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = HorizontalAlignment.Left });
                var texts = new TextBlock { TextTrimming = TextTrimming.CharacterEllipsis, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 12, 0) };
                texts.Inlines.Add(new System.Windows.Documents.Run(l.Item3) { FontFamily = UiFont, FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Palette.Brush(Palette.Text) });
                texts.Inlines.Add(new System.Windows.Documents.Run("   " + l.Item4) { FontFamily = UiFont, FontSize = 12, Foreground = Palette.Brush(Palette.Secondary) });
                Grid.SetColumn(texts, 1);
                g.Children.Add(texts);
                var right = Text(12, sess.Context >= 80 ? Palette.Waiting : Palette.Secondary, FontWeights.Normal);
                Typography.SetNumeralAlignment(right, FontNumeralAlignment.Tabular);
                right.Text = l.Item5;
                right.VerticalAlignment = VerticalAlignment.Center;
                Grid.SetColumn(right, 2);
                g.Children.Add(right);
                r.Children.Add(g);
                if (sess.TodoTotal > 0 && (SessionStore.DisplayMode(sess, now) == Mode.Busy || SessionStore.DisplayMode(sess, now) == Mode.Waiting))
                {
                    r.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                    r.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                    var bar = TodoBar(sess.TodoDone, sess.TodoTotal);
                    Grid.SetRow(bar, 1);
                    r.Children.Add(bar);
                }
                sessionsPanel.Children.Add(r);
            }
        }

        // ── composer ──────────────────────────────────────────────────────

        IEnumerable<string> KnownProjects()
        {
            return lastSessions.Where(s => s.Cwd.Length > 0 && Directory.Exists(s.Cwd)).Select(s => s.Cwd)
                .Concat(settings.RecentProjects.Where(Directory.Exists))
                .Distinct(StringComparer.OrdinalIgnoreCase);
        }

        string CurrentProject()
        {
            if (!string.IsNullOrEmpty(project) && Directory.Exists(project)) return project;
            string first = KnownProjects().FirstOrDefault();
            return first ?? Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        }

        void UpdateProjectLabel()
        {
            projectText.Text = PathText.LastSegment(CurrentProject()) + "  ▾";
        }

        void UpdateDropHint()
        {
            dropHint.Text = dragOver ? "Loslassen – Clawd fängt sie!" : "PDF, Bild oder Datei hierher ziehen – Clawd frisst sie.";
            dropHint.Foreground = Palette.Brush(dragOver ? Palette.Clawd : Palette.Faint);
            dropHint.Visibility = dragOver || attachments.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
            dropBorder.Stroke = Palette.Brush(dragOver ? Palette.Clawd : Color.FromRgb(52, 52, 58));
            dropBorder.Fill = Palette.Brush(dragOver ? Color.FromRgb(26, 18, 16) : Palette.Field);
        }

        void ShowProjectMenu()
        {
            var menu = new ContextMenu { PlacementTarget = projectButton, Placement = System.Windows.Controls.Primitives.PlacementMode.Bottom };
            foreach (var dir in KnownProjects().Take(10))
            {
                string d = dir;
                var item = new MenuItem { Header = PathText.LastSegment(d) + "   (" + d + ")", IsCheckable = true, IsChecked = string.Equals(d, CurrentProject(), StringComparison.OrdinalIgnoreCase) };
                item.Click += (s, e) => { project = d; UpdateProjectLabel(); };
                menu.Items.Add(item);
            }
            if (menu.Items.Count > 0) menu.Items.Add(new Separator());
            var pick = new MenuItem { Header = "Anderen Ordner wählen …" };
            pick.Click += (s, e) =>
            {
                using (var dlg = new WinForms.FolderBrowserDialog { Description = "Projektordner für Claude wählen", SelectedPath = CurrentProject() })
                {
                    if (dlg.ShowDialog() == WinForms.DialogResult.OK)
                    {
                        project = dlg.SelectedPath;
                        settings.RememberProject(project);
                        UpdateProjectLabel();
                    }
                }
            };
            menu.Items.Add(pick);
            menu.IsOpen = true;
        }

        void OnInputKey(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter && (Keyboard.Modifiers & ModifierKeys.Shift) == 0)
            {
                e.Handled = true;
                Send((Keyboard.Modifiers & ModifierKeys.Control) != 0);
            }
            else if (e.Key == Key.Escape)
            {
                e.Handled = true;
                ClearComposer();
            }
        }

        /// <summary>Open the island with the cursor in the question box (Ctrl+Alt+C).</summary>
        void FocusComposer()
        {
            open = true;
            SetInteractive(true);
            Activate();
            input.Focus();
            Keyboard.Focus(input);
            waveUntil = Clock.NowMs() + 900;
            Refresh();
        }

        /// <summary>Clawd eats new attachments, then the island opens with them.</summary>
        void Feed(IEnumerable<string> files)
        {
            int before = attachments.Count;
            foreach (var f in files.Where(File.Exists))
                if (!attachments.Contains(f, StringComparer.OrdinalIgnoreCase)) attachments.Add(f);
            if (attachments.Count == before) return;
            RenderChips();
            long now = Clock.NowMs();
            chompStart = now;
            chompUntil = now + ChompMs + 60;
            Refresh();
        }

        void FeedClipboard()
        {
            try
            {
                Directory.CreateDirectory(AppPaths.Shots);
                string stamp = DateTime.Now.ToString("yyyyMMdd-HHmmss");
                if (Clipboard.ContainsFileDropList())
                {
                    Feed(Clipboard.GetFileDropList().Cast<string>().ToList());
                }
                else if (Clipboard.ContainsImage())
                {
                    string path = System.IO.Path.Combine(AppPaths.Shots, "Zwischenablage-" + stamp + ".png");
                    var encoder = new PngBitmapEncoder();
                    encoder.Frames.Add(BitmapFrame.Create(Clipboard.GetImage()));
                    using (var fs = File.Create(path)) encoder.Save(fs);
                    Feed(new[] { path });
                }
                else if (Clipboard.ContainsText())
                {
                    string path = System.IO.Path.Combine(AppPaths.Shots, "Zwischenablage-" + stamp + ".txt");
                    File.WriteAllText(path, Clipboard.GetText(), new UTF8Encoding(false));
                    Feed(new[] { path });
                    if (input.Text.Length == 0) input.Text = "Erklär mir das bitte: ";
                }
                else Toast("Die Zwischenablage ist leer.", 3);
            }
            catch (Exception ex)
            {
                AppPaths.LogError("clipboard", ex);
                Toast("Die Zwischenablage konnte ich nicht lesen.", 3);
            }
        }

        void TakeScreenshot()
        {
            try
            {
                var snip = new SnipWindow(path => { if (path != null) Feed(new[] { path }); });
                snip.Show();
            }
            catch (Exception ex)
            {
                AppPaths.LogError("snip", ex);
                Toast("Bildschirmfoto hat nicht geklappt.", 3);
            }
        }

        /// <summary>Focus the question box and start Windows voice typing (Win+H).</summary>
        void Dictate()
        {
            FocusComposer();
            earUntil = Clock.NowMs() + 8000;
            Dispatcher.BeginInvoke(new Action(() =>
            {
                const byte VK_LWIN = 0x5B, VK_H = 0x48;
                const uint KEYUP = 0x2;
                keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
                keybd_event(VK_H, 0, 0, UIntPtr.Zero);
                keybd_event(VK_H, 0, KEYUP, UIntPtr.Zero);
                keybd_event(VK_LWIN, 0, KEYUP, UIntPtr.Zero);
            }), DispatcherPriority.Background);
        }

        void Send(bool allowEdits)
        {
            if (runner.Running) return;
            string text = input.Text.Trim();
            if (text.Length == 0 && attachments.Count == 0)
            {
                input.Focus();
                return;
            }
            string cwd = CurrentProject();
            settings.RememberProject(cwd);
            string prompt = ClaudeRunner.BuildPrompt(text, attachments);
            var dirs = attachments.Select(f => System.IO.Path.GetDirectoryName(f)).Where(d => !string.IsNullOrEmpty(d)).ToList();

            ShowAnswer();
            answerBox.Text = "";
            answerSessionId = null;
            continueButton.Visibility = Visibility.Collapsed;
            activityText.Foreground = Palette.Brush(Palette.Clawd);
            activityText.Text = (allowEdits ? "Arbeitet in " : "Liest in ") + PathText.LastSegment(cwd) + " …";
            try
            {
                runner.Start(prompt, cwd, allowEdits, dirs);
                input.Text = "";
                attachments.Clear();
                RenderChips();
            }
            catch (Exception ex)
            {
                AppPaths.LogError("runner", ex);
                activityText.Foreground = Palette.Brush(Palette.Error);
                activityText.Text = "Claude Code wurde nicht gefunden. Ist es installiert? (" + ex.Message + ")";
            }
            Refresh();
        }

        void WireRunner()
        {
            runner.Text += t => Dispatcher.BeginInvoke(new Action(() =>
            {
                if (answerBox.Text.Length > 0) answerBox.AppendText("\n\n");
                answerBox.AppendText(t.Trim());
                answerScroll.ScrollToEnd();
                Refresh();
            }));
            runner.Activity += a => Dispatcher.BeginInvoke(new Action(() => { activityText.Text = a; }));
            runner.Finished += (ok, message) => Dispatcher.BeginInvoke(new Action(() =>
            {
                answerSessionId = runner.SessionId;
                activityText.Foreground = Palette.Brush(ok ? Palette.Ready : Palette.Error);
                activityText.Text = ok ? "Fertig. Du kannst im Terminal weitermachen." : message;
                continueButton.Visibility = answerSessionId != null ? Visibility.Visible : Visibility.Collapsed;
                if (ok) Celebrate();
                Refresh();
            }));
        }

        void ShowAnswer()
        {
            answerVisible = true;
            answerPanel.Visibility = Visibility.Visible;
        }

        void ClearComposer()
        {
            runner.Cancel();
            input.Text = "";
            attachments.Clear();
            RenderChips();
            answerVisible = false;
            answerPanel.Visibility = Visibility.Collapsed;
            answerBox.Text = "";
            Keyboard.ClearFocus();
            hoverSince = 0;
            Refresh();
        }

        // ── drag & drop ──────────────────────────────────────────────────

        void OnDragOver(object sender, DragEventArgs e)
        {
            bool files = e.Data.GetDataPresent(DataFormats.FileDrop);
            e.Effects = files ? DragDropEffects.Copy : DragDropEffects.None;
            e.Handled = true;
            if (!files) return;
            fileDrag = true;
            if (open && !dragOver)
            {
                dragOver = true;
                Refresh();
            }
        }

        void OnDrop(object sender, DragEventArgs e)
        {
            dragOver = false;
            fileDrag = false;
            var files = e.Data.GetData(DataFormats.FileDrop) as string[];
            if (files != null) Feed(files);
            Refresh();
        }

        double DistanceToMouth()
        {
            POINT p;
            if (!GetCursorPos(out p) || PresentationSource.FromVisual(canvas) == null) return double.MaxValue;
            Point local = canvas.PointFromScreen(new Point(p.X, p.Y));
            double mx = Canvas.GetLeft(clawd) + clawd.Width / 2;
            double my = Canvas.GetTop(clawd) + 3.5 * ClawdPx;
            if (double.IsNaN(mx) || double.IsNaN(my)) return double.MaxValue;
            return Math.Sqrt((local.X - mx) * (local.X - mx) + (local.Y - my) * (local.Y - my));
        }

        void RenderChips()
        {
            chips.Children.Clear();
            foreach (var f in attachments)
            {
                string file = f;
                string ext = System.IO.Path.GetExtension(file).ToLowerInvariant();
                bool pdf = ext == ".pdf";
                bool image = ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".gif" || ext == ".webp";
                var panelRow = new StackPanel { Orientation = Orientation.Horizontal };
                var kind = Text(9.5, Colors.White, FontWeights.Bold);
                kind.Text = pdf ? "PDF" : image ? "BILD" : "DATEI";
                var tag = new Border { Child = kind, CornerRadius = new CornerRadius(4), Background = Palette.Brush(pdf ? Color.FromRgb(229, 72, 77) : image ? Color.FromRgb(64, 120, 220) : Color.FromRgb(70, 70, 78)), Padding = new Thickness(5, 1, 5, 2), Margin = new Thickness(0, 0, 7, 0), VerticalAlignment = VerticalAlignment.Center };
                var name = Text(12, Palette.Text, FontWeights.Normal);
                name.Text = PathText.LastSegment(file);
                name.MaxWidth = 280;
                name.TextTrimming = TextTrimming.CharacterEllipsis;
                name.VerticalAlignment = VerticalAlignment.Center;
                var x = Text(12, Palette.Idle, FontWeights.Normal);
                x.Text = "  ✕";
                x.VerticalAlignment = VerticalAlignment.Center;
                panelRow.Children.Add(tag);
                panelRow.Children.Add(name);
                panelRow.Children.Add(x);
                var chip = new Border
                {
                    Child = panelRow, CornerRadius = new CornerRadius(9), Background = Palette.Brush(Color.FromRgb(29, 29, 33)),
                    BorderBrush = Palette.Brush(Palette.ControlLine), BorderThickness = new Thickness(1),
                    Padding = new Thickness(5, 4, 9, 4), Margin = new Thickness(0, 4, 6, 0), Cursor = Cursors.Hand, ToolTip = file + "\n(Klicken zum Entfernen)"
                };
                chip.MouseLeftButtonUp += (s, e) => { attachments.Remove(file); RenderChips(); Refresh(); };
                chips.Children.Add(chip);
            }
            UpdateDropHint();
        }

        // ── open / close, petting ────────────────────────────────────────

        bool Pinned
        {
            get
            {
                return input.IsKeyboardFocusWithin || input.Text.Length > 0 || attachments.Count > 0 ||
                       answerVisible || runner.Running || demoOpen || pendingApproval != null;
            }
        }

        void CheckHover()
        {
            POINT p;
            if (!GetCursorPos(out p) || PresentationSource.FromVisual(canvas) == null) return;
            Point local = canvas.PointFromScreen(new Point(p.X, p.Y));
            double w = width.Value, h = height.Value;
            double x0 = (WindowW - w) / 2 - Shoulder;
            bool inside = local.X >= x0 - 8 && local.X <= x0 + w + 2 * Shoulder + 8 && local.Y >= -2 && local.Y <= h + 12;
            bool dragging = (GetAsyncKeyState(0x01) & 0x8000) != 0;
            long now = Clock.NowMs();

            // Petting: quick back-and-forth strokes over Clawd.
            double cx = Canvas.GetLeft(clawd), cy = Canvas.GetTop(clawd);
            bool overClawd = pet == null && !double.IsNaN(cx) && local.X >= cx - 6 && local.X <= cx + clawd.Width + 6 && local.Y >= cy - 6 && local.Y <= cy + 6 * ClawdPx + 6;
            if (overClawd && !dragging)
            {
                if (!double.IsNaN(lastPetX) && Math.Abs(local.X - lastPetX) > 5)
                {
                    int dir = Math.Sign(local.X - lastPetX);
                    if (lastPetDir != 0 && dir != lastPetDir) petTurns.Add(now);
                    lastPetDir = dir;
                    lastPetX = local.X;
                }
                else if (double.IsNaN(lastPetX)) lastPetX = local.X;
                petTurns.RemoveAll(t => now - t > 1500);
                if (petTurns.Count >= 4 && now > petUntil)
                {
                    petUntil = now + 2600;
                    petTurns.Clear();
                    hop.Velocity -= 120;
                    StartRendering();
                }
            }
            else { lastPetX = double.NaN; lastPetDir = 0; }

            // Pull Clawd out of the island: press on him and drag downwards.
            if (dragging && !buttonWasDown) { pulling = overClawd && !fileDrag; pullFrom = local; }
            if (!dragging) pulling = false;
            if (pulling && local.Y - pullFrom.Y > 36) { pulling = false; LetOut(true); }
            buttonWasDown = dragging;

            if (inside) { leftSince = 0; if (hoverSince == 0) hoverSince = now; }
            else { hoverSince = 0; if (leftSince == 0) leftSince = now; }

            nearDrag = dragging && DistanceToMouth() < 240;
            if (!dragging && fileDrag && chompStart == 0) fileDrag = false;
            catcher.Visibility = nearDrag || fileDrag ? Visibility.Visible : Visibility.Collapsed;

            bool chewing = now < chompUntil;
            bool want = open;
            if (inside && !dragging && now - hoverSince > 160) want = true;
            if (!inside && open && !Pinned && !dragOver && now - leftSince > 380) want = false;
            if (Pinned && !chewing) want = true;
            if (chewing && !open) want = false;

            SetInteractive(inside || want || nearDrag || fileDrag);
            if (want != open)
            {
                open = want;
                if (open) waveUntil = now + 900;
                else Keyboard.ClearFocus();
                Refresh();
            }
        }

        void Refresh()
        {
            bool show = open || dragOver;
            panel.BeginAnimation(OpacityProperty, new DoubleAnimation(show ? 1 : 0, TimeSpan.FromMilliseconds(show ? 260 : 100))
            {
                BeginTime = TimeSpan.FromMilliseconds(show ? 120 : 0)
            });
            bool compact = gameMode && !show && mode != Mode.Waiting;
            left.Visibility = compact ? Visibility.Hidden : Visibility.Visible;
            usageView.Visibility = compact || !lastUsage.Known ? Visibility.Hidden : Visibility.Visible;
            UpdateDropHint();
            UpdateTargets();
        }

        void UpdateTargets()
        {
            bool show = open || dragOver;
            bool compact = gameMode && !show && mode != Mode.Waiting;
            double w = compact ? GameW : ClosedW, h = RowH;
            if (show)
            {
                w = OpenW;
                double panelW = w - 2 * PanelInset;
                panel.Width = panelW;
                panelContent.Measure(new Size(panelW - 2, double.PositiveInfinity));
                h = PanelTop + panelContent.DesiredSize.Height + 2 + PanelInset;
            }
            h = Math.Round(h);
            if (Math.Abs(width.Target - w) > 0.5 || Math.Abs(height.Target - h) > 0.5)
            {
                width.Target = w;
                height.Target = h;
                StartRendering();
            }
        }

        // ── physics & layout ─────────────────────────────────────────────

        void StartRendering()
        {
            if (rendering) return;
            rendering = true;
            lastRender = TimeSpan.Zero;
            CompositionTarget.Rendering += OnRendering;
        }

        void OnRendering(object sender, EventArgs e)
        {
            var args = e as RenderingEventArgs;
            TimeSpan t = args != null ? args.RenderingTime : TimeSpan.FromMilliseconds(Environment.TickCount);
            if (t == lastRender) return;
            double dt = lastRender == TimeSpan.Zero ? 1.0 / 60 : (t - lastRender).TotalSeconds;
            lastRender = t;
            dt = Math.Min(dt, 1.0 / 30);

            width.Step(dt);
            height.Step(dt);
            shake.Step(dt);
            hop.Step(dt);
            Layout();

            if (width.Settled && height.Settled && shake.Settled && hop.Settled)
            {
                CompositionTarget.Rendering -= OnRendering;
                rendering = false;
            }
        }

        void Layout()
        {
            double w = Math.Max(40, width.Value);
            double h = Math.Max(0, height.Value);
            double x = (WindowW - w) / 2 + shake.Value;

            var shape = IslandGeometry(w, h);
            glowShape.Data = shape;
            body.Data = shape;
            edge.Data = EdgeGeometry(w, h);
            foreach (var p in new[] { glowShape, body, edge }) { Canvas.SetLeft(p, x - Shoulder); Canvas.SetTop(p, 0); }

            row.Width = Math.Max(0, w - 44);
            Canvas.SetLeft(row, x + 22);
            Canvas.SetTop(row, Math.Min(0, h - RowH) / 2);

            panel.Height = Math.Max(0, h - PanelTop - PanelInset);
            panel.Visibility = panel.Height > 4 ? Visibility.Visible : Visibility.Collapsed;
            Canvas.SetLeft(panel, x + PanelInset);
            Canvas.SetTop(panel, PanelTop);

            double cy = Math.Min(h, RowH) - 5 * ClawdPx + hop.Value;
            Canvas.SetLeft(clawd, Math.Round(x + w / 2 - clawd.Width / 2));
            Canvas.SetTop(clawd, Math.Round(cy));
            Canvas.SetLeft(catcher, x + w / 2 - catcher.Width / 2);
            Canvas.SetTop(catcher, 0);
            LayoutToast();
        }

        void LayoutToast()
        {
            toast.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
            double w = Math.Max(40, width.Value), h = Math.Max(0, height.Value);
            double x = (WindowW - w) / 2 + shake.Value;
            Canvas.SetLeft(toast, Math.Round(x + w / 2 - toast.DesiredSize.Width / 2));
            Canvas.SetTop(toast, Math.Round(h + (agentsNow > 0 ? 30 : 16)));
        }

        static Geometry IslandGeometry(double w, double h)
        {
            double r = Math.Min(h / 2, h > 80 ? 30 : 24), s = Math.Max(0, Math.Min(Shoulder, h - r)), k = 0.36, S = Shoulder;
            var g = new StreamGeometry();
            using (var c = g.Open())
            {
                c.BeginFigure(new Point(0, 0), true, true);
                c.QuadraticBezierTo(new Point(S, 0), new Point(S, s), true, true);
                c.LineTo(new Point(S, h - r), true, true);
                c.BezierTo(new Point(S, h - r * k), new Point(S + r * k, h), new Point(S + r, h), true, true);
                c.LineTo(new Point(S + w - r, h), true, true);
                c.BezierTo(new Point(S + w - r * k, h), new Point(S + w, h - r * k), new Point(S + w, h - r), true, true);
                c.LineTo(new Point(S + w, s), true, true);
                c.QuadraticBezierTo(new Point(S + w, 0), new Point(2 * S + w, 0), true, true);
            }
            g.Freeze();
            return g;
        }

        static Geometry EdgeGeometry(double w, double h)
        {
            double r = Math.Min(h / 2, h > 80 ? 30 : 24), k = 0.36, S = Shoulder, top = Math.Min(S, Math.Max(0, h - r));
            var g = new StreamGeometry();
            using (var c = g.Open())
            {
                c.BeginFigure(new Point(S, top), false, false);
                c.LineTo(new Point(S, h - r), true, true);
                c.BezierTo(new Point(S, h - r * k), new Point(S + r * k, h), new Point(S + r, h), true, true);
                c.LineTo(new Point(S + w - r, h), true, true);
                c.BezierTo(new Point(S + w - r * k, h), new Point(S + w, h - r * k), new Point(S + w, h - r), true, true);
                c.LineTo(new Point(S + w, top), true, true);
            }
            g.Freeze();
            return g;
        }

        // ── tray ─────────────────────────────────────────────────────────

        void SetupTray()
        {
            tray = new WinForms.NotifyIcon { Text = "Claude Island", Icon = MakeTrayIcon(), Visible = true };
            var menu = new WinForms.ContextMenuStrip();
            menu.Items.Add("Island öffnen (Strg+Alt+C)", null, (s, e) => Dispatcher.BeginInvoke(new Action(FocusComposer)));
            menu.Items.Add("Bildschirmfoto verfüttern (Strg+Alt+S)", null, (s, e) => Dispatcher.BeginInvoke(new Action(TakeScreenshot)));
            menu.Items.Add("Animation vorführen", null, (s, e) => Dispatcher.BeginInvoke(new Action(StartDemo)));
            menu.Items.Add("Claude Code öffnen", null, (s, e) => Dispatcher.BeginInvoke(new Action(() => SafeRun(() => ClaudeRunner.OpenTerminal(CurrentProject(), null)))));
            menu.Items.Add(new WinForms.ToolStripSeparator());
            menu.Items.Add(Toggle("Freigaben in der Island", () => settings.ApprovalsInIsland, v => settings.ApprovalsInIsland = v));
            menu.Items.Add(Toggle("Windows-Benachrichtigungen", () => settings.Notify, v => settings.Notify = v));
            menu.Items.Add(Toggle("Dem Bildschirm mit der Maus folgen", () => settings.FollowMonitor, v => settings.FollowMonitor = v));
            menu.Items.Add(Toggle("Bei Vollbild (Spiele, Videos) ausblenden", () => settings.HideInFullscreen, v => settings.HideInFullscreen = v));
            menu.Items.Add(Toggle("Ton bei Fertig / Freigabe", () => settings.Sound, v => settings.Sound = v));
            petItem = Toggle("Clawd auf dem Desktop laufen lassen", () => pet != null, v => Dispatcher.BeginInvoke(new Action(() => { if (v) LetOut(false); else Recall(); })));
            menu.Items.Add(petItem);
            menu.Items.Add("Nachrichten aufs Handy …", null, (s, e) => Dispatcher.BeginInvoke(new Action(SetupPhone)));
            menu.Items.Add("Geburtstag festlegen …", null, (s, e) => AskBirthday());
            menu.Items.Add("Datenordner öffnen", null, (s, e) =>
            {
                Directory.CreateDirectory(AppPaths.Root);
                System.Diagnostics.Process.Start("explorer.exe", "\"" + AppPaths.Root + "\"");
            });
            menu.Items.Add(new WinForms.ToolStripSeparator());
            menu.Items.Add("Beenden", null, (s, e) => Dispatcher.BeginInvoke(new Action(() =>
            {
                tray.Visible = false;
                Application.Current.Shutdown();
            })));
            tray.ContextMenuStrip = menu;
            tray.MouseClick += (s, e) => { if (e.Button == WinForms.MouseButtons.Left) Dispatcher.BeginInvoke(new Action(FocusComposer)); };
        }

        WinForms.ToolStripMenuItem Toggle(string text, Func<bool> get, Action<bool> set)
        {
            var item = new WinForms.ToolStripMenuItem(text) { Checked = get(), CheckOnClick = true };
            item.CheckedChanged += (s, e) =>
            {
                set(item.Checked);
                settings.Save();
                Dispatcher.BeginInvoke(new Action(() => { monitorKey = ""; CheckFullscreen(); Refresh(); }));
            };
            return item;
        }

        // ── Clawd on the desktop ─────────────────────────────────────────

        void LetOut(bool grabbed)
        {
            if (pet != null) return;
            double cx = Canvas.GetLeft(clawd), cy = Canvas.GetTop(clawd);
            var feet = double.IsNaN(cx) || double.IsNaN(cy)
                ? new Point(Left + WindowW / 2, Top + RowH + 30)
                : new Point(Left + cx + clawd.Width / 2, Top + cy + 6 * ClawdPx);
            pet = new PetWindow();
            pet.GoHome += () => Dispatcher.BeginInvoke(new Action(Recall));
            pet.Start(feet, grabbed);
            settings.PetOut = true;
            settings.Save();
            if (petItem != null) petItem.Checked = true;
            Toast("Clawd macht einen Ausflug. Doppelklick auf ihn holt ihn zurück.", 5);
        }

        void Recall()
        {
            if (pet == null) return;
            var p = pet;
            pet = null;
            p.Close();
            settings.PetOut = false;
            settings.Save();
            if (petItem != null) petItem.Checked = false;
            happyUntil = Clock.NowMs() + 900;
            hop.Velocity -= 260;
            StartRendering();
        }

        // ── phone ─────────────────────────────────────────────────────────

        void SetupPhone()
        {
            string topic = settings.PhoneTopic.Length > 0 ? settings.PhoneTopic : Phone.NewTopic();
            using (var form = new WinForms.Form { Text = "Claude Island – Nachrichten aufs Handy", Width = 520, Height = 330, FormBorderStyle = WinForms.FormBorderStyle.FixedDialog, StartPosition = WinForms.FormStartPosition.CenterScreen, MaximizeBox = false, MinimizeBox = false, TopMost = true })
            {
                var steps = new WinForms.Label
                {
                    Left = 14, Top = 12, Width = 480, Height = 120,
                    Text = "Bist du nicht am PC, schickt Clawd eine Nachricht aufs Handy, wenn Claude fertig ist oder dich braucht.\n\n" +
                           "1. Installiere auf dem Handy die kostenlose App „ntfy“ (Play Store / App Store).\n" +
                           "2. Tippe dort auf „+“ und abonniere dieses Thema:\n" +
                           "3. Klick unten auf „Testnachricht“ und schau aufs Handy.\n\n" +
                           "Das Thema ist wie ein Passwort: Wer es kennt, kann deine Nachrichten mitlesen."
                };
                var box = new WinForms.TextBox { Left = 14, Top = 140, Width = 330, ReadOnly = true, Text = topic, Font = new Drawing.Font("Consolas", 11f) };
                var copy = new WinForms.Button { Text = "Kopieren", Left = 352, Top = 139, Width = 140, Height = 28 };
                var status = new WinForms.Label { Left = 14, Top = 178, Width = 480, Height = 40, ForeColor = Drawing.Color.DimGray };
                var test = new WinForms.Button { Text = "Testnachricht", Left = 14, Top = 238, Width = 120, Height = 30 };
                var off = new WinForms.Button { Text = "Ausschalten", Left = 252, Top = 238, Width = 110, Height = 30, DialogResult = WinForms.DialogResult.No };
                var ok = new WinForms.Button { Text = "Einschalten", Left = 372, Top = 238, Width = 120, Height = 30, DialogResult = WinForms.DialogResult.OK };
                copy.Click += (s, e) => { try { WinForms.Clipboard.SetText(topic); status.Text = "Kopiert."; } catch { } };
                test.Click += (s, e) =>
                {
                    status.Text = "Sende …";
                    Phone.Send(topic, "Clawd sagt hallo", "So sehen die Nachrichten von Claude Island aus.", "wave", 3, sent =>
                    {
                        try { form.BeginInvoke(new Action(() => status.Text = sent ? "Gesendet. Ist sie auf dem Handy angekommen? Dann auf „Einschalten“." : "Senden hat nicht geklappt. Ist der PC online?")); }
                        catch { }
                    });
                };
                foreach (WinForms.Control c in new WinForms.Control[] { steps, box, copy, status, test, off, ok }) form.Controls.Add(c);
                form.AcceptButton = ok;
                var result = form.ShowDialog();
                if (result == WinForms.DialogResult.OK) settings.PhoneTopic = topic;
                else if (result == WinForms.DialogResult.No) settings.PhoneTopic = "";
                else return;
                settings.Save();
                Toast(settings.PhoneTopic.Length > 0 ? "Handy-Nachrichten sind an – sobald du 2 Minuten nicht am PC bist." : "Handy-Nachrichten sind aus.", 4);
            }
        }

        void AskBirthday()
        {
            using (var form = new WinForms.Form { Text = "Claude Island", Width = 360, Height = 170, FormBorderStyle = WinForms.FormBorderStyle.FixedDialog, StartPosition = WinForms.FormStartPosition.CenterScreen, MaximizeBox = false, MinimizeBox = false, TopMost = true })
            {
                var lbl = new WinForms.Label { Text = "Dein Geburtstag (TT.MM) – dann trägt Clawd einen Partyhut:", Left = 12, Top = 12, Width = 320 };
                var box = new WinForms.TextBox { Left = 12, Top = 40, Width = 120, Text = settings.Birthday.Length == 5 ? settings.Birthday.Substring(3, 2) + "." + settings.Birthday.Substring(0, 2) : "" };
                var ok = new WinForms.Button { Text = "Speichern", Left = 240, Top = 80, Width = 90, DialogResult = WinForms.DialogResult.OK };
                form.Controls.Add(lbl);
                form.Controls.Add(box);
                form.Controls.Add(ok);
                form.AcceptButton = ok;
                if (form.ShowDialog() != WinForms.DialogResult.OK) return;
                DateTime d;
                if (DateTime.TryParseExact(box.Text.Trim() + ".2000", "dd.MM.yyyy", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out d))
                {
                    settings.Birthday = d.ToString("MM-dd");
                    settings.Save();
                }
            }
        }

        void StartDemo()
        {
            demoStart = Clock.NowMs();
            demoChomped = false;
            lastModes.Remove("demo");
            lastModes.Remove("demo2");
            Poll();
        }

        /// <summary>Clawd as a 32 x 32 tray icon.</summary>
        static Drawing.Icon MakeTrayIcon()
        {
            var rows = ClawdArt.Pose(new Look());
            using (var bmp = new Drawing.Bitmap(32, 32))
            {
                using (var g = Drawing.Graphics.FromImage(bmp))
                using (var b = new Drawing.SolidBrush(Drawing.Color.FromArgb(215, 119, 87)))
                {
                    g.Clear(Drawing.Color.Transparent);
                    for (int y = 1; y < rows.Length; y++)
                        for (int x = 0; x < rows[y].Length; x++)
                            if (rows[y][x] == '#') g.FillRectangle(b, 2 + (x - 1) * 1.75f, 8 + (y - 1) * 3.2f, 1.75f, 3.2f);
                }
                return Drawing.Icon.FromHandle(bmp.GetHicon());
            }
        }
    }
}
