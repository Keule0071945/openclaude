// Claude Island - Clawd on the desktop.
//
// Pulled out of the island (or sent out from the tray), Clawd walks along the
// taskbar and acts out what Claude Code is doing: he hurries while Claude
// works, jumps and waves when Claude needs you, cheers when it is done and
// sleeps when no session is open. Pick him up and throw him - he falls,
// bounces off the screen edges and lands on the taskbar again. Double-click
// sends him home to the island.

using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Shapes;
using System.Windows.Threading;
using WinForms = System.Windows.Forms;

namespace ClaudeIsland
{
    sealed class PetWindow : Window
    {
        const double Px = 5;
        const double Pad = 34;                          // room for a prop and the bubble
        const double SpriteW = ClawdArt.Cols * Px, SpriteH = ClawdArt.Rows * Px;
        const double WinW = SpriteW + 2 * Pad, WinH = SpriteH + Pad;
        const double FeetY = Pad + SpriteH;              // window y of his feet
        const double Gravity = 2600;

        /// <summary>Raised on double-click or "Zurück in die Island".</summary>
        public event Action GoHome;

        readonly Canvas canvas;
        readonly PixelSprite sprite, prop;
        readonly ScaleTransform squash = new ScaleTransform(1, 1);
        readonly TextBlock bubble;
        readonly Random random = new Random();
        readonly DispatcherTimer timer;
        IntPtr hwnd;

        // Physics, in DIPs; (x, y) is the window's top-left corner.
        double x, y, vx, vy;
        bool grounded, dragging, placed;
        Point grab;
        readonly List<KeyValuePair<long, Point>> trail = new List<KeyValuePair<long, Point>>();
        long lastTick, landedAt, nextHop, nextDecision, happyUntil, nextBlink, blinkUntil;
        double walkDir = 1;
        string activity = "walk"; // walk | idle

        // Window tops he can stand on (DIPs), refreshed twice a second.
        sealed class Platform { public IntPtr Hwnd; public double Left, Right, Top; }
        List<Platform> platforms = new List<Platform>();
        long platformsAt, nextClimb, lastEdgeRoll;
        IntPtr standingOn;
        Int32Rect standFrame;

        // State handed over by the island each frame.
        Mode mode = Mode.Ready;
        string hat = "";
        bool glasses, hidden;
        string[] propArt;
        Color body = Palette.Clawd;

        public PetWindow()
        {
            Title = "Clawd";
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = Brushes.Transparent;
            ResizeMode = ResizeMode.NoResize;
            ShowInTaskbar = false;
            ShowActivated = false;
            Topmost = true;
            Width = WinW;
            Height = WinH;
            Left = -10000;
            Top = -10000;

            canvas = new Canvas { Width = WinW, Height = WinH };
            Content = canvas;
            // Nearly invisible, so the whole body is easy to grab (transparent pixels click through).
            var handle = new Rectangle { Width = SpriteW - 6 * Px, Height = 6 * Px, Fill = Palette.Brush(Color.FromArgb(1, 0, 0, 0)), Cursor = Cursors.Hand };
            Canvas.SetLeft(handle, Pad + 2 * Px);
            Canvas.SetTop(handle, FeetY - 6 * Px);
            canvas.Children.Add(handle);
            sprite = new PixelSprite(ClawdArt.Cols, ClawdArt.Rows, Px) { RenderTransform = squash, IsHitTestVisible = true, Cursor = Cursors.Hand };
            Canvas.SetLeft(sprite, Pad);
            canvas.Children.Add(sprite);
            prop = new PixelSprite(6, 7, 3.5) { Visibility = Visibility.Collapsed };
            canvas.Children.Add(prop);
            bubble = new TextBlock { FontFamily = new FontFamily("Segoe UI"), FontSize = 15, FontWeight = FontWeights.Bold, IsHitTestVisible = false, Opacity = 0 };
            canvas.Children.Add(bubble);

            ToolTipService.SetToolTip(sprite, "Ziehen und werfen · Doppelklick: zurück in die Island");
            var menu = new ContextMenu();
            var home = new MenuItem { Header = "Zurück in die Island" };
            home.Click += (s, e) => Home();
            menu.Items.Add(home);
            sprite.ContextMenu = menu;

            MouseLeftButtonDown += (s, e) =>
            {
                if (e.ClickCount >= 2) { Home(); return; }
                Grab(new Point(WinW / 2, FeetY - 4 * Px));
            };

            SourceInitialized += (s, e) =>
            {
                hwnd = new WindowInteropHelper(this).Handle;
                int ex = GetWindowLong(hwnd, GWL_EXSTYLE);
                SetWindowLong(hwnd, GWL_EXSTYLE, ex | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE);
            };
            timer = new DispatcherTimer(DispatcherPriority.Render) { Interval = TimeSpan.FromMilliseconds(16) };
            timer.Tick += (s, e) => { try { Tick(); } catch (Exception ex) { AppPaths.LogError("pet", ex); timer.Stop(); } };
            Closed += (s, e) => timer.Stop();
        }

