// Claude Island - the window.
//
// A Dynamic-Island-style notch at the top edge of the screen with Clawd, the
// Claude Code mascot, sitting in it - his legs dangle out of the bottom. Clawd
// acts out what Claude Code is doing; the left side says it in words, the right
// side shows the 5-hour usage limit as a ring. Hover it and the island opens:
// usage limits, sessions, and a drop zone where a PDF (or any file) plus a
// question or a command goes straight to Claude.

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
    }

    /// <summary>
    /// Clawd as crisp pixel art, decoded from the logo Claude Code prints on
    /// start: 18 columns; row 0 is room for raised arms and the extra rows let
    /// his jaw drop open. Cells: '#' body, 'w' tooth, 'm' mouth, 'p' paper,
    /// 'r' the red PDF stripe.
    /// </summary>
    sealed class Clawd : Canvas
    {
        public const int Cols = 18, Rows = 11;
        public const int MaxMouth = 4;
        static readonly Brush Tooth = Palette.Brush(Color.FromRgb(246, 243, 238));
        static readonly Brush Mouth = Palette.Brush(Color.FromRgb(58, 13, 20));
        static readonly Brush Paper = Palette.Brush(Color.FromRgb(250, 250, 250));
        static readonly Brush Red = Palette.Brush(Color.FromRgb(229, 72, 77));
        public readonly double Px;
        readonly Rectangle[] cells = new Rectangle[Cols * Rows];
        string[] current;
        Color currentColor;

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

        public Clawd(double px)
        {
            Px = px;
            Width = Cols * px;
            Height = Rows * px;
            SnapsToDevicePixels = true;
            RenderOptions.SetEdgeMode(this, EdgeMode.Aliased);
            for (int y = 0; y < Rows; y++)
                for (int x = 0; x < Cols; x++)
                {
                    var r = new Rectangle { Width = px, Height = px, Visibility = Visibility.Hidden };
                    SetLeft(r, x * px);
                    SetTop(r, y * px);
                    cells[y * Cols + x] = r;
                    Children.Add(r);
                }
        }

        /// <summary>Build a pose. arms: side | up | down | wave.</summary>
        public static string[] Pose(string eyes, string arms, bool legsB, bool happy)
        {
            return Pose(eyes, arms, legsB, happy, 0, false);
        }

        /// <summary>
        /// With mouth &gt; 0 the jaw drops by that many rows: teeth on both jaws,
        /// dark mouth between, and optionally the PDF he is about to eat.
        /// </summary>
        public static string[] Pose(string eyes, string arms, bool legsB, bool happy, int mouth, bool food)
        {
            string r0 = E, r1 = Top, r2 = Eyes[eyes], r3 = Arms, r4 = Body;
            if (happy) { r1 = "...##.######.##..."; r2 = "...#.#.####.#.#..."; }
            if (arms == "up") { r0 = ".##............##."; r3 = Body; }
            else if (arms == "down") { r3 = Body; r4 = Arms; }
            else if (arms == "wave") { r0 = "................##"; r3 = ".###############.."; }
            var rows = new List<string> { r0, r1, r2 };
            mouth = Math.Max(0, Math.Min(MaxMouth, mouth));
            if (mouth == 1) rows.Add("...#mmmmmmmmmm#...");
            else if (mouth >= 2)
            {
                rows.Add("...#wmwmwmwmwm#...");
                for (int i = 0; i < mouth - 2; i++)
                {
                    if (food && i == 0) rows.Add("...#mmmppppmmm#...");
                    else if (food && i == 1) rows.Add("...#mmmprrpmmm#...");
                    else rows.Add("...#mmmmmmmmmm#...");
                }
                rows.Add("...#mwmwmwmwmw#...");
            }
            rows.Add(r3);
            rows.Add(r4);
            rows.Add(legsB ? LegsB : LegsA);
            return rows.ToArray();
        }

        public void Show(string[] rows, Color color)
        {
            if (current != null && color == currentColor && rows.SequenceEqual(current)) return;
            var brush = Palette.Brush(color);
            for (int y = 0; y < Rows; y++)
                for (int x = 0; x < Cols; x++)
                {
                    var cell = cells[y * Cols + x];
                    char ch = y < rows.Length ? rows[y][x] : '.';
                    Brush fill = ch == '#' ? brush : ch == 'w' ? Tooth : ch == 'm' ? Mouth : ch == 'p' ? Paper : ch == 'r' ? Red : null;
                    cell.Visibility = fill != null ? Visibility.Visible : Visibility.Hidden;
                    if (fill != null) cell.Fill = fill;
                }
            current = rows;
            currentColor = color;
        }
    }

    sealed class IslandWindow : Window
    {
        // Geometry (DIPs)
        const double WindowW = 900, WindowH = 760;
        const double Shoulder = 10;
        const double RowH = 48;
        const double ClosedW = 420;
        const double OpenW = 640;
        const double PanelTop = 62;
        const double PanelInset = 14;
        const double ClawdPx = 6;

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
        Path glowShape, body, edge;
        DropShadowEffect glow;
        Grid row;
        StackPanel left;
        Ellipse dot;
        DropShadowEffect dotGlow;
        TextBlock label, timeLabel;
        Border countBadge;
        TextBlock countText;
        StackPanel usageView;
        TextBlock usageKind, usagePct;
        Path ringValue;
        Clawd clawd;
        TranslateTransform clawdBob;
        TextBlock zzz;
        Border panel;
        StackPanel panelContent;

        StackPanel usagePanel;
        StackPanel sessionsPanel;
        Grid drop;
        Rectangle dropBorder;
        TextBlock dropHint;
        WrapPanel chips;
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
        bool firstPoll = true;
        bool pendingFlash;
        long demoStart;
        bool hiddenForFullscreen;
        long blinkUntil, nextBlink, nextGlance, waveUntil;
        // Eating a dropped file: the mouth opens as a file drag comes close,
        // then he chomps, chews twice and swallows before the island opens.
        Rectangle catcher;
        double mouth;
        bool fileDrag, nearDrag;
        long chompStart, chompUntil, happyUntil;
        const long ChompMs = 760;
        bool demoChomped;
        string glance = "c";
        IntPtr hwnd;
        WinForms.NotifyIcon tray;
        readonly List<string> attachments = new List<string>();
        string project;
        bool answerVisible;
        string answerSessionId;
        List<Session> lastSessions = new List<Session>();
        string usageKey, sessionsKey;

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
            SystemParameters.StaticPropertyChanged += (s, e) =>
            {
                if (e.PropertyName == "PrimaryScreenWidth")
                    Left = SystemParameters.PrimaryScreenWidth / 2 - WindowW / 2;
            };
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

        [StructLayout(LayoutKind.Sequential)] struct POINT { public int X, Y; }
        [StructLayout(LayoutKind.Sequential)] struct RECT { public int Left, Top, Right, Bottom; }
        [StructLayout(LayoutKind.Sequential)]
        struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }

        const int GWL_EXSTYLE = -20;
        const int WS_EX_TRANSPARENT = 0x20, WS_EX_TOOLWINDOW = 0x80, WS_EX_LAYERED = 0x80000, WS_EX_NOACTIVATE = 0x8000000;
        static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
        const uint SWP_NOSIZE = 0x1, SWP_NOMOVE = 0x2, SWP_NOACTIVATE = 0x10;

        void OnSourceInitialized(object sender, EventArgs e)
        {
            hwnd = new WindowInteropHelper(this).Handle;
            int ex = GetWindowLong(hwnd, GWL_EXSTYLE);
            SetWindowLong(hwnd, GWL_EXSTYLE, ex | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_LAYERED | WS_EX_NOACTIVATE);
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
            poll.Tick += (s, a) => Poll();
            poll.Start();

            var life = new DispatcherTimer(DispatcherPriority.Input) { Interval = TimeSpan.FromMilliseconds(40) };
            life.Tick += (s, a) => { CheckHover(); Animate(); };
            life.Start();

            // Re-assert "topmost" often: games and video players like to claim it too.
            var chores = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(500) };
            chores.Tick += (s, a) => { KeepOnTop(); CheckFullscreen(); };
            chores.Start();

            if (demoOnStart) StartDemo();
            Poll();
            StartRendering();

            // Last and guarded: a problem with the tray icon must never keep the island hidden.
            try { SetupTray(); }
            catch (Exception ex) { AppPaths.LogError("tray", ex); }
        }

        void KeepOnTop()
        {
            if (hwnd != IntPtr.Zero)
                SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
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
                        if (GetWindowRect(fg, out r) && GetMonitorInfo(mon, ref mi) && (mi.dwFlags & 1) != 0)
                            fullscreen = r.Left <= mi.rcMonitor.Left && r.Top <= mi.rcMonitor.Top &&
                                         r.Right >= mi.rcMonitor.Right && r.Bottom >= mi.rcMonitor.Bottom;
                    }
                }
            }
            catch { }
            // Stays visible over games and videos unless the user opted to hide it there.
            if (!settings.HideInFullscreen) fullscreen = false;
            if (fullscreen == hiddenForFullscreen) return;
            hiddenForFullscreen = fullscreen;
            canvas.BeginAnimation(OpacityProperty, new DoubleAnimation(fullscreen ? 0 : 1, TimeSpan.FromMilliseconds(fullscreen ? 180 : 320)));
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
            catcher = new Rectangle { Width = 360, Height = 240, Fill = Palette.Brush(Color.FromArgb(1, 0, 0, 0)), Visibility = Visibility.Collapsed };
            canvas.Children.Add(catcher);

            // Colored glow behind, the black island with a soft drop shadow, then a hairline edge.
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
            clawd = new Clawd(ClawdPx) { RenderTransform = clawdBob };
            canvas.Children.Add(clawd);
            zzz = Text(11, Palette.Secondary, FontWeights.Bold);
            zzz.Text = "z";
            zzz.Opacity = 0;
            canvas.Children.Add(zzz);
        }

        void BuildRow()
        {
            row = new Grid { Height = RowH };
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(Clawd.Cols * ClawdPx + 24) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            canvas.Children.Add(row);

            left = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
            dotGlow = new DropShadowEffect { ShadowDepth = 0, BlurRadius = 10, Color = Palette.Ready, Opacity = 0.9 };
            dot = new Ellipse { Width = 8, Height = 8, Fill = Palette.Brush(Palette.Ready), Effect = dotGlow, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 9, 0), RenderTransformOrigin = new Point(0.5, 0.5), RenderTransform = new ScaleTransform(1, 1) };
            label = new TextBlock { FontFamily = DisplayFont, FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = Palette.Brush(Palette.Text), VerticalAlignment = VerticalAlignment.Center };
            timeLabel = new TextBlock { FontFamily = DisplayFont, FontSize = 14, FontWeight = FontWeights.Medium, Foreground = Palette.Brush(Palette.Secondary), Margin = new Thickness(8, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center };
            Typography.SetNumeralAlignment(timeLabel, FontNumeralAlignment.Tabular);
            countText = Text(10.5, Color.FromRgb(216, 216, 220), FontWeights.SemiBold);
            countBadge = new Border { CornerRadius = new CornerRadius(6), Background = Palette.Brush(Palette.PanelLine), Padding = new Thickness(6, 1, 6, 2), Margin = new Thickness(8, 0, 0, 0), Child = countText, VerticalAlignment = VerticalAlignment.Center };
            left.Children.Add(dot);
            left.Children.Add(label);
            left.Children.Add(timeLabel);
            left.Children.Add(countBadge);
            row.Children.Add(left);

            usageView = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Center };
            usageKind = Text(10.5, Palette.Faint, FontWeights.SemiBold);
            usageKind.VerticalAlignment = VerticalAlignment.Center;
            usageKind.Margin = new Thickness(0, 0, 8, 0);
            var ring = new Grid { Width = 18, Height = 18, VerticalAlignment = VerticalAlignment.Center };
            ring.Children.Add(new Ellipse { Stroke = Palette.Brush(Color.FromRgb(38, 38, 43)), StrokeThickness = 2.6, Margin = new Thickness(0.0) });
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

        /// <summary>Arc for the usage ring (18 x 18, from 12 o'clock clockwise).</summary>
        static Geometry RingArc(double pct)
        {
            double p = Math.Max(0.001, Math.Min(99.9, pct)) / 100;
            double r = 7.7, c = 9;
            double a = p * 2 * Math.PI;
            var start = new Point(c, c - r);
            var end = new Point(c + r * Math.Sin(a), c - r * Math.Cos(a));
            var g = new StreamGeometry();
            using (var ctx = g.Open())
            {
                ctx.BeginFigure(start, false, false);
                ctx.ArcTo(end, new Size(r, r), 0, p > 0.5, SweepDirection.Clockwise, true, false);
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

            panelContent.Children.Add(SectionTitle("Nutzungslimit"));
            usagePanel = new StackPanel { Margin = new Thickness(0, 2, 0, 14) };
            panelContent.Children.Add(usagePanel);

            panelContent.Children.Add(SectionTitle("Sitzungen"));
            sessionsPanel = new StackPanel { Margin = new Thickness(0, 0, 0, 14) };
            panelContent.Children.Add(sessionsPanel);

            panelContent.Children.Add(SectionTitle("Frag Claude oder gib einen Befehl"));
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
            ToolTipService.SetToolTip(run, "Claude darf im Projekt Dateien bearbeiten (Strg+Enter)");
            ToolTipService.SetToolTip(term, "Claude Code im Projektordner öffnen");
            composer.Children.Add(actions);
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

        // ── Clawd lives ───────────────────────────────────────────────────

        /// <summary>Picks Clawd's pose and the small ambient motions; every 40 ms.</summary>
        void Animate()
        {
            long now = Clock.NowMs();
            if (now > nextBlink) { blinkUntil = now + 130; nextBlink = now + 2600 + random.Next(3200); }
            bool blink = now < blinkUntil;
            long since = now - modeSince;
            string[] pose;
            Color color = Palette.Clawd;

            // Mouth: chomp sequence after a drop, otherwise open wider the closer a file gets.
            bool food = false;
            double mouthTarget = 0;
            if (chompStart > 0)
            {
                long t = now - chompStart;
                if (t < 90) { mouthTarget = Clawd.MaxMouth; food = true; }
                else if (t < 210) mouthTarget = 0;
                else if (t < 330) mouthTarget = 2;
                else if (t < 450) mouthTarget = 0;
                else if (t < 570) mouthTarget = 2;
                else if (t < ChompMs) mouthTarget = 0;
                else
                {
                    // Gulp - then show the file in the opened island.
                    chompStart = 0;
                    happyUntil = now + 800;
                    hop.Velocity -= 240;
                    StartRendering();
                    if (attachments.Count > 0)
                    {
                        Activate();
                        input.Focus();
                    }
                    Refresh();
                }
                mouth = mouthTarget; // chomps are snappy
            }
            else
            {
                // Demo: a file approaches, then gets eaten.
                double dt = demoStart > 0 ? (now - demoStart) / 1000.0 : -1;
                if (dt >= 20.0 && dt < 21.6) mouthTarget = 1.6 + (dt - 20.0) / 1.6 * (Clawd.MaxMouth - 1.6);
                else if (dt >= 21.6 && !demoChomped)
                {
                    demoChomped = true;
                    chompStart = now;
                }
                if (fileDrag)
                {
                    double d = DistanceToMouth();
                    mouthTarget = Math.Max(1.6, Math.Min(Clawd.MaxMouth, (230 - d) / 160 * Clawd.MaxMouth));
                }
                mouth += (mouthTarget - mouth) * 0.35;
                if (Math.Abs(mouth - mouthTarget) < 0.05) mouth = mouthTarget;
            }
            int mouthRows = (int)Math.Round(mouth);

            bool demoDrag = demoStart > 0 && (now - demoStart) >= 20000 && (now - demoStart) < 21600;
            if (mouthRows > 0 || fileDrag || chompStart > 0)
                pose = Clawd.Pose("c", fileDrag || demoDrag || food ? "up" : "side", false, false, mouthRows, food);
            else if (now < happyUntil)
                pose = Clawd.Pose("c", "side", false, true);
            else if (dragOver) pose = Clawd.Pose("c", "up", false, false);
            else if (now < waveUntil) pose = Clawd.Pose(blink ? "shut" : "c", (now / 180) % 2 == 1 ? "wave" : "side", false, false);
            else
            {
                switch (mode)
                {
                    case Mode.Busy:
                    {
                        bool f = (now / 170) % 2 == 1;
                        string eyes = new[] { "l", "c", "r", "c" }[(now / 900) % 4];
                        pose = Clawd.Pose(blink ? "shut" : eyes, f ? "down" : "side", f, false);
                        break;
                    }
                    case Mode.Waiting:
                        pose = Clawd.Pose(blink ? "shut" : "c", (now / 260) % 2 == 1 ? "up" : "side", false, false);
                        break;
                    case Mode.Done:
                        pose = Clawd.Pose("c", since < 900 ? "up" : "side", false, true);
                        break;
                    case Mode.Error:
                        pose = Clawd.Pose("shut", "side", false, false);
                        color = Color.FromRgb(168, 87, 74);
                        break;
                    case Mode.None:
                        pose = Clawd.Pose("shut", "side", false, false);
                        color = Color.FromRgb(154, 90, 70);
                        break;
                    default:
                        if (now > nextGlance)
                        {
                            glance = new[] { "l", "c", "r", "c", "c" }[random.Next(5)];
                            nextGlance = now + 1800 + random.Next(3500);
                        }
                        pose = Clawd.Pose(blink ? "shut" : glance, "side", false, false);
                        break;
                }
            }
            clawd.Show(pose, color);

            // Waiting: little hops. Asleep: z's drift up.
            clawdBob.Y = mode == Mode.Waiting && !dragOver ? -Math.Abs(Math.Sin(now / 260.0)) * 3 : 0;
            if (mode == Mode.None)
            {
                double p = (now % 2400) / 2400.0;
                zzz.Opacity = p < 0.3 ? p / 0.3 * 0.9 : 0.9 * (1 - (p - 0.3) / 0.7);
                zzz.RenderTransform = new TranslateTransform(p * 10, -p * 14);
            }
            else zzz.Opacity = 0;

            // The status dot breathes while something is going on.
            double pulse = mode == Mode.Busy ? 1 - 0.3 * (0.5 + 0.5 * Math.Sin(now / 190.0))
                         : mode == Mode.Waiting ? 1 - 0.3 * (0.5 + 0.5 * Math.Sin(now / 110.0)) : 1;
            var st = (ScaleTransform)dot.RenderTransform;
            st.ScaleX = st.ScaleY = pulse;
        }

        // ── state → visuals ──────────────────────────────────────────────

        void Poll()
        {
            long now = Clock.NowMs();
            List<Session> sessions;
            Usage usage;
            if (demoStart > 0)
            {
                double t = (now - demoStart) / 1000.0;
                if (t > Demo.Length)
                {
                    demoStart = 0;
                    demoOpen = false;
                    sessions = store.Load();
                    usage = Usage.Load();
                }
                else
                {
                    sessions = Demo.At(t, demoStart);
                    usage = Demo.FakeUsage(demoStart);
                    demoOpen = t > 15.4 && t < 19.6;
                }
            }
            else
            {
                sessions = store.Load();
                usage = Usage.Load();
            }
            lastSessions = sessions;

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
                }
                else if (m == Mode.Waiting)
                {
                    shake.Velocity += 480;
                    StartRendering();
                    if (settings.Sound) System.Media.SystemSounds.Exclamation.Play();
                }
            }
            firstPoll = false;

            Mode overall = sessions.Count > 0 ? Mode.Ready : Mode.None;
            Func<Mode, int> count = x => sessions.Count(s => SessionStore.DisplayMode(s, now) == x);
            int waiting = count(Mode.Waiting), busy = count(Mode.Busy), done = count(Mode.Done), error = count(Mode.Error);
            if (waiting > 0) overall = Mode.Waiting;
            else if (busy > 0) overall = Mode.Busy;
            else if (error > 0) overall = Mode.Error;
            else if (done > 0) overall = Mode.Done;

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
                case Mode.Ready: text = "Bereit"; break;
                default: text = "Schläft"; break;
            }

            ApplyMode(overall, now);
            if (pendingFlash) { pendingFlash = false; Celebrate(); }
            label.Text = text;
            timeLabel.Text = time;
            timeLabel.Visibility = time.Length > 0 ? Visibility.Visible : Visibility.Collapsed;
            label.Foreground = overall == Mode.Busy ? ShimmerBrush() : Palette.Brush(Palette.Text);
            countBadge.Visibility = sessions.Count > 1 ? Visibility.Visible : Visibility.Collapsed;
            countText.Text = sessions.Count.ToString();

            UpdateUsage(usage);
            UpdateSessions(sessions, now);
            if (open) UpdateProjectLabel();
            Refresh();
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

        /// <summary>Clawd jumps for joy and the island glows green.</summary>
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

        // ── usage ─────────────────────────────────────────────────────────

        void UpdateUsage(Usage u)
        {
            string key = Math.Round(u.FiveHour) + "|" + Math.Round(u.SevenDay) + "|" + Usage.ResetText(u.FiveHourResets) + "|" + Usage.ResetText(u.SevenDayResets);
            if (key == usageKey) return;
            usageKey = key;

            double headline = u.FiveHour >= 0 ? u.FiveHour : u.SevenDay;
            usageView.Visibility = headline >= 0 ? Visibility.Visible : Visibility.Hidden;
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
            string reset = Usage.ResetText(resets);
            v.Text = Math.Round(pct) + " %" + (reset.Length > 0 ? " · Reset " + reset : "");
            Grid.SetColumn(v, 2);
            g.Children.Add(v);
            return g;
        }

        // ── sessions ──────────────────────────────────────────────────────

        void UpdateSessions(List<Session> sessions, long now)
        {
            var lines = new List<Tuple<Color, string, string, string>>();
            foreach (var s in sessions.Take(3))
            {
                Mode m = SessionStore.DisplayMode(s, now);
                string detail, right = s.Context >= 0 ? "Kontext " + s.Context + " %" : "";
                switch (m)
                {
                    case Mode.Busy:
                        detail = s.Detail.Length > 0 ? s.Detail : "Denkt nach …";
                        if (s.TurnStart > 0) right = Clock.Duration(now - s.TurnStart) + (right.Length > 0 ? " · " + right : "");
                        break;
                    case Mode.Waiting:
                        detail = s.Tool.Length > 0 ? "Freigabe: " + s.Detail : (s.Detail.Length > 0 ? s.Detail : "Wartet auf deine Antwort");
                        break;
                    case Mode.Done:
                        detail = "Fertig – wartet auf deinen nächsten Befehl";
                        if (s.Duration > 0) right = Clock.Duration(s.Duration) + (right.Length > 0 ? " · " + right : "");
                        break;
                    case Mode.Error:
                        detail = s.Detail.Length > 0 ? "Fehler · " + s.Detail : "Abbruch mit Fehler";
                        break;
                    default:
                        detail = "Bereit für den nächsten Befehl";
                        break;
                }
                lines.Add(Tuple.Create(Palette.For(m), s.Project + (s.Model.Length > 0 ? "  ·  " + s.Model : ""), detail, right));
            }
            string key = string.Join("\n", lines.Select(l => l.Item1 + l.Item2 + l.Item3 + l.Item4));
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
                var r = new Grid();
                if (i > 0) r.Children.Add(new Border { Height = 1, Background = Palette.Brush(Color.FromRgb(26, 26, 29)), VerticalAlignment = VerticalAlignment.Top });
                var g = new Grid { Margin = new Thickness(0, 7, 0, 7) };
                g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(16) });
                g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
                g.Children.Add(new Ellipse { Width = 7, Height = 7, Fill = Palette.Brush(l.Item1), VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = HorizontalAlignment.Left });
                var texts = new TextBlock { TextTrimming = TextTrimming.CharacterEllipsis, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 12, 0) };
                texts.Inlines.Add(new System.Windows.Documents.Run(l.Item2) { FontFamily = UiFont, FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Palette.Brush(Palette.Text) });
                texts.Inlines.Add(new System.Windows.Documents.Run("   " + l.Item3) { FontFamily = UiFont, FontSize = 12, Foreground = Palette.Brush(Palette.Secondary) });
                Grid.SetColumn(texts, 1);
                g.Children.Add(texts);
                var right = Text(12, Palette.Secondary, FontWeights.Normal);
                Typography.SetNumeralAlignment(right, FontNumeralAlignment.Tabular);
                right.Text = l.Item4;
                right.VerticalAlignment = VerticalAlignment.Center;
                Grid.SetColumn(right, 2);
                g.Children.Add(right);
                r.Children.Add(g);
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
            dropHint.Text = dragOver ? "Loslassen – Clawd fängt sie!" : "PDF oder Datei hierher ziehen – Clawd fängt sie.";
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
            // Over an already open island the drop zone lights up as well.
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
            if (files != null && files.Any(File.Exists))
            {
                foreach (var f in files.Where(File.Exists))
                    if (!attachments.Contains(f, StringComparer.OrdinalIgnoreCase)) attachments.Add(f);
                RenderChips();
                // Chomp! The island opens once he has swallowed it (see Animate).
                long now = Clock.NowMs();
                chompStart = now;
                chompUntil = now + ChompMs + 60;
            }
            Refresh();
        }

        /// <summary>Distance (DIPs) from the cursor to Clawd's mouth.</summary>
        double DistanceToMouth()
        {
            POINT p;
            if (!GetCursorPos(out p) || PresentationSource.FromVisual(canvas) == null) return double.MaxValue;
            Point local = canvas.PointFromScreen(new Point(p.X, p.Y));
            double mx = Canvas.GetLeft(clawd) + clawd.Width / 2;
            double my = Canvas.GetTop(clawd) + 3.5 * ClawdPx;
            return Math.Sqrt((local.X - mx) * (local.X - mx) + (local.Y - my) * (local.Y - my));
        }

        void RenderChips()
        {
            chips.Children.Clear();
            foreach (var f in attachments)
            {
                string file = f;
                bool pdf = file.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);
                var panelRow = new StackPanel { Orientation = Orientation.Horizontal };
                var kind = Text(9.5, Colors.White, FontWeights.Bold);
                kind.Text = pdf ? "PDF" : "DATEI";
                var tag = new Border { Child = kind, CornerRadius = new CornerRadius(4), Background = Palette.Brush(pdf ? Color.FromRgb(229, 72, 77) : Color.FromRgb(70, 70, 78)), Padding = new Thickness(5, 1, 5, 2), Margin = new Thickness(0, 0, 7, 0), VerticalAlignment = VerticalAlignment.Center };
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

        // ── open / close ─────────────────────────────────────────────────

        bool Pinned
        {
            get
            {
                return input.IsKeyboardFocusWithin || input.Text.Length > 0 || attachments.Count > 0 ||
                       answerVisible || runner.Running || demoOpen;
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

            if (inside) { leftSince = 0; if (hoverSince == 0) hoverSince = now; }
            else { hoverSince = 0; if (leftSince == 0) leftSince = now; }

            // While the mouse button is held near Clawd, a file may be on its way:
            // take drops there so his mouth can open, but don't unfold the island.
            nearDrag = dragging && DistanceToMouth() < 240;
            if (!dragging && fileDrag && chompStart == 0) fileDrag = false; // drag ended elsewhere
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
                if (open) waveUntil = now + 900; // Clawd says hi
                else Keyboard.ClearFocus();
                Refresh();
            }
        }

        /// <summary>Recompute the target size and the panel's look.</summary>
        void Refresh()
        {
            bool show = open || dragOver;
            panel.BeginAnimation(OpacityProperty, new DoubleAnimation(show ? 1 : 0, TimeSpan.FromMilliseconds(show ? 260 : 100))
            {
                BeginTime = TimeSpan.FromMilliseconds(show ? 120 : 0)
            });
            UpdateDropHint();
            UpdateTargets();
        }

        void UpdateTargets()
        {
            bool show = open || dragOver;
            double w = ClosedW, h = RowH;
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

            // Clawd sits on the island's floor with his legs dangling out; when open he stays in the header.
            double cy = Math.Min(h, RowH) - 5 * ClawdPx + hop.Value;
            Canvas.SetLeft(clawd, Math.Round(x + w / 2 - clawd.Width / 2));
            Canvas.SetTop(clawd, Math.Round(cy));
            Canvas.SetLeft(catcher, x + w / 2 - catcher.Width / 2);
            Canvas.SetTop(catcher, 0);
            Canvas.SetLeft(zzz, x + w / 2 + clawd.Width / 2 - 6);
            Canvas.SetTop(zzz, cy + 2);
        }

        /// <summary>Dynamic-Island silhouette: concave shoulders at the screen edge, smooth bottom corners.</summary>
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
            menu.Items.Add("Animation vorführen", null, (s, e) => Dispatcher.BeginInvoke(new Action(StartDemo)));
            menu.Items.Add("Claude Code öffnen", null, (s, e) => Dispatcher.BeginInvoke(new Action(() => SafeRun(() => ClaudeRunner.OpenTerminal(CurrentProject(), null)))));
            var sound = new WinForms.ToolStripMenuItem("Ton bei Fertig / Freigabe") { Checked = settings.Sound, CheckOnClick = true };
            sound.CheckedChanged += (s, e) => { settings.Sound = sound.Checked; settings.Save(); };
            menu.Items.Add(sound);
            var hide = new WinForms.ToolStripMenuItem("Bei Vollbild (Spiele, Videos) ausblenden") { Checked = settings.HideInFullscreen, CheckOnClick = true };
            hide.CheckedChanged += (s, e) => { settings.HideInFullscreen = hide.Checked; settings.Save(); Dispatcher.BeginInvoke(new Action(CheckFullscreen)); };
            menu.Items.Add(hide);
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
            tray.MouseClick += (s, e) => { if (e.Button == WinForms.MouseButtons.Left) Dispatcher.BeginInvoke(new Action(StartDemo)); };
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
            var rows = Clawd.Pose("c", "side", false, false);
            using (var bmp = new Drawing.Bitmap(32, 32))
            {
                using (var g = Drawing.Graphics.FromImage(bmp))
                using (var b = new Drawing.SolidBrush(Drawing.Color.FromArgb(215, 119, 87)))
                {
                    g.Clear(Drawing.Color.Transparent);
                    for (int y = 1; y < rows.Length; y++)
                        for (int x = 0; x < Clawd.Cols; x++)
                            if (rows[y][x] == '#') g.FillRectangle(b, 2 + (x - 1) * 1.75f, 8 + (y - 1) * 3.2f, 1.75f, 3.2f);
                }
                return Drawing.Icon.FromHandle(bmp.GetHicon());
            }
        }
    }
}
