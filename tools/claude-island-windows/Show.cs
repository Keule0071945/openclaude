// Claude Island - the show pieces.
//
// RollingText: numbers that roll like an odometer instead of jumping.
// FireworksWindow: a click-through pixel firework over the whole monitor
// when Claude finishes a big task. Desktop.Ledges: the visible top edges of
// the windows on screen, so Clawd can climb and sit on them.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Animation;
using Typography = System.Windows.Documents.Typography;

namespace ClaudeIsland
{
    /// <summary>A line of text whose changed characters roll in from below (odometer style).</summary>
    sealed class RollingText : StackPanel
    {
        readonly FontFamily family;
        readonly double size;
        readonly FontWeight weight;
        Brush brush;
        string text = "";

        public RollingText(FontFamily family, double size, FontWeight weight, Brush brush)
        {
            this.family = family;
            this.size = size;
            this.weight = weight;
            this.brush = brush;
            Orientation = Orientation.Horizontal;
        }

        public Brush Foreground
        {
            get { return brush; }
            set
            {
                brush = value;
                foreach (var cell in Children.OfType<Grid>())
                    foreach (var tb in cell.Children.OfType<TextBlock>()) tb.Foreground = value;
            }
        }

        public string Text
        {
            get { return text; }
            set { Set(value ?? ""); }
        }

        TextBlock Glyph(char c)
        {
            var tb = new TextBlock
            {
                Text = c.ToString(), FontFamily = family, FontSize = size, FontWeight = weight, Foreground = brush,
                RenderTransform = new TranslateTransform(), VerticalAlignment = VerticalAlignment.Center
            };
            Typography.SetNumeralAlignment(tb, FontNumeralAlignment.Tabular);
            tb.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
            return tb;
        }

