// Claude Island - the window.
//
// At rest the island is a little black block monster hanging from the top edge
// of the screen: its eyes show what Claude Code is doing, the left cheek says it
// in words, the right cheek shows the 5-hour usage limit. Hover it and the jaw
// drops open: inside are the usage limits, the running sessions and a drop zone
// where a PDF (or any file) plus a question or a command goes straight to Claude.

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
        public static readonly Color Body = Color.FromRgb(0, 0, 0);
        public static readonly Color Text = Color.FromRgb(245, 245, 247);
        public static readonly Color Secondary = Color.FromRgb(160, 152, 156);
        public static readonly Color Busy = Color.FromRgb(255, 140, 90);
        public static readonly Color Ready = Color.FromRgb(52, 211, 153);
        public static readonly Color Waiting = Color.FromRgb(251, 191, 36);
        public static readonly Color Error = Color.FromRgb(248, 113, 113);
        public static readonly Color Idle = Color.FromRgb(110, 110, 118);
        public static readonly Color Tooth = Color.FromRgb(250, 248, 244);
        public static readonly Color MouthTop = Color.FromRgb(70, 16, 28);
        public static readonly Color MouthBottom = Color.FromRgb(28, 6, 11);
        public static readonly Color Panel = Color.FromArgb(150, 10, 2, 4);
        public static readonly Color Chip = Color.FromRgb(58, 22, 30);

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

    sealed class IslandWindow : Window
    {
        // Geometry (DIPs). Px is the monster's "pixel".
        const double WindowW = 860, WindowH = 680;
        const double Px = 4;
        const double Shoulder = Px * 2;
        const double HeadH = 40;
        const double ClosedMinW = 340;
        const double OpenW = 600;
        const double PadX = 18;
        const double MouthInset = 12;
        const double ToothW = 8, ToothH = 9, ToothGap = 8;

        readonly bool demoOnStart;
        readonly SessionStore store = new SessionStore();
        readonly Settings settings = Settings.Load();
        readonly ClaudeRunner runner = new ClaudeRunner();
        readonly Random random = new Random();

        // Physics
        readonly Spring width = new Spring(60, 380, 28);
        readonly Spring height = new Spring(0, 340, 24);
        readonly Spring shake = new Spring(0, 1100, 14);
        bool rendering;
        TimeSpan lastRender;

        // Visual tree
        Canvas canvas;
        Path body;
        DropShadowEffect glow;
        Grid head;
        TextBlock label, timeLabel;
        Border countBadge;
        TextBlock countText;
        StackPanel usagePill;
        Border usageMiniFill;
        TextBlock usageMiniText;
        Canvas eyes;
        Grid eyeL, eyeR;
        Rectangle eyeLFill, eyeRFill;
        Path happyEyes, crossEyes;
        TranslateTransform eyesShift;
        ScaleTransform eyesScale;
        Rectangle fangL, fangR;
        TranslateTransform fangsChew;
        Canvas mouth;
        Rectangle mouthBg;
        Canvas upperTeeth, lowerTeeth;
        StackPanel mouthContent;

        // Mouth content
        StackPanel usagePanel;
        StackPanel sessionsPanel;
        Grid dropZone;
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
        bool open, interactive, dragOver, demoOpen;
        long hoverSince, leftSince;
        readonly Dictionary<string, Mode> lastModes = new Dictionary<string, Mode>();
        bool firstPoll = true;
        bool pendingFlash;
        long demoStart;
        bool hiddenForFullscreen;
        long nextBlink, nextGlance;
        IntPtr hwnd;
        WinForms.NotifyIcon tray;
        readonly List<string> attachments = new List<string>();
        string project;
        bool answerVisible;
        string answerSessionId;
        List<Session> lastSessions = new List<Session>();

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
            TextOptions.SetTextFormattingMode(this, TextFormattingMode.Display);
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
            DragLeave += (s, e) => { dragOver = false; Refresh(); };
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

        /// <summary>
        /// Click-through while closed; takes mouse, drops and keyboard while the
        /// cursor is on it or the mouth is open.
        /// </summary>
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
            SetupTray();

            var poll = new DispatcherTimer(DispatcherPriority.Background) { Interval = TimeSpan.FromMilliseconds(250) };
            poll.Tick += (s, a) => Poll();
            poll.Start();

            var life = new DispatcherTimer(DispatcherPriority.Input) { Interval = TimeSpan.FromMilliseconds(40) };
            life.Tick += (s, a) => { CheckHover(); Live(); };
            life.Start();

            var chores = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1.5) };
            chores.Tick += (s, a) => { KeepOnTop(); CheckFullscreen(); };
            chores.Start();

            long now = Clock.NowMs();
            nextBlink = now + 1800;
            nextGlance = now + 3500;
            if (demoOnStart) StartDemo();
            Poll();
            StartRendering();
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
            if (fullscreen == hiddenForFullscreen) return;
            hiddenForFullscreen = fullscreen;
            var anim = new DoubleAnimation(fullscreen ? 0 : 1, TimeSpan.FromMilliseconds(fullscreen ? 180 : 320));
            canvas.BeginAnimation(OpacityProperty, anim);
        }

        // ── visual tree ───────────────────────────────────────────────────

        static readonly FontFamily UiFont = new FontFamily("Segoe UI Variable Text, Segoe UI");

        static TextBlock Text(double size, Color color, FontWeight weight)
        {
            return new TextBlock { FontFamily = UiFont, FontSize = size, Foreground = Palette.Brush(color), FontWeight = weight };
        }

        void BuildVisualTree()
        {
            canvas = new Canvas { Width = WindowW, Height = WindowH };
            Content = canvas;

            glow = new DropShadowEffect { ShadowDepth = 0, BlurRadius = 28, Color = Colors.Black, Opacity = 0.55, RenderingBias = RenderingBias.Performance };
            body = new Path { Fill = Palette.Brush(Palette.Body), Effect = glow };
            canvas.Children.Add(body);

            // Fangs hang below the closed head.
            fangsChew = new TranslateTransform();
            fangL = new Rectangle { Width = 6, Height = 7, Fill = Palette.Brush(Palette.Tooth), RenderTransform = fangsChew };
            fangR = new Rectangle { Width = 6, Height = 7, Fill = Palette.Brush(Palette.Tooth), RenderTransform = fangsChew };
            canvas.Children.Add(fangL);
            canvas.Children.Add(fangR);

            BuildMouth();
            BuildHead();
        }

        void BuildHead()
        {
            head = new Grid { Height = HeadH };
            head.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            head.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            head.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            canvas.Children.Add(head);

            // Left cheek: status in words.
            var status = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = HorizontalAlignment.Left };
            label = Text(13, Palette.Text, FontWeights.SemiBold);
            timeLabel = Text(13, Palette.Secondary, FontWeights.Normal);
            Typography.SetNumeralAlignment(timeLabel, FontNumeralAlignment.Tabular);
            countText = Text(10.5, Palette.Text, FontWeights.SemiBold);
            countBadge = new Border { CornerRadius = new CornerRadius(3), Background = Palette.Brush(Color.FromRgb(44, 44, 50)), Padding = new Thickness(5, 0, 5, 1), Margin = new Thickness(7, 1, 0, 0), Child = countText, VerticalAlignment = VerticalAlignment.Center };
            status.Children.Add(label);
            status.Children.Add(timeLabel);
            status.Children.Add(countBadge);
            head.Children.Add(status);

            // Eyes in the middle.
            eyes = new Canvas { Width = 48, Height = 16, Margin = new Thickness(14, 0, 14, 0), VerticalAlignment = VerticalAlignment.Center };
            eyesShift = new TranslateTransform();
            eyesScale = new ScaleTransform(1, 1, 24, 8);
            var eyeTransforms = new TransformGroup();
            eyeTransforms.Children.Add(eyesScale);
            eyeTransforms.Children.Add(eyesShift);
            eyes.RenderTransform = eyeTransforms;
            eyeL = MakeEye(out eyeLFill);
            eyeR = MakeEye(out eyeRFill);
            Canvas.SetLeft(eyeL, 4);
            Canvas.SetLeft(eyeR, 34);
            Canvas.SetTop(eyeL, 2);
            Canvas.SetTop(eyeR, 2);
            eyes.Children.Add(eyeL);
            eyes.Children.Add(eyeR);
            happyEyes = new Path
            {
                Data = Geometry.Parse("M 3,12 L 9,5 L 15,12 M 33,12 L 39,5 L 45,12"),
                StrokeThickness = 3.2, StrokeStartLineCap = PenLineCap.Square, StrokeEndLineCap = PenLineCap.Square,
                StrokeLineJoin = PenLineJoin.Miter, Stroke = Palette.Brush(Palette.Ready), Visibility = Visibility.Collapsed
            };
            crossEyes = new Path
            {
                Data = Geometry.Parse("M 4,3 L 14,13 M 14,3 L 4,13 M 34,3 L 44,13 M 44,3 L 34,13"),
                StrokeThickness = 3, StrokeStartLineCap = PenLineCap.Square, StrokeEndLineCap = PenLineCap.Square,
                Stroke = Palette.Brush(Palette.Error), Visibility = Visibility.Collapsed
            };
            eyes.Children.Add(happyEyes);
            eyes.Children.Add(crossEyes);
            Grid.SetColumn(eyes, 1);
            head.Children.Add(eyes);

            // Right cheek: the 5-hour usage limit.
            usagePill = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = HorizontalAlignment.Right };
            var miniTrack = new Border { Width = 34, Height = 6, Background = Palette.Brush(Color.FromRgb(46, 46, 52)), VerticalAlignment = VerticalAlignment.Center };
            usageMiniFill = new Border { Height = 6, HorizontalAlignment = HorizontalAlignment.Left, Background = Palette.Brush(Palette.Ready) };
            miniTrack.Child = usageMiniFill;
            usageMiniText = Text(12, Palette.Secondary, FontWeights.Normal);
            usageMiniText.Margin = new Thickness(7, 0, 0, 1);
            Typography.SetNumeralAlignment(usageMiniText, FontNumeralAlignment.Tabular);
            usagePill.Children.Add(Text(11, Palette.Secondary, FontWeights.SemiBold));
            ((TextBlock)usagePill.Children[0]).Text = "5h";
            ((TextBlock)usagePill.Children[0]).Margin = new Thickness(0, 0, 6, 1);
            usagePill.Children.Add(miniTrack);
            usagePill.Children.Add(usageMiniText);
            Grid.SetColumn(usagePill, 2);
            head.Children.Add(usagePill);
        }

        static Grid MakeEye(out Rectangle fill)
        {
            var g = new Grid { Width = 10, Height = 12, RenderTransformOrigin = new Point(0.5, 0.5), RenderTransform = new ScaleTransform(1, 1) };
            fill = new Rectangle { Fill = Palette.Brush(Palette.Ready) };
            g.Children.Add(fill);
            g.Children.Add(new Rectangle { Width = 3, Height = 3, Fill = Palette.Brush(Color.FromArgb(220, 255, 255, 255)), HorizontalAlignment = HorizontalAlignment.Left, VerticalAlignment = VerticalAlignment.Top, Margin = new Thickness(2, 2, 0, 0) });
            return g;
        }

        void BuildMouth()
        {
            mouth = new Canvas { ClipToBounds = true };
            canvas.Children.Add(mouth);
            var gradient = new LinearGradientBrush(Palette.MouthTop, Palette.MouthBottom, 90);
            gradient.Freeze();
            mouthBg = new Rectangle { Fill = gradient, RadiusX = 3, RadiusY = 3 };
            mouth.Children.Add(mouthBg);

            mouthContent = new StackPanel { Opacity = 0 };
            mouth.Children.Add(mouthContent);
            upperTeeth = new Canvas { Height = ToothH };
            lowerTeeth = new Canvas { Height = ToothH };
            mouth.Children.Add(upperTeeth);
            mouth.Children.Add(lowerTeeth);

            // 1) Usage limits
            mouthContent.Children.Add(SectionTitle("Nutzungslimit"));
            usagePanel = new StackPanel { Margin = new Thickness(0, 4, 0, 12) };
            mouthContent.Children.Add(usagePanel);

            // 2) Sessions
            mouthContent.Children.Add(SectionTitle("Sitzungen"));
            sessionsPanel = new StackPanel { Margin = new Thickness(0, 4, 0, 12) };
            mouthContent.Children.Add(sessionsPanel);

            // 3) Drop zone + composer
            mouthContent.Children.Add(SectionTitle("Frag Claude oder gib einen Befehl"));
            dropZone = new Grid { Margin = new Thickness(0, 6, 0, 0), MinHeight = 96 };
            dropBorder = new Rectangle
            {
                RadiusX = 8, RadiusY = 8, StrokeThickness = 1.5, StrokeDashArray = new DoubleCollection { 4, 3 },
                Stroke = Palette.Brush(Color.FromArgb(120, 255, 200, 200)), Fill = Palette.Brush(Palette.Panel)
            };
            dropZone.Children.Add(dropBorder);
            var composer = new StackPanel { Margin = new Thickness(12, 10, 12, 10) };
            dropZone.Children.Add(composer);

            dropHint = Text(11.5, Palette.Secondary, FontWeights.Normal);
            dropHint.Text = "PDF oder Datei hier reinwerfen – ich fress sie und Claude liest sie.";
            composer.Children.Add(dropHint);
            chips = new WrapPanel { Margin = new Thickness(0, 6, 0, 0) };
            composer.Children.Add(chips);

            var inputHost = new Grid { Margin = new Thickness(0, 6, 0, 0) };
            input = new TextBox
            {
                FontFamily = UiFont, FontSize = 13.5, Foreground = Palette.Brush(Palette.Text), CaretBrush = Palette.Brush(Palette.Busy),
                Background = Brushes.Transparent, BorderThickness = new Thickness(0), AcceptsReturn = true, TextWrapping = TextWrapping.Wrap,
                MinHeight = 22, MaxHeight = 90, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Padding = new Thickness(0),
                SelectionBrush = Palette.Brush(Palette.Busy)
            };
            placeholder = Text(13.5, Color.FromRgb(130, 110, 116), FontWeights.Normal);
            placeholder.Text = "Was soll Claude tun? z. B. „Was steht in der PDF zur Kündigungsfrist?“";
            placeholder.IsHitTestVisible = false;
            placeholder.TextTrimming = TextTrimming.CharacterEllipsis;
            input.TextChanged += (s, e) => { placeholder.Visibility = input.Text.Length == 0 ? Visibility.Visible : Visibility.Collapsed; Refresh(); };
            input.PreviewKeyDown += OnInputKey;
            inputHost.Children.Add(placeholder);
            inputHost.Children.Add(input);
            composer.Children.Add(inputHost);

            var actions = new DockPanel { Margin = new Thickness(0, 10, 0, 0), LastChildFill = false };
            projectText = Text(12, Palette.Text, FontWeights.Normal);
            projectButton = MakeButton(projectText, false, ShowProjectMenu);
            DockPanel.SetDock(projectButton, Dock.Left);
            actions.Children.Add(projectButton);
            var ask = MakeButton("Fragen  ↵", true, () => Send(false));
            var run = MakeButton("Ausführen", false, () => Send(true));
            var term = MakeButton("Terminal", false, () => SafeRun(() => ClaudeRunner.OpenTerminal(CurrentProject(), null)));
            foreach (var b in new[] { ask, run, term })
            {
                DockPanel.SetDock(b, Dock.Right);
                b.Margin = new Thickness(6, 0, 0, 0);
                actions.Children.Add(b);
            }
            ToolTipService.SetToolTip(ask, "Claude antwortet hier im Maul (nur lesen, nichts ändern)");
            ToolTipService.SetToolTip(run, "Claude darf im Projekt Dateien bearbeiten");
            ToolTipService.SetToolTip(term, "Claude Code im Projektordner öffnen");
            composer.Children.Add(actions);
            mouthContent.Children.Add(dropZone);

            // 4) Answer
            answerPanel = new StackPanel { Margin = new Thickness(0, 12, 0, 0), Visibility = Visibility.Collapsed };
            activityText = Text(11.5, Palette.Busy, FontWeights.SemiBold);
            answerPanel.Children.Add(activityText);
            answerBox = new TextBox
            {
                FontFamily = UiFont, FontSize = 13, Foreground = Palette.Brush(Palette.Text), Background = Brushes.Transparent,
                BorderThickness = new Thickness(0), IsReadOnly = true, TextWrapping = TextWrapping.Wrap, Padding = new Thickness(0),
                SelectionBrush = Palette.Brush(Palette.Busy)
            };
            answerScroll = new ScrollViewer { Content = answerBox, MaxHeight = 190, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Margin = new Thickness(0, 6, 0, 0) };
            answerPanel.Children.Add(answerScroll);
            var answerActions = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 10, 0, 0) };
            continueButton = MakeButton("Im Terminal weiter", false, () => SafeRun(() => ClaudeRunner.OpenTerminal(CurrentProject(), answerSessionId)));
            var copy = MakeButton("Kopieren", false, () => SafeRun(() => Clipboard.SetText(answerBox.Text)));
            var clear = MakeButton("Schließen", false, ClearComposer);
            copy.Margin = clear.Margin = new Thickness(6, 0, 0, 0);
            answerActions.Children.Add(continueButton);
            answerActions.Children.Add(copy);
            answerActions.Children.Add(clear);
            answerPanel.Children.Add(answerActions);
            mouthContent.Children.Add(answerPanel);

            UpdateProjectLabel();
        }

        static TextBlock SectionTitle(string text)
        {
            var t = Text(10.5, Color.FromRgb(214, 160, 170), FontWeights.Bold);
            t.Text = text.ToUpperInvariant();
            return t;
        }

        static Border MakeButton(string text, bool primary, Action onClick)
        {
            var t = Text(12, primary ? Color.FromRgb(20, 8, 4) : Palette.Text, FontWeights.SemiBold);
            t.Text = text;
            return MakeButton(t, primary, onClick);
        }

        static Border MakeButton(TextBlock content, bool primary, Action onClick)
        {
            var normal = primary ? Palette.Brush(Palette.Busy) : Palette.Brush(Color.FromArgb(70, 255, 255, 255));
            var hover = primary ? Palette.Brush(Color.FromRgb(255, 170, 130)) : Palette.Brush(Color.FromArgb(110, 255, 255, 255));
            var b = new Border { Child = content, Background = normal, CornerRadius = new CornerRadius(4), Padding = new Thickness(10, 5, 10, 6), Cursor = Cursors.Hand };
            b.MouseEnter += (s, e) => b.Background = hover;
            b.MouseLeave += (s, e) => b.Background = normal;
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

        static Storyboard Forever(DependencyObject target, PropertyPath property, double from, double to, double seconds, bool reverse, IEasingFunction ease)
        {
            var a = new DoubleAnimation(from, to, TimeSpan.FromSeconds(seconds));
            a.AutoReverse = reverse;
            a.RepeatBehavior = RepeatBehavior.Forever;
            a.EasingFunction = ease;
            Storyboard.SetTarget(a, target);
            Storyboard.SetTargetProperty(a, property);
            var sb = new Storyboard();
            sb.Children.Add(a);
            return sb;
        }

        // ── the monster lives ────────────────────────────────────────────

        /// <summary>Blinks and glances; called every 40 ms.</summary>
        void Live()
        {
            long now = Clock.NowMs();
            if (now >= nextBlink)
            {
                nextBlink = now + (mode == Mode.Waiting ? 1400 : 2400 + random.Next(3600));
                if (mode != Mode.None && mode != Mode.Done && mode != Mode.Error) Blink();
            }
            if (now >= nextGlance && mode == Mode.Ready && !open)
            {
                nextGlance = now + 3500 + random.Next(4500);
                double x = new[] { -4.0, 0, 4.0, 0 }[random.Next(4)];
                eyesShift.BeginAnimation(TranslateTransform.XProperty, new DoubleAnimation(x, TimeSpan.FromMilliseconds(260)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } });
            }
        }

        void Blink()
        {
            var a = new DoubleAnimationUsingKeyFrames();
            a.KeyFrames.Add(new LinearDoubleKeyFrame(0.12, KeyTime.FromTimeSpan(TimeSpan.FromMilliseconds(70))));
            a.KeyFrames.Add(new LinearDoubleKeyFrame(1, KeyTime.FromTimeSpan(TimeSpan.FromMilliseconds(160))));
            eyeL.RenderTransform.BeginAnimation(ScaleTransform.ScaleYProperty, a);
            eyeR.RenderTransform.BeginAnimation(ScaleTransform.ScaleYProperty, a);
        }

        void SetEyes(Mode m)
        {
            Color c = Palette.For(m);
            eyeLFill.Fill = eyeRFill.Fill = Palette.Brush(c);
            bool squares = m != Mode.Done && m != Mode.Error;
            eyeL.Visibility = eyeR.Visibility = squares ? Visibility.Visible : Visibility.Collapsed;
            happyEyes.Visibility = m == Mode.Done ? Visibility.Visible : Visibility.Collapsed;
            crossEyes.Visibility = m == Mode.Error ? Visibility.Visible : Visibility.Collapsed;

            // Asleep without sessions: eyes closed to slits.
            double sleepy = m == Mode.None ? 0.18 : 1;
            eyeL.RenderTransform.BeginAnimation(ScaleTransform.ScaleYProperty, null);
            eyeR.RenderTransform.BeginAnimation(ScaleTransform.ScaleYProperty, null);
            ((ScaleTransform)eyeL.RenderTransform).ScaleY = sleepy;
            ((ScaleTransform)eyeR.RenderTransform).ScaleY = sleepy;

            // Busy: the eyes scan back and forth while it works.
            eyesShift.BeginAnimation(TranslateTransform.XProperty, m == Mode.Busy
                ? new DoubleAnimation(-4, 4, TimeSpan.FromSeconds(0.8)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, EasingFunction = new SineEase { EasingMode = EasingMode.EaseInOut } }
                : new DoubleAnimation(0, TimeSpan.FromMilliseconds(200)));
            double big = m == Mode.Waiting ? 1.22 : 1;
            var grow = new DoubleAnimation(big, TimeSpan.FromMilliseconds(260)) { EasingFunction = new BackEase { Amplitude = 0.6, EasingMode = EasingMode.EaseOut } };
            eyesScale.BeginAnimation(ScaleTransform.ScaleXProperty, grow);
            eyesScale.BeginAnimation(ScaleTransform.ScaleYProperty, grow);

            fangsChew.BeginAnimation(TranslateTransform.YProperty, null);
            if (m == Mode.Busy)
            {
                var chew = new DoubleAnimation(0, -3, TimeSpan.FromMilliseconds(210)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever };
                fangsChew.BeginAnimation(TranslateTransform.YProperty, chew);
            }
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
                    demoOpen = t > 15.2 && t < 19.4;
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
                    shake.Velocity += 520;
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

            string text = "", time = "";
            switch (overall)
            {
                case Mode.Waiting: text = "Braucht dich"; break;
                case Mode.Busy:
                {
                    long longest = sessions.Where(s => SessionStore.DisplayMode(s, now) == Mode.Busy && s.TurnStart > 0)
                                           .Select(s => now - s.TurnStart).DefaultIfEmpty(0).Max();
                    text = "Arbeitet";
                    time = "  " + Clock.Duration(longest);
                    break;
                }
                case Mode.Done:
                {
                    var s = sessions.First(x => SessionStore.DisplayMode(x, now) == Mode.Done);
                    text = "Fertig";
                    if (s.Duration > 0) time = "  " + Clock.Duration(s.Duration);
                    break;
                }
                case Mode.Error: text = "Fehler"; break;
                case Mode.Ready: text = "Bereit"; break;
                default: text = "Schläft"; break;
            }

            ApplyMode(overall);
            if (pendingFlash) { pendingFlash = false; Flash(Palette.Ready); }
            label.Text = text;
            timeLabel.Text = time;
            label.Foreground = overall == Mode.Busy ? ShimmerBrush() : Palette.Brush(Palette.Text);
            countBadge.Visibility = sessions.Count > 1 ? Visibility.Visible : Visibility.Collapsed;
            countText.Text = sessions.Count.ToString();

            UpdateUsage(usage);
            UpdateSessions(sessions, now);
            if (open) UpdateProjectLabel();
            Refresh();
        }

        void ApplyMode(Mode next)
        {
            if (next == mode) return;
            Mode prev = mode;
            mode = next;
            SetEyes(next);

            var lift = new TranslateTransform(0, 6);
            head.Children[0].RenderTransform = lift;
            lift.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(6, 0, TimeSpan.FromMilliseconds(320)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } });
            head.Children[0].BeginAnimation(OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(260)));

            glow.BeginAnimation(DropShadowEffect.OpacityProperty, null);
            Color c = next == Mode.Ready || next == Mode.None ? Colors.Black : Palette.For(next);
            glow.BeginAnimation(DropShadowEffect.ColorProperty, new ColorAnimation(c, TimeSpan.FromMilliseconds(380)));
            switch (next)
            {
                case Mode.Busy:
                    glow.BeginAnimation(DropShadowEffect.OpacityProperty, new DoubleAnimation(0.22, 0.55, TimeSpan.FromSeconds(1.4)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, EasingFunction = new SineEase() });
                    break;
                case Mode.Waiting:
                    glow.BeginAnimation(DropShadowEffect.OpacityProperty, new DoubleAnimation(0.35, 0.9, TimeSpan.FromSeconds(0.65)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, EasingFunction = new SineEase() });
                    break;
                case Mode.Error:
                    glow.BeginAnimation(DropShadowEffect.OpacityProperty, new DoubleAnimation(0.7, TimeSpan.FromMilliseconds(300)));
                    break;
                case Mode.Done:
                    break;
                default:
                    glow.BeginAnimation(DropShadowEffect.OpacityProperty, new DoubleAnimation(0.5, TimeSpan.FromMilliseconds(500)));
                    break;
            }
            if (prev != (Mode)(-1)) height.Velocity -= 60;
            StartRendering();
        }

        void Flash(Color c)
        {
            glow.BeginAnimation(DropShadowEffect.ColorProperty, null);
            glow.Color = c;
            var a = new DoubleAnimationUsingKeyFrames();
            a.KeyFrames.Add(new LinearDoubleKeyFrame(1.0, KeyTime.FromTimeSpan(TimeSpan.FromMilliseconds(90))));
            a.KeyFrames.Add(new EasingDoubleKeyFrame(0.3, KeyTime.FromTimeSpan(TimeSpan.FromMilliseconds(1500)), new CubicEase { EasingMode = EasingMode.EaseOut }));
            glow.BeginAnimation(DropShadowEffect.OpacityProperty, a);
            height.Velocity += 170; // a happy hop
            StartRendering();
        }

        Brush shimmer;

        Brush ShimmerBrush()
        {
            if (shimmer != null) return shimmer;
            var dim = Color.FromRgb(160, 160, 168);
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

        string usageKey;

        void UpdateUsage(Usage u)
        {
            string key = Math.Round(u.FiveHour) + "|" + Math.Round(u.SevenDay) + "|" + Usage.ResetText(u.FiveHourResets) + "|" + Usage.ResetText(u.SevenDayResets);
            if (key == usageKey) return;
            usageKey = key;
            double headline = u.FiveHour >= 0 ? u.FiveHour : u.SevenDay;
            usagePill.Visibility = headline >= 0 ? Visibility.Visible : Visibility.Hidden;
            if (headline >= 0)
            {
                ((TextBlock)usagePill.Children[0]).Text = u.FiveHour >= 0 ? "5h" : "Woche";
                usageMiniFill.Width = 34 * Math.Max(0, Math.Min(100, headline)) / 100;
                usageMiniFill.Background = Palette.Brush(Palette.Level(headline));
                usageMiniText.Text = Math.Round(headline) + " %";
            }

            usagePanel.Children.Clear();
            if (!u.Known)
            {
                var t = Text(12, Palette.Secondary, FontWeights.Normal);
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
            var g = new Grid { Margin = new Thickness(0, 3, 0, 3) };
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(78) });
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            var n = Text(12.5, Palette.Text, FontWeights.SemiBold);
            n.Text = name;
            g.Children.Add(n);
            var track = new Border { Height = 8, Background = Palette.Brush(Color.FromArgb(90, 255, 255, 255)), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 12, 0) };
            var fill = new Border { Background = Palette.Brush(Palette.Level(pct)), HorizontalAlignment = HorizontalAlignment.Left, Width = 0 };
            track.Child = fill;
            track.SizeChanged += (s, e) => fill.Width = track.ActualWidth * Math.Max(0, Math.Min(100, pct)) / 100;
            Grid.SetColumn(track, 1);
            g.Children.Add(track);
            var v = Text(12, Palette.Secondary, FontWeights.Normal);
            Typography.SetNumeralAlignment(v, FontNumeralAlignment.Tabular);
            string reset = Usage.ResetText(resets);
            v.Text = Math.Round(pct) + " %" + (reset.Length > 0 ? "  ·  Reset " + reset : "");
            Grid.SetColumn(v, 2);
            g.Children.Add(v);
            return g;
        }

        // ── sessions ──────────────────────────────────────────────────────

        void UpdateSessions(List<Session> sessions, long now)
        {
            sessionsPanel.Children.Clear();
            if (sessions.Count == 0)
            {
                var t = Text(12, Palette.Secondary, FontWeights.Normal);
                t.Text = "Keine laufende Sitzung. Starte Claude Code oder frag mich hier unten.";
                t.TextWrapping = TextWrapping.Wrap;
                sessionsPanel.Children.Add(t);
                return;
            }
            foreach (var s in sessions.Take(3))
            {
                Mode m = SessionStore.DisplayMode(s, now);
                string detail, right = "";
                switch (m)
                {
                    case Mode.Busy:
                        detail = s.Detail.Length > 0 ? s.Detail : "Denkt nach …";
                        if (s.TurnStart > 0) right = Clock.Duration(now - s.TurnStart);
                        break;
                    case Mode.Waiting:
                        detail = s.Tool.Length > 0 ? "Freigabe: " + s.Detail : (s.Detail.Length > 0 ? s.Detail : "Wartet auf deine Antwort");
                        right = "jetzt";
                        break;
                    case Mode.Done:
                        detail = "Fertig – wartet auf deinen nächsten Befehl";
                        if (s.Duration > 0) right = Clock.Duration(s.Duration);
                        break;
                    case Mode.Error:
                        detail = s.Detail.Length > 0 ? "Fehler · " + s.Detail : "Abbruch mit Fehler";
                        break;
                    default:
                        detail = "Bereit für den nächsten Befehl";
                        break;
                }
                if (s.Context >= 0) right = (right.Length > 0 ? right + "  ·  " : "") + "Kontext " + s.Context + " %";

                var row = new Grid { Margin = new Thickness(0, 3, 0, 3) };
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(16) });
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
                row.Children.Add(new Rectangle { Width = 7, Height = 7, Fill = Palette.Brush(Palette.For(m)), VerticalAlignment = VerticalAlignment.Top, HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 6, 0, 0) });
                var texts = new StackPanel { Margin = new Thickness(0, 0, 10, 0) };
                var title = Text(12.5, Palette.Text, FontWeights.SemiBold);
                title.Text = s.Project + (s.Model.Length > 0 ? "  ·  " + s.Model : "");
                title.TextTrimming = TextTrimming.CharacterEllipsis;
                var sub = Text(11.5, Palette.Secondary, FontWeights.Normal);
                sub.Text = detail;
                sub.TextTrimming = TextTrimming.CharacterEllipsis;
                texts.Children.Add(title);
                texts.Children.Add(sub);
                Grid.SetColumn(texts, 1);
                row.Children.Add(texts);
                var r = Text(11.5, Palette.Secondary, FontWeights.Normal);
                Typography.SetNumeralAlignment(r, FontNumeralAlignment.Tabular);
                r.Text = right;
                Grid.SetColumn(r, 2);
                row.Children.Add(r);
                sessionsPanel.Children.Add(row);
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
            projectText.Text = "Projekt: " + PathText.LastSegment(CurrentProject()) + "  ▾";
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
            activityText.Foreground = Palette.Brush(Palette.Busy);
            activityText.Text = (allowEdits ? "Claude arbeitet in " : "Claude liest in ") + PathText.LastSegment(cwd) + " …";
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
                activityText.Text = "Claude Code wurde nicht gefunden. Ist es installiert und im PATH? (" + ex.Message + ")";
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
                if (ok) Flash(Palette.Ready);
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
            if (files && !dragOver)
            {
                dragOver = true;
                Refresh();
            }
        }

        void OnDrop(object sender, DragEventArgs e)
        {
            dragOver = false;
            var files = e.Data.GetData(DataFormats.FileDrop) as string[];
            if (files != null)
            {
                foreach (var f in files.Where(File.Exists))
                    if (!attachments.Contains(f, StringComparer.OrdinalIgnoreCase)) attachments.Add(f);
                RenderChips();
                height.Velocity -= 220; // gulp
                StartRendering();
                Activate();
                input.Focus();
            }
            Refresh();
        }

        void RenderChips()
        {
            chips.Children.Clear();
            foreach (var f in attachments)
            {
                string file = f;
                bool pdf = file.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);
                var panel = new StackPanel { Orientation = Orientation.Horizontal };
                var kind = Text(10, pdf ? Color.FromRgb(20, 8, 4) : Palette.Text, FontWeights.Bold);
                kind.Text = pdf ? "PDF" : "DATEI";
                var tag = new Border { Child = kind, Background = Palette.Brush(pdf ? Palette.Busy : Color.FromArgb(90, 255, 255, 255)), Padding = new Thickness(4, 0, 4, 1), Margin = new Thickness(0, 0, 6, 0), VerticalAlignment = VerticalAlignment.Center };
                var name = Text(12, Palette.Text, FontWeights.Normal);
                name.Text = PathText.LastSegment(file);
                name.MaxWidth = 260;
                name.TextTrimming = TextTrimming.CharacterEllipsis;
                var x = Text(12, Palette.Secondary, FontWeights.Normal);
                x.Text = "   ✕";
                panel.Children.Add(tag);
                panel.Children.Add(name);
                panel.Children.Add(x);
                var chip = new Border { Child = panel, Background = Palette.Brush(Palette.Chip), Padding = new Thickness(6, 3, 8, 4), Margin = new Thickness(0, 0, 6, 6), Cursor = Cursors.Hand, ToolTip = file + "\n(Klicken zum Entfernen)" };
                chip.MouseLeftButtonUp += (s, e) => { attachments.Remove(file); RenderChips(); Refresh(); };
                chips.Children.Add(chip);
            }
            dropHint.Visibility = attachments.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
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
            double left = (WindowW - w) / 2 - Shoulder;
            bool inside = local.X >= left - 8 && local.X <= left + w + 2 * Shoulder + 8 && local.Y >= -2 && local.Y <= h + 14;
            // A drag in progress (mouse button held) also opens the mouth.
            bool dragging = (GetAsyncKeyState(0x01) & 0x8000) != 0;
            long now = Clock.NowMs();

            if (inside) { leftSince = 0; if (hoverSince == 0) hoverSince = now; }
            else { hoverSince = 0; if (leftSince == 0) leftSince = now; }

            bool want = open;
            if (inside && now - hoverSince > (dragging ? 40 : 160)) want = true;
            if (!inside && open && !Pinned && !dragOver && now - leftSince > 380) want = false;
            if (Pinned) want = true;

            SetInteractive(inside || want);
            if (want != open)
            {
                open = want;
                if (!open) Keyboard.ClearFocus();
                Refresh();
            }
        }

        /// <summary>Recompute the target size and look of the mouth.</summary>
        void Refresh()
        {
            bool showMouth = open || dragOver;
            mouthContent.BeginAnimation(OpacityProperty, new DoubleAnimation(showMouth ? 1 : 0, TimeSpan.FromMilliseconds(showMouth ? 240 : 90))
            {
                BeginTime = TimeSpan.FromMilliseconds(showMouth ? 120 : 0)
            });

            dropBorder.Stroke = Palette.Brush(dragOver ? Palette.Waiting : Color.FromArgb(120, 255, 200, 200));
            dropBorder.StrokeThickness = dragOver ? 2.5 : 1.5;
            if (dragOver) dropHint.Text = "Loslassen – ich fress das!";
            else dropHint.Text = "PDF oder Datei hier reinwerfen – ich fress sie und Claude liest sie.";
            dropHint.Visibility = dragOver || attachments.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
            dropHint.Foreground = Palette.Brush(dragOver ? Palette.Waiting : Palette.Secondary);

            // Eyes look down into the open mouth.
            double look = showMouth ? 2 : 0;
            eyesShift.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(look, TimeSpan.FromMilliseconds(220)));

            UpdateTargets();
        }

        void UpdateTargets()
        {
            bool showMouth = open || dragOver;
            head.Width = Math.Max(ClosedMinW, OpenW) - 2 * PadX;
            head.UpdateLayout();
            double w;
            double cheeks = Math.Max(head.Children[0].DesiredSize.Width, head.Children[2].DesiredSize.Width);
            w = Math.Max(ClosedMinW, 2 * cheeks + eyes.Width + 28 + 2 * PadX);
            double h = HeadH;
            if (showMouth)
            {
                w = Math.Max(w, OpenW);
                double contentW = w - 2 * MouthInset - 32;
                mouthContent.Width = contentW;
                mouthContent.Measure(new Size(contentW, double.PositiveInfinity));
                h = HeadH + ToothH + 12 + mouthContent.DesiredSize.Height + 12 + ToothH + MouthInset;
                if (dragOver) h += 26; // open wide
            }
            w = Math.Round(w);
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
            Layout();

            if (width.Settled && height.Settled && shake.Settled)
            {
                CompositionTarget.Rendering -= OnRendering;
                rendering = false;
            }
        }

        void Layout()
        {
            double w = Math.Max(24, width.Value);
            double h = Math.Max(0, height.Value);
            double left = (WindowW - w) / 2 + shake.Value;

            body.Data = MonsterGeometry(w, h);
            Canvas.SetLeft(body, left - Shoulder);
            Canvas.SetTop(body, 0);

            head.Width = w - 2 * PadX;
            Canvas.SetLeft(head, left + PadX);
            Canvas.SetTop(head, Math.Min(0, h - HeadH) * 0.5);

            // Fangs: hang below the closed head, tuck away as the jaw opens.
            double mouthH = Math.Max(0, h - HeadH - MouthInset);
            double fangOpacity = Math.Max(0, 1 - mouthH / 30);
            fangL.Opacity = fangR.Opacity = fangOpacity;
            Canvas.SetLeft(fangL, left + w / 2 - 18);
            Canvas.SetLeft(fangR, left + w / 2 + 12);
            Canvas.SetTop(fangL, Math.Min(h, HeadH) - 1);
            Canvas.SetTop(fangR, Math.Min(h, HeadH) - 1);

            // Mouth: the gap between the head and the lower jaw.
            double mw = Math.Max(0, w - 2 * MouthInset);
            mouth.Width = mw;
            mouth.Height = mouthH;
            Canvas.SetLeft(mouth, left + MouthInset);
            Canvas.SetTop(mouth, HeadH);
            mouthBg.Width = mw;
            mouthBg.Height = mouthH;
            LayoutTeeth(upperTeeth, mw, false);
            LayoutTeeth(lowerTeeth, mw, true);
            Canvas.SetTop(upperTeeth, 0);
            Canvas.SetTop(lowerTeeth, mouthH - ToothH);
            Canvas.SetLeft(mouthContent, 16);
            Canvas.SetTop(mouthContent, ToothH + 12);
        }

        double teethLaidOutFor = -1;

        void LayoutTeeth(Canvas row, double mw, bool lower)
        {
            row.Width = mw;
            if (lower && Math.Abs(teethLaidOutFor - mw) < 0.5 && row.Children.Count > 0) return;
            if (lower) teethLaidOutFor = mw;
            int count = (int)Math.Floor((mw - 8) / (ToothW + ToothGap));
            if (row.Children.Count != count)
            {
                row.Children.Clear();
                for (int i = 0; i < count; i++)
                    row.Children.Add(new Rectangle { Width = ToothW, Height = ToothH, Fill = Palette.Brush(Palette.Tooth) });
            }
            double total = count * ToothW + (count - 1) * ToothGap;
            double start = (mw - total) / 2;
            for (int i = 0; i < row.Children.Count; i++)
                Canvas.SetLeft(row.Children[i], start + i * (ToothW + ToothGap) + (lower ? (ToothW + ToothGap) / 2 : 0));
        }

        /// <summary>
        /// The monster's silhouette: stepped "pixel" shoulders where it meets the
        /// screen edge and stepped corners at the bottom.
        /// </summary>
        static Geometry MonsterGeometry(double w, double h)
        {
            double p = Px, s = Shoulder;
            double step = Math.Min(p, Math.Max(0, h / 4));
            var pts = new List<Point>
            {
                new Point(0, 0),
                new Point(0, step), new Point(p, step), new Point(p, 2 * step), new Point(s, 2 * step),
                new Point(s, h - 2 * step), new Point(s + p, h - 2 * step), new Point(s + p, h - step), new Point(s + 2 * p, h - step), new Point(s + 2 * p, h),
                new Point(s + w - 2 * p, h), new Point(s + w - 2 * p, h - step), new Point(s + w - p, h - step), new Point(s + w - p, h - 2 * step), new Point(s + w, h - 2 * step),
                new Point(s + w, 2 * step), new Point(s + w + p, 2 * step), new Point(s + w + p, step), new Point(s + w + s, step),
                new Point(s + w + s, 0)
            };
            var g = new StreamGeometry();
            using (var c = g.Open())
            {
                c.BeginFigure(pts[0], true, true);
                c.PolyLineTo(pts.Skip(1).ToList(), true, false);
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
            lastModes.Remove("demo");
            lastModes.Remove("demo2");
            Poll();
        }

        static Drawing.Icon MakeTrayIcon()
        {
            using (var bmp = new Drawing.Bitmap(32, 32))
            {
                using (var g = Drawing.Graphics.FromImage(bmp))
                {
                    g.Clear(Drawing.Color.Transparent);
                    using (var b = new Drawing.SolidBrush(Drawing.Color.FromArgb(16, 16, 18))) g.FillRectangle(b, 2, 6, 28, 18);
                    using (var b = new Drawing.SolidBrush(Drawing.Color.FromArgb(52, 211, 153)))
                    {
                        g.FillRectangle(b, 9, 11, 5, 6);
                        g.FillRectangle(b, 18, 11, 5, 6);
                    }
                    using (var b = new Drawing.SolidBrush(Drawing.Color.White))
                    {
                        g.FillRectangle(b, 11, 24, 3, 4);
                        g.FillRectangle(b, 18, 24, 3, 4);
                    }
                }
                return Drawing.Icon.FromHandle(bmp.GetHicon());
            }
        }
    }
}