        [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
        [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr h, int i, int v);
        [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
        [DllImport("user32.dll")] static extern bool GetCursorPos(out POINT p);
        [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
        [StructLayout(LayoutKind.Sequential)] struct POINT { public int X, Y; }
        const int GWL_EXSTYLE = -20, WS_EX_TOOLWINDOW = 0x80, WS_EX_NOACTIVATE = 0x8000000;
        static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
        const uint SWP_NOSIZE = 0x1, SWP_NOMOVE = 0x2, SWP_NOACTIVATE = 0x10;

        /// <summary>Show him with his feet at a screen point (DIPs), falling from there.</summary>
        public void Start(Point feet, bool grabbed)
        {
            x = feet.X - WinW / 2;
            y = feet.Y - FeetY;
            vx = vy = 0;
            grounded = false;
            Show();
            placed = true;
            Left = x;
            Top = y;
            lastTick = Clock.NowMs();
            nextDecision = lastTick + 1500;
            timer.Start();
            if (grabbed) Grab(new Point(WinW / 2, FeetY - 4 * Px));
        }

        /// <summary>The island's state for this frame.</summary>
        public void Sync(Mode m, string hatToday, bool withGlasses, string[] propToday, Color color, bool hide)
        {
            if (m == Mode.Done && mode != Mode.Done && grounded) { vy = -620; grounded = false; happyUntil = Clock.NowMs() + 2500; }
            mode = m;
            hat = hatToday;
            glasses = withGlasses;
            propArt = propToday;
            body = color;
            if (hide != hidden)
            {
                hidden = hide;
                Visibility = hide ? Visibility.Hidden : Visibility.Visible;
            }
        }

        public void KeepOnTop()
        {
            if (hwnd != IntPtr.Zero && !hidden)
                SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
        }

        void Home()
        {
            if (GoHome != null) GoHome();
        }

        void Grab(Point offset)
        {
            dragging = true;
            grounded = false;
            grab = offset;
            trail.Clear();
        }

        Point CursorDip()
        {
            POINT p;
            GetCursorPos(out p);
            var source = PresentationSource.FromVisual(this);
            if (source == null) return new Point(p.X, p.Y);
            return source.CompositionTarget.TransformFromDevice.Transform(new Point(p.X, p.Y));
        }

        /// <summary>Work area (without the taskbar) of the monitor he is on, in DIPs.</summary>
        Rect Area()
        {
            var source = PresentationSource.FromVisual(this);
            if (source == null) return new Rect(0, 0, SystemParameters.WorkArea.Width, SystemParameters.WorkArea.Height);
            var toDevice = source.CompositionTarget.TransformToDevice;
            var center = toDevice.Transform(new Point(x + WinW / 2, y + FeetY - 2));
            var screen = WinForms.Screen.FromPoint(new System.Drawing.Point((int)center.X, (int)center.Y));
            var fromDevice = source.CompositionTarget.TransformFromDevice;
            var tl = fromDevice.Transform(new Point(screen.WorkingArea.Left, screen.WorkingArea.Top));
            var br = fromDevice.Transform(new Point(screen.WorkingArea.Right, screen.WorkingArea.Bottom));
            return new Rect(tl, br);
        }

        void Tick()
        {
            if (!placed) return;
            long now = Clock.NowMs();
            double dt = Math.Max(0, Math.Min(0.05, (now - lastTick) / 1000.0));
            lastTick = now;
            Rect area = Area();
            double minX = area.Left - Pad, maxX = area.Right - WinW + Pad;
            double floor = area.Bottom - FeetY, ceiling = area.Top - Pad;

            if (now - platformsAt > 500) { platformsAt = now; RefreshPlatforms(); }

            if (dragging)
            {
                standingOn = IntPtr.Zero;
                if ((GetAsyncKeyState(0x01) & 0x8000) == 0)
                {
                    // Let go: throw him with the speed of the last few mouse moves.
                    dragging = false;
                    trail.RemoveAll(t => now - t.Key > 90);
                    if (trail.Count >= 2)
                    {
                        var a = trail[0];
                        var b = trail[trail.Count - 1];
                        double span = Math.Max(16, b.Key - a.Key) / 1000.0;
                        vx = Math.Max(-2600, Math.Min(2600, (b.Value.X - a.Value.X) / span));
                        vy = Math.Max(-2600, Math.Min(2600, (b.Value.Y - a.Value.Y) / span));
                    }
                    else vx = vy = 0;
                }
                else
                {
                    Point c = CursorDip();
                    trail.Add(new KeyValuePair<long, Point>(now, c));
                    trail.RemoveAll(t => now - t.Key > 160);
                    x = c.X - grab.X;
                    y = c.Y - grab.Y;
                }
            }
            else if (!grounded)
            {
                double feetBefore = y + FeetY;
                vy += Gravity * dt;
                x += vx * dt;
                y += vy * dt;
                // Falling past the top edge of a window: land on it.
                if (vy > 0)
                {
                    double cx = x + WinW / 2, feet = y + FeetY;
                    var hit = platforms.Where(p => cx >= p.Left && cx <= p.Right && feetBefore <= p.Top + 1 && feet >= p.Top && p.Top < area.Bottom - 30)
                                       .OrderBy(p => p.Top).FirstOrDefault();
                    if (hit != null)
                    {
                        y = hit.Top - FeetY;
                        landedAt = now;
                        if (vy > 900) { vy = -vy * 0.28; vx *= 0.7; }
                        else
                        {
                            vy = 0; vx = 0; grounded = true; nextHop = now + 400;
                            StandOn(hit.Hwnd);
                        }
                    }
                }
                if (x < minX) { x = minX; vx = Math.Abs(vx) * 0.6; }
                if (x > maxX) { x = maxX; vx = -Math.Abs(vx) * 0.6; }
                if (y < ceiling) { y = ceiling; vy = Math.Abs(vy) * 0.3; }
                if (y >= floor)
                {
                    y = floor;
                    landedAt = now;
                    if (vy > 650) { vy = -vy * 0.32; vx *= 0.7; }
                    else { vy = 0; vx = 0; grounded = true; nextHop = now + 400; standingOn = IntPtr.Zero; }
                }
            }
            else if (standingOn != IntPtr.Zero)
            {
                // On a window: ride along when it moves, fall when it goes away.
                var f = Desktop.Frame(standingOn);
                var dip = f == null ? (Rect?)null : ToDip(f.Value);
                double cx = x + WinW / 2;
                bool covered = now - platformsAt < 600 && !platforms.Any(p => p.Hwnd == standingOn && cx >= p.Left - 8 && cx <= p.Right + 8);
                if (dip == null || covered || dip.Value.Top < area.Top + 40)
                {
                    standingOn = IntPtr.Zero;
                    grounded = false;
                    vy = 0;
                }
                else
                {
                    var before = ToDip(standFrame);
                    x += dip.Value.Left - before.Left;
                    standFrame = f.Value;
                    y = dip.Value.Top - FeetY;
                    // Walk within the window; at the edge turn round, or now and then jump down.
                    double lo = dip.Value.Left - WinW / 2 + 10, hi = dip.Value.Right - WinW / 2 - 10;
                    Behave(now, dt, lo, hi);
                    if ((x <= lo || x >= hi) && now - lastEdgeRoll > 1500)
                    {
                        lastEdgeRoll = now;
                        if (random.NextDouble() < 0.35 && mode != Mode.Waiting)
                        {
                            standingOn = IntPtr.Zero;
                            grounded = false;
                            vx = walkDir * 120;
                            vy = -180;
                            x = Math.Max(lo - 30, Math.Min(hi + 30, x + walkDir * 12));
                        }
                    }
                }
            }
            else
            {
                y = floor;
                Behave(now, dt, minX, maxX);
            }
            if (grounded && !dragging) MaybeClimb(now);

            if (Math.Abs(Left - x) > 0.4) Left = x;
            if (Math.Abs(Top - y) > 0.4) Top = y;
            Draw(now);
        }

        void StandOn(IntPtr window)
        {
            standingOn = window;
            var f = Desktop.Frame(window);
            if (f != null) standFrame = f.Value;
            else standingOn = IntPtr.Zero;
        }

        Rect ToDip(Int32Rect r)
        {
            var source = PresentationSource.FromVisual(this);
            if (source == null) return new Rect(r.X, r.Y, r.Width, r.Height);
            var m = source.CompositionTarget.TransformFromDevice;
            return new Rect(m.Transform(new Point(r.X, r.Y)), m.Transform(new Point(r.X + r.Width, r.Y + r.Height)));
        }

        void RefreshPlatforms()
        {
            var source = PresentationSource.FromVisual(this);
            if (source == null) return;
            var toDevice = source.CompositionTarget.TransformToDevice;
            var center = toDevice.Transform(new Point(x + WinW / 2, y + FeetY - 2));
            var screen = WinForms.Screen.FromPoint(new System.Drawing.Point((int)center.X, (int)center.Y)).WorkingArea;
            var me = toDevice.Transform(new Point(x, y));
            var meSize = toDevice.Transform(new Point(WinW, WinH));
            try
            {
                var ledges = Desktop.Ledges(new Int32Rect(screen.X, screen.Y, screen.Width, screen.Height),
                                            new Int32Rect((int)me.X, (int)me.Y, (int)meSize.X, (int)meSize.Y));
                platforms = ledges.Select(l =>
                {
                    var r = ToDip(new Int32Rect(l.Left, l.Top, Math.Max(1, l.Right - l.Left), 1));
                    return new Platform { Hwnd = l.Hwnd, Left = r.Left, Right = r.Right, Top = r.Top };
                }).ToList();
            }
            catch (Exception ex) { AppPaths.LogError("ledges", ex); platforms = new List<Platform>(); }
        }

        /// <summary>Every few seconds while idle: jump up onto a window top nearby.</summary>
        void MaybeClimb(long now)
        {
            if (mode == Mode.Waiting || mode == Mode.None || mode == Mode.Error) return;
            if (nextClimb == 0) nextClimb = now + 5000 + random.Next(6000);
            if (now < nextClimb) return;
            nextClimb = now + 6000 + random.Next(9000);
            double cx = x + WinW / 2, feet = y + FeetY;
            var targets = platforms.Where(p => p.Hwnd != standingOn && p.Top < feet - 30 && p.Top > feet - 340 && p.Right - p.Left > 70 &&
                                               Math.Max(p.Left - cx, cx - p.Right) < 300).ToList();
            if (targets.Count == 0) return;
            var target = targets[random.Next(targets.Count)];
            double tx = Math.Max(target.Left + 30, Math.Min(target.Right - 30, cx));
            double rise = feet - target.Top + 28;
            double v0 = Math.Sqrt(2 * Gravity * rise);
            double time = v0 / Gravity + Math.Sqrt(2 * 28 / Gravity);
            vx = (tx - cx) / time;
            vy = -v0;
            walkDir = vx < 0 ? -1 : 1;
            grounded = false;
            standingOn = IntPtr.Zero;
        }

        void Behave(long now, double dt, double minX, double maxX)
        {
            if (mode == Mode.Waiting)
            {
                // Jump up and down until you look.
                if (now > nextHop) { vy = -460; grounded = false; nextHop = now + 900; }
                return;
            }
            if (mode == Mode.None || mode == Mode.Error) return; // asleep / sulking
            if (now > nextDecision)
            {
                activity = mode == Mode.Busy || random.NextDouble() < 0.6 ? "walk" : "idle";
                if (random.NextDouble() < 0.4) walkDir = -walkDir;
                nextDecision = now + 2000 + random.Next(mode == Mode.Busy ? 2500 : 4500);
            }
            if (activity != "walk") return;
            double speed = mode == Mode.Busy ? 95 : 42;
            x += walkDir * speed * dt;
            if (x < minX) { x = minX; walkDir = 1; }
            if (x > maxX) { x = maxX; walkDir = -1; }
        }

        void Draw(long now)
        {
            if (now > nextBlink) { blinkUntil = now + 130; nextBlink = now + 2600 + random.Next(3200); }
            bool blink = now < blinkUntil;
            var look = new Look { Hat = hat, Glasses = glasses };
            bool walking = grounded && activity == "walk" && mode != Mode.Waiting && mode != Mode.None && mode != Mode.Error;
            bool asleep = grounded && (mode == Mode.None);

            if (dragging)
            {
                bool f = (now / 110) % 2 == 0;
                look.Arms = "up";
                look.LegsB = f;
                look.Mouth = 1;
            }
            else if (!grounded)
            {
                look.Arms = "up";
                look.Happy = now < happyUntil;
            }
            else if (now < happyUntil || mode == Mode.Done) { look.Happy = true; look.Arms = (now / 300) % 2 == 0 ? "up" : "side"; }
            else if (asleep || mode == Mode.Error) look.Eyes = "shut";
            else if (mode == Mode.Waiting) look.Arms = (now / 200) % 2 == 0 ? "wave" : "up";
            else if (walking)
            {
                bool f = (now / (mode == Mode.Busy ? 120 : 220)) % 2 == 0;
                look.LegsB = f;
                look.Arms = mode == Mode.Busy && f ? "down" : "side";
                look.Eyes = blink ? "shut" : walkDir < 0 ? "l" : "r";
            }
            else look.Eyes = blink ? "shut" : "c";

            var rows = ClawdArt.Pose(look);
            sprite.Show(rows, body);
            // Bottom-align: his feet stay on the ground whatever the pose's height.
            double top = FeetY - rows.Length * Px;
            Canvas.SetTop(sprite, top);
            squash.CenterX = SpriteW / 2;
            squash.CenterY = rows.Length * Px;
            double k = Math.Max(0, 1 - (now - landedAt) / 200.0);
            squash.ScaleY = 1 - 0.2 * k;
            squash.ScaleX = 1 + 0.14 * k;

            if (propArt != null && grounded && !dragging)
            {
                prop.Show(propArt, Palette.Clawd);
                prop.Visibility = Visibility.Visible;
                double side = walkDir < 0 ? -1 : 1;
                Canvas.SetLeft(prop, side > 0 ? Pad + SpriteW - 2 * Px + 2 : Pad + 2 * Px - prop.Width - 2);
                Canvas.SetTop(prop, top + 3 * Px - prop.Height / 2);
            }
            else prop.Visibility = Visibility.Collapsed;

            string mark = mode == Mode.Waiting ? "!" : asleep ? "z" : "";
            if (mark.Length > 0)
            {
                bubble.Text = mark;
                bubble.Foreground = Palette.Brush(mode == Mode.Waiting ? Palette.Waiting : Palette.Secondary);
                double p = (now % 1600) / 1600.0;
                bubble.Opacity = mode == Mode.Waiting ? 1 : 0.9 * Math.Sin(p * Math.PI);
                Canvas.SetLeft(bubble, Pad + SpriteW - 3 * Px + (asleep ? p * 8 : 0));
                Canvas.SetTop(bubble, top - 16 - (asleep ? p * 10 : Math.Abs(Math.Sin(now / 200.0)) * 3));
            }
            else bubble.Opacity = 0;
        }
    }
}