        void Set(string next)
        {
            if (next == text) return;
            string old = text;
            text = next;
            while (Children.Count > next.Length) Children.RemoveAt(Children.Count - 1);
            for (int i = 0; i < next.Length; i++)
            {
                char now = next[i];
                bool existing = i < Children.Count;
                char before = i < old.Length ? old[i] : '\0';
                if (existing && before == now) continue;
                var tb = Glyph(now);
                if (!existing)
                {
                    var fresh = new Grid { ClipToBounds = true, Height = Math.Ceiling(size * 1.4), Width = tb.DesiredSize.Width };
                    fresh.Children.Add(tb);
                    Children.Add(fresh);
                    continue;
                }
                var cell = (Grid)Children[i];
                cell.Width = Math.Max(cell.Width, tb.DesiredSize.Width);
                cell.BeginAnimation(WidthProperty, new DoubleAnimation(tb.DesiredSize.Width, TimeSpan.FromMilliseconds(220)));
                bool digits = char.IsDigit(now) && char.IsDigit(before);
                // Counting up rolls upwards, counting down rolls downwards.
                double dir = digits && now < before && !(before == '9' && now == '0') ? -1 : 1;
                double h = cell.Height * 0.8;
                var dur = TimeSpan.FromMilliseconds(digits ? 300 : 220);
                var ease = new CubicEase { EasingMode = EasingMode.EaseOut };
                foreach (var gone in cell.Children.OfType<TextBlock>().ToList())
                {
                    var t = (TranslateTransform)gone.RenderTransform;
                    var outAnim = new DoubleAnimation(-h * dir, dur) { EasingFunction = ease };
                    var g = gone;
                    outAnim.Completed += (s, e) => cell.Children.Remove(g);
                    t.BeginAnimation(TranslateTransform.YProperty, outAnim);
                    g.BeginAnimation(OpacityProperty, new DoubleAnimation(0, dur));
                }
                cell.Children.Add(tb);
                ((TranslateTransform)tb.RenderTransform).BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(h * dir, 0, dur) { EasingFunction = ease });
                tb.BeginAnimation(OpacityProperty, new DoubleAnimation(0, 1, dur));
            }
        }
    }

    /// <summary>A pixel firework over the whole monitor. Clicks go straight through it.</summary>
    sealed class FireworksWindow : Window
    {
        sealed class Spark
        {
            public double X, Y, Vx, Vy, Size;
            public Color Color;
            public long Born, Life;
            public bool Rocket;
        }

        sealed class Surface : FrameworkElement
        {
            public FireworksWindow Owner;
            protected override void OnRender(DrawingContext dc) { Owner.Paint(dc); }
        }

        const long ShowMs = 5200;
        static readonly Color[] Colors =
        {
            Color.FromRgb(215, 119, 87), Color.FromRgb(247, 192, 74), Color.FromRgb(61, 220, 151),
            Color.FromRgb(110, 198, 255), Color.FromRgb(255, 143, 163), Color.FromRgb(167, 139, 250), Color.FromRgb(255, 255, 255)
        };

        readonly List<Spark> sparks = new List<Spark>();
        readonly Random random = new Random();
        readonly Surface surface;
        readonly string headline;
        readonly long start;
        long last;
        int launched;
        readonly Dictionary<Color, Brush> brushes = new Dictionary<Color, Brush>();

        [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
        [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr h, int i, int v);

        public FireworksWindow(Rect area, string headline)
        {
            this.headline = headline;
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = Brushes.Transparent;
            ResizeMode = ResizeMode.NoResize;
            ShowInTaskbar = false;
            ShowActivated = false;
            Topmost = true;
            Left = area.Left;
            Top = area.Top;
            Width = area.Width;
            Height = area.Height;
            surface = new Surface { Owner = this, IsHitTestVisible = false };
            Content = surface;
            start = last = Clock.NowMs();
            SourceInitialized += (s, e) =>
            {
                var h = new WindowInteropHelper(this).Handle;
                // Transparent | Layered | ToolWindow | NoActivate: never in the way.
                SetWindowLong(h, -20, GetWindowLong(h, -20) | 0x20 | 0x80000 | 0x80 | 0x8000000);
            };
            Loaded += (s, e) => CompositionTarget.Rendering += OnFrame;
            Closed += (s, e) => CompositionTarget.Rendering -= OnFrame;
        }

        Brush BrushFor(Color c)
        {
            Brush b;
            if (!brushes.TryGetValue(c, out b)) { b = new SolidColorBrush(c); b.Freeze(); brushes[c] = b; }
            return b;
        }

        void OnFrame(object sender, EventArgs e)
        {
            long now = Clock.NowMs();
            double dt = Math.Min(0.05, (now - last) / 1000.0);
            if (dt < 1.0 / 45) return; // ~40 fps is plenty and keeps a big layered window cheap
            last = now;
            long t = now - start;

            // Seven rockets over the first three seconds.
            while (launched < 7 && t > launched * 430)
            {
                launched++;
                double w = ActualWidth, h = ActualHeight;
                sparks.Add(new Spark
                {
                    Rocket = true, X = w * (0.15 + 0.7 * random.NextDouble()), Y = h + 10,
                    Vx = (random.NextDouble() - 0.5) * 120, Vy = -(h * 0.95 + random.NextDouble() * h * 0.35),
                    Size = 5, Color = Colors[random.Next(Colors.Length)], Born = now, Life = 4000
                });
            }

            var born = new List<Spark>();
            for (int i = sparks.Count - 1; i >= 0; i--)
            {
                var s = sparks[i];
                s.Vy += (s.Rocket ? 520 : 300) * dt;
                s.X += s.Vx * dt;
                s.Y += s.Vy * dt;
                if (s.Rocket)
                {
                    // Trail, then burst at the top of the climb.
                    if (random.NextDouble() < 0.7)
                        born.Add(new Spark { X = s.X, Y = s.Y + 6, Vx = (random.NextDouble() - 0.5) * 30, Vy = 40, Size = 3, Color = Color.FromRgb(247, 192, 74), Born = now, Life = 380 });
                    if (s.Vy > -60)
                    {
                        sparks.RemoveAt(i);
                        int n = 46 + random.Next(20);
                        var c1 = Colors[random.Next(Colors.Length)];
                        var c2 = Colors[random.Next(Colors.Length)];
                        for (int k = 0; k < n; k++)
                        {
                            double a = 2 * Math.PI * k / n + random.NextDouble() * 0.2;
                            double speed = 150 + random.NextDouble() * 260;
                            born.Add(new Spark
                            {
                                X = s.X, Y = s.Y, Vx = Math.Cos(a) * speed, Vy = Math.Sin(a) * speed,
                                Size = 4 + random.Next(2) * 2, Color = k % 3 == 0 ? c2 : c1, Born = now, Life = 1300 + random.Next(900)
                            });
                        }
                    }
                }
                else
                {
                    s.Vx *= 0.985;
                    if (now - s.Born > s.Life) sparks.RemoveAt(i);
                }
            }
            sparks.AddRange(born);
            surface.InvalidateVisual();
            if (t > ShowMs && sparks.Count == 0 || t > ShowMs + 2500) Close();
        }

        void Paint(DrawingContext dc)
        {
            long now = Clock.NowMs();
            foreach (var s in sparks)
            {
                double age = s.Rocket ? 0 : (now - s.Born) / (double)s.Life;
                dc.PushOpacity(Math.Max(0, 1 - age * age));
                double size = Math.Max(2, s.Size * (1 - age * 0.5));
                // Snap to a 2-px grid: it stays pixel art.
                dc.DrawRectangle(BrushFor(s.Color), null, new Rect(Math.Round(s.X / 2) * 2, Math.Round(s.Y / 2) * 2, size, size));
                dc.Pop();
            }

            // The headline fades in and out in the middle.
            double t = (now - start) / 1000.0;
            double alpha = t < 0.6 ? t / 0.6 : t < 3.6 ? 1 : Math.Max(0, 1 - (t - 3.6) / 0.8);
            if (alpha <= 0 || string.IsNullOrEmpty(headline)) return;
            var face = new Typeface(new FontFamily("Segoe UI Variable Display, Segoe UI"), FontStyles.Normal, FontWeights.Black, FontStretches.Normal);
            double scale = 1 + 0.06 * Math.Sin(Math.Min(1, t / 0.6) * Math.PI);
            var text = new FormattedText(headline, CultureInfo.CurrentUICulture, FlowDirection.LeftToRight, face, 64, Brushes.White, 1.0);
            double x = (ActualWidth - text.Width) / 2, y = ActualHeight * 0.36 - text.Height / 2;
            dc.PushOpacity(alpha);
            dc.PushTransform(new ScaleTransform(scale, scale, ActualWidth / 2, ActualHeight * 0.36));
            var glow = new FormattedText(headline, CultureInfo.CurrentUICulture, FlowDirection.LeftToRight, face, 64, BrushFor(Color.FromRgb(215, 119, 87)), 1.0);
            dc.DrawText(glow, new Point(x + 4, y + 4));
            dc.DrawText(text, new Point(x, y));
            dc.Pop();
            dc.Pop();
        }
    }

    /// <summary>A visible stretch of a window's top edge, in device pixels.</summary>
    sealed class Ledge
    {
        public IntPtr Hwnd;
        public int Left, Right, Top;
    }

    static class Desktop
    {
        delegate bool EnumProc(IntPtr h, IntPtr l);
        [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr l);
        [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
        [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
        [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
        [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr h);
        [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder sb, int max);
        [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(POINT p);
        [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr h, uint flags);
        [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
        [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int attr, out RECT r, int size);
        [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int attr, out int v, int size);
        [StructLayout(LayoutKind.Sequential)] struct POINT { public int X, Y; }
        [StructLayout(LayoutKind.Sequential)] struct RECT { public int Left, Top, Right, Bottom; }

        static readonly uint ownPid = (uint)Process.GetCurrentProcess().Id;
        static readonly HashSet<string> Skip = new HashSet<string> { "Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd", "Windows.UI.Core.CoreWindow" };

        /// <summary>The window's visible frame (without the invisible resize border), or null if it is not on screen.</summary>
        public static Int32Rect? Frame(IntPtr h)
        {
            if (!IsWindowVisible(h) || IsIconic(h)) return null;
            int cloaked;
            if (DwmGetWindowAttribute(h, 14, out cloaked, 4) == 0 && cloaked != 0) return null; // DWMWA_CLOAKED
            RECT r;
            if (DwmGetWindowAttribute(h, 9, out r, Marshal.SizeOf(typeof(RECT))) != 0 && !GetWindowRect(h, out r)) return null;
            return new Int32Rect(r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top);
        }

        /// <summary>
        /// Visible top edges of normal windows inside <paramref name="area"/> (device px). A stretch
        /// counts only where nothing covers it; points inside <paramref name="ignore"/> (Clawd himself)
        /// count as visible.
        /// </summary>
        public static List<Ledge> Ledges(Int32Rect area, Int32Rect ignore)
        {
            var found = new List<Ledge>();
            var candidates = new List<KeyValuePair<IntPtr, Int32Rect>>();
            EnumWindows((h, l) =>
            {
                try
                {
                    uint pid;
                    GetWindowThreadProcessId(h, out pid);
                    if (pid == ownPid || GetWindowTextLength(h) == 0) return true;
                    int ex = GetWindowLong(h, -20);
                    if ((ex & 0x80) != 0 || (ex & 0x8000000) != 0) return true; // tool / no-activate windows
                    var cls = new StringBuilder(64);
                    GetClassName(h, cls, cls.Capacity);
                    if (Skip.Contains(cls.ToString())) return true;
                    var f = Frame(h);
                    if (f == null) return true;
                    var r = f.Value;
                    if (r.Width < 140 || r.Height < 60) return true;
                    if (r.Y < area.Y + 60 || r.Y > area.Y + area.Height - 40) return true; // maximized or off screen
                    if (r.X + r.Width < area.X || r.X > area.X + area.Width) return true;
                    candidates.Add(new KeyValuePair<IntPtr, Int32Rect>(h, r));
                }
                catch { }
                return true;
            }, IntPtr.Zero);

            foreach (var c in candidates.Take(24))
            {
                var r = c.Value;
                int left = Math.Max(r.X + 6, area.X), right = Math.Min(r.X + r.Width - 6, area.X + area.Width);
                int runStart = -1;
                for (int x = left; x <= right; x += 16)
                {
                    bool visible = Visible(c.Key, x, r.Y + 3, ignore);
                    if (visible && runStart < 0) runStart = x;
                    if ((!visible || x + 16 > right) && runStart >= 0)
                    {
                        int end = visible ? right : x - 1;
                        if (end - runStart >= 40) found.Add(new Ledge { Hwnd = c.Key, Left = runStart, Right = end, Top = r.Y });
                        runStart = -1;
                    }
                }
            }
            return found;
        }

        static bool Visible(IntPtr h, int x, int y, Int32Rect ignore)
        {
            if (x >= ignore.X && x <= ignore.X + ignore.Width && y >= ignore.Y && y <= ignore.Y + ignore.Height) return true;
            IntPtr at = WindowFromPoint(new POINT { X = x, Y = y });
            if (at == IntPtr.Zero) return false;
            IntPtr root = GetAncestor(at, 2); // GA_ROOT
            if (root == h) return true;
            // Our own click-through windows (island, fireworks) do not count as covering.
            uint pid;
            GetWindowThreadProcessId(root, out pid);
            return pid == ownPid;
        }
    }
}
