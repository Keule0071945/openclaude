// Claude Island - a Dynamic-Island-style status overlay for Claude Code on Windows.
//
// One executable, two roles:
//   ClaudeIsland.exe          -> the always-on-top island (single instance)
//   ClaudeIsland.exe hook     -> invoked by Claude Code hooks; reads the hook
//                                JSON from stdin and records the session state
//
// Session state lives in %LOCALAPPDATA%\ClaudeIsland\sessions\<session>.json,
// so the island survives restarts and any number of Claude Code windows can
// report into it.
//
// Written in C# 5 so it compiles with the csc.exe that ships with Windows
// (.NET Framework 4.x) - no SDK or extra runtime needed.

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
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
    // ─────────────────────────────────────────────────────────────────────
    // Shared helpers
    // ─────────────────────────────────────────────────────────────────────

    static class AppPaths
    {
        public static readonly string Root = System.IO.Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ClaudeIsland");
        public static readonly string Sessions = System.IO.Path.Combine(Root, "sessions");
        public static readonly string Settings = System.IO.Path.Combine(Root, "settings.ini");
        public static readonly string Log = System.IO.Path.Combine(Root, "island.log");

        public static void LogError(string where, Exception ex)
        {
            try
            {
                Directory.CreateDirectory(Root);
                var info = new FileInfo(Log);
                if (info.Exists && info.Length > 512 * 1024) info.Delete();
                File.AppendAllText(Log, DateTime.Now.ToString("s") + " " + where + ": " + ex + Environment.NewLine);
            }
            catch { }
        }
    }

    /// <summary>Minimal JSON reader/writer (objects, arrays, strings, numbers, bools, null).</summary>
    static class Json
    {
        public static object Parse(string text)
        {
            int i = 0;
            object v = ParseValue(text, ref i);
            SkipWs(text, ref i);
            return v;
        }

        static void SkipWs(string t, ref int i)
        {
            while (i < t.Length && char.IsWhiteSpace(t[i])) i++;
        }

        static object ParseValue(string t, ref int i)
        {
            SkipWs(t, ref i);
            if (i >= t.Length) throw new FormatException("unexpected end");
            char c = t[i];
            if (c == '{')
            {
                var d = new Dictionary<string, object>();
                i++;
                SkipWs(t, ref i);
                if (t[i] == '}') { i++; return d; }
                while (true)
                {
                    SkipWs(t, ref i);
                    string key = ParseString(t, ref i);
                    SkipWs(t, ref i);
                    if (t[i] != ':') throw new FormatException("expected ':'");
                    i++;
                    d[key] = ParseValue(t, ref i);
                    SkipWs(t, ref i);
                    if (t[i] == ',') { i++; continue; }
                    if (t[i] == '}') { i++; return d; }
                    throw new FormatException("expected ',' or '}'");
                }
            }
            if (c == '[')
            {
                var list = new List<object>();
                i++;
                SkipWs(t, ref i);
                if (t[i] == ']') { i++; return list; }
                while (true)
                {
                    list.Add(ParseValue(t, ref i));
                    SkipWs(t, ref i);
                    if (t[i] == ',') { i++; continue; }
                    if (t[i] == ']') { i++; return list; }
                    throw new FormatException("expected ',' or ']'");
                }
            }
            if (c == '"') return ParseString(t, ref i);
            if (string.CompareOrdinal(t, i, "true", 0, 4) == 0) { i += 4; return true; }
            if (string.CompareOrdinal(t, i, "false", 0, 5) == 0) { i += 5; return false; }
            if (string.CompareOrdinal(t, i, "null", 0, 4) == 0) { i += 4; return null; }
            int start = i;
            while (i < t.Length && "+-0123456789.eE".IndexOf(t[i]) >= 0) i++;
            if (i == start) throw new FormatException("unexpected '" + c + "'");
            return double.Parse(t.Substring(start, i - start), System.Globalization.CultureInfo.InvariantCulture);
        }

        static string ParseString(string t, ref int i)
        {
            if (t[i] != '"') throw new FormatException("expected string");
            i++;
            var sb = new StringBuilder();
            while (true)
            {
                char c = t[i++];
                if (c == '"') return sb.ToString();
                if (c != '\\') { sb.Append(c); continue; }
                char e = t[i++];
                switch (e)
                {
                    case 'n': sb.Append('\n'); break;
                    case 'r': sb.Append('\r'); break;
                    case 't': sb.Append('\t'); break;
                    case 'b': sb.Append('\b'); break;
                    case 'f': sb.Append('\f'); break;
                    case 'u':
                        sb.Append((char)Convert.ToInt32(t.Substring(i, 4), 16));
                        i += 4;
                        break;
                    default: sb.Append(e); break;
                }
            }
        }

        public static string Serialize(object v)
        {
            var sb = new StringBuilder();
            Write(sb, v);
            return sb.ToString();
        }

        static void Write(StringBuilder sb, object v)
        {
            var inv = System.Globalization.CultureInfo.InvariantCulture;
            if (v == null) { sb.Append("null"); return; }
            var str = v as string;
            if (str != null)
            {
                sb.Append('"');
                foreach (char c in str)
                {
                    switch (c)
                    {
                        case '"': sb.Append("\\\""); break;
                        case '\\': sb.Append("\\\\"); break;
                        case '\n': sb.Append("\\n"); break;
                        case '\r': sb.Append("\\r"); break;
                        case '\t': sb.Append("\\t"); break;
                        default:
                            if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4"));
                            else sb.Append(c);
                            break;
                    }
                }
                sb.Append('"');
                return;
            }
            if (v is bool) { sb.Append((bool)v ? "true" : "false"); return; }
            var dict = v as Dictionary<string, object>;
            if (dict != null)
            {
                sb.Append('{');
                bool first = true;
                foreach (var kv in dict)
                {
                    if (!first) sb.Append(',');
                    first = false;
                    Write(sb, kv.Key);
                    sb.Append(':');
                    Write(sb, kv.Value);
                }
                sb.Append('}');
                return;
            }
            var list = v as System.Collections.IEnumerable;
            if (list != null)
            {
                sb.Append('[');
                bool first = true;
                foreach (var item in list)
                {
                    if (!first) sb.Append(',');
                    first = false;
                    Write(sb, item);
                }
                sb.Append(']');
                return;
            }
            if (v is double) { sb.Append(((double)v).ToString("R", inv)); return; }
            sb.Append(Convert.ToString(v, inv));
        }

        public static string Str(Dictionary<string, object> d, string key)
        {
            object v;
            if (d == null || !d.TryGetValue(key, out v) || v == null) return "";
            return v as string ?? Convert.ToString(v, System.Globalization.CultureInfo.InvariantCulture);
        }

        public static long Long(Dictionary<string, object> d, string key)
        {
            object v;
            if (d == null || !d.TryGetValue(key, out v) || v == null) return 0;
            try { return Convert.ToInt64(v, System.Globalization.CultureInfo.InvariantCulture); }
            catch { return 0; }
        }

        public static Dictionary<string, object> Obj(Dictionary<string, object> d, string key)
        {
            object v;
            if (d == null || !d.TryGetValue(key, out v)) return null;
            return v as Dictionary<string, object>;
        }
    }

    static class PathText
    {
        /// <summary>Last segment of a Windows, WSL or POSIX path.</summary>
        public static string LastSegment(string path)
        {
            string p = (path ?? "").TrimEnd('/', '\\');
            int cut = Math.Max(p.LastIndexOf('/'), p.LastIndexOf('\\'));
            return cut >= 0 ? p.Substring(cut + 1) : p;
        }
    }

    static class Clock
    {
        static readonly DateTime Epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        public static long NowMs() { return (long)(DateTime.UtcNow - Epoch).TotalMilliseconds; }
        public static long ToMs(DateTime utc) { return (long)(utc - Epoch).TotalMilliseconds; }

        public static string Duration(long ms)
        {
            if (ms < 0) ms = 0;
            long s = ms / 1000;
            if (s < 3600) return (s / 60) + ":" + (s % 60).ToString("00");
            return (s / 3600) + ":" + (s / 60 % 60).ToString("00") + ":" + (s % 60).ToString("00");
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Entry point
    // ─────────────────────────────────────────────────────────────────────

    static class Program
    {
        [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int nStdHandle);
        [DllImport("kernel32.dll")] static extern int GetFileType(IntPtr hFile);
        const int STD_INPUT_HANDLE = -10;
        const int FILE_TYPE_PIPE = 3;

        static bool StdinIsPipe()
        {
            try { return GetFileType(GetStdHandle(STD_INPUT_HANDLE)) == FILE_TYPE_PIPE; }
            catch { return false; }
        }

        [STAThread]
        static int Main(string[] args)
        {
            string mode = args.Length > 0 ? args[0].ToLowerInvariant() : "";
            // Claude Code pipes the hook payload into stdin; treat a piped
            // launch without arguments as a hook call too.
            if (mode == "hook" || (mode == "" && StdinIsPipe()))
            {
                try { return HookRecorder.Run(); }
                catch (Exception ex) { AppPaths.LogError("hook", ex); return 0; }
            }

            bool createdNew;
            using (var single = new Mutex(true, "Local\\ClaudeIsland.Overlay", out createdNew))
            {
                if (!createdNew) return 0;
                var app = new Application();
                app.ShutdownMode = ShutdownMode.OnExplicitShutdown;
                app.DispatcherUnhandledException += (s, e) =>
                {
                    AppPaths.LogError("ui", e.Exception);
                    e.Handled = true;
                };
                var window = new IslandWindow(mode == "demo");
                window.Show();
                app.Run();
            }
            return 0;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Hook side: Claude Code event -> session file
    // ─────────────────────────────────────────────────────────────────────

    static class HookRecorder
    {
        public static int Run()
        {
            // Take the timestamp first: hooks run async, so this is how we
            // drop an event that lost the race against a newer one.
            long now = Clock.NowMs();
            string input;
            using (var reader = new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false)))
                input = reader.ReadToEnd();
            Record(input, now);
            return 0;
        }

        /// <summary>Apply one hook payload to its session file.</summary>
        public static void Record(string input, long now)
        {
            if (string.IsNullOrWhiteSpace(input)) return;
            var hook = Json.Parse(input) as Dictionary<string, object>;
            if (hook == null) return;
            string ev = Json.Str(hook, "hook_event_name");
            string sid = SafeId(Json.Str(hook, "session_id"));
            if (sid.Length == 0 || ev.Length == 0) return;

            Directory.CreateDirectory(AppPaths.Sessions);
            string path = System.IO.Path.Combine(AppPaths.Sessions, sid + ".json");

            using (var mutex = new Mutex(false, "Local\\ClaudeIsland.Sessions"))
            {
                bool owned = false;
                try
                {
                    try { owned = mutex.WaitOne(4000); }
                    catch (AbandonedMutexException) { owned = true; }
                    Apply(path, hook, ev, sid, now);
                }
                finally
                {
                    if (owned) mutex.ReleaseMutex();
                }
            }
        }

        static void Apply(string path, Dictionary<string, object> hook, string ev, string sid, long now)
        {
            if (ev == "SessionEnd")
            {
                if (File.Exists(path)) File.Delete(path);
                return;
            }

            Dictionary<string, object> s = null;
            if (File.Exists(path))
            {
                try { s = Json.Parse(File.ReadAllText(path, Encoding.UTF8)) as Dictionary<string, object>; }
                catch { s = null; }
            }
            if (s == null) s = new Dictionary<string, object>();
            if (Json.Long(s, "updated") > now) return; // a newer event already landed

            string state = Json.Str(s, "state");
            string toolName = Json.Str(hook, "tool_name");
            string detail = DescribeTool(toolName, Json.Obj(hook, "tool_input"));

            switch (ev)
            {
                case "SessionStart":
                    if (state != "busy" && state != "waiting") state = "ready";
                    break;
                case "UserPromptSubmit":
                    state = "busy";
                    s["turnStart"] = now;
                    s["tool"] = "";
                    s["detail"] = "";
                    break;
                case "PreToolUse":
                case "PostToolUse":
                case "PostToolUseFailure":
                case "PermissionDenied":
                    state = "busy";
                    if (Json.Long(s, "turnStart") == 0) s["turnStart"] = now;
                    if (toolName.Length > 0) { s["tool"] = toolName; s["detail"] = detail; }
                    break;
                case "PermissionRequest":
                    state = "waiting";
                    s["tool"] = toolName;
                    s["detail"] = detail;
                    break;
                case "Notification":
                {
                    string kind = Json.Str(hook, "notification_type");
                    string message = Json.Str(hook, "message");
                    bool permission = kind == "permission_prompt" ||
                        (kind.Length == 0 && message.IndexOf("permission", StringComparison.OrdinalIgnoreCase) >= 0);
                    bool question = kind == "elicitation_dialog" || kind == "agent_needs_input";
                    if (!permission && !question) return; // idle_prompt etc. change nothing
                    state = "waiting";
                    if (question) { s["tool"] = ""; s["detail"] = message; }
                    break;
                }
                case "Stop":
                    state = "done";
                    s["doneAt"] = now;
                    long start = Json.Long(s, "turnStart");
                    s["duration"] = start > 0 ? now - start : 0;
                    s["turnStart"] = 0;
                    break;
                case "StopFailure":
                    state = "error";
                    s["doneAt"] = now;
                    s["detail"] = Json.Str(hook, "error");
                    s["turnStart"] = 0;
                    break;
                default:
                    return;
            }

            s["state"] = state;
            s["session"] = Json.Str(hook, "session_id");
            string cwd = Json.Str(hook, "cwd");
            if (cwd.Length > 0) s["cwd"] = cwd;
            string transcript = Json.Str(hook, "transcript_path");
            if (transcript.Length > 0) s["transcript"] = transcript;
            s["updated"] = now;

            string tmp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
            File.WriteAllText(tmp, Json.Serialize(s), new UTF8Encoding(false));
            for (int attempt = 0; ; attempt++)
            {
                try
                {
                    if (File.Exists(path)) File.Replace(tmp, path, null, true);
                    else File.Move(tmp, path);
                    return;
                }
                catch (IOException)
                {
                    if (attempt >= 8) { try { File.Delete(tmp); } catch { } throw; }
                    Thread.Sleep(25);
                }
            }
        }

        static string SafeId(string id)
        {
            var sb = new StringBuilder();
            foreach (char c in id)
                if (char.IsLetterOrDigit(c) || c == '-' || c == '_') sb.Append(c);
            return sb.ToString();
        }

        /// <summary>A short, human description of what a tool is doing.</summary>
        public static string DescribeTool(string tool, Dictionary<string, object> input)
        {
            if (tool.Length == 0) return "";
            string arg = "";
            if (input != null)
            {
                foreach (var key in new[] { "command", "file_path", "notebook_path", "path", "pattern", "url", "query", "description", "skill", "prompt" })
                {
                    arg = Json.Str(input, key);
                    if (arg.Length > 0)
                    {
                        if (key.EndsWith("path")) arg = PathText.LastSegment(arg);
                        break;
                    }
                }
            }
            arg = arg.Replace("\r", " ").Replace("\n", " ").Trim();
            if (arg.Length > 70) arg = arg.Substring(0, 69) + "…";

            string verb;
            switch (tool)
            {
                case "Read": verb = "Liest"; break;
                case "Edit": case "MultiEdit": case "NotebookEdit": verb = "Bearbeitet"; break;
                case "Write": verb = "Schreibt"; break;
                case "Grep": case "Glob": verb = "Sucht"; break;
                case "WebFetch": verb = "Lädt"; break;
                case "WebSearch": verb = "Recherchiert"; break;
                case "Task": case "Agent": verb = "Agent"; break;
                case "TodoWrite": return "Plant Aufgaben";
                default: verb = tool; break;
            }
            return arg.Length > 0 ? verb + " · " + arg : verb;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Island side: session files -> view model
    // ─────────────────────────────────────────────────────────────────────

    enum Mode { None, Ready, Busy, Waiting, Done, Error }

    sealed class Session
    {
        public string Id;
        public string Project;
        public string State;    // ready | busy | waiting | done | error
        public string Tool;
        public string Detail;
        public long TurnStart;
        public long DoneAt;
        public long Duration;
        public long Updated;
    }

    sealed class SessionStore
    {
        const long CelebrateMs = 4200;
        const long ErrorMs = 6000;
        const long StaleBusyMs = 45 * 60 * 1000;
        const long ForgetMs = 2L * 24 * 60 * 60 * 1000;

        readonly Dictionary<string, Tuple<DateTime, bool>> interruptCache = new Dictionary<string, Tuple<DateTime, bool>>();

        public List<Session> Load()
        {
            var list = new List<Session>();
            if (!Directory.Exists(AppPaths.Sessions)) return list;
            long now = Clock.NowMs();
            foreach (var file in Directory.GetFiles(AppPaths.Sessions, "*.json"))
            {
                try
                {
                    Dictionary<string, object> d;
                    using (var fs = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
                    using (var r = new StreamReader(fs, Encoding.UTF8))
                        d = Json.Parse(r.ReadToEnd()) as Dictionary<string, object>;
                    if (d == null) continue;

                    var s = new Session();
                    s.Id = Json.Str(d, "session");
                    string cwd = Json.Str(d, "cwd");
                    s.Project = PathText.LastSegment(cwd);
                    if (s.Project.Length == 0) s.Project = cwd.Length > 0 ? cwd : "Claude";
                    s.State = Json.Str(d, "state");
                    s.Tool = Json.Str(d, "tool");
                    s.Detail = Json.Str(d, "detail");
                    s.TurnStart = Json.Long(d, "turnStart");
                    s.DoneAt = Json.Long(d, "doneAt");
                    s.Duration = Json.Long(d, "duration");
                    s.Updated = Json.Long(d, "updated");

                    if (now - s.Updated > ForgetMs)
                    {
                        try { File.Delete(file); } catch { }
                        continue;
                    }

                    string transcript = Json.Str(d, "transcript");
                    if ((s.State == "busy" || s.State == "waiting") && transcript.Length > 0)
                    {
                        // Esc does not fire a Stop hook; the transcript does
                        // record the interruption, so read it from there.
                        DateTime mtime = SafeMtime(transcript);
                        if (mtime != DateTime.MinValue && Clock.ToMs(mtime) > s.Updated + 200 &&
                            WasInterrupted(file, transcript, mtime))
                            s.State = "ready";
                        else if (now - Math.Max(s.Updated, Clock.ToMs(mtime)) > StaleBusyMs)
                            s.State = "ready";
                    }
                    list.Add(s);
                }
                catch (IOException) { }
                catch (Exception ex) { AppPaths.LogError("load " + file, ex); }
            }
            list.Sort((a, b) => b.Updated.CompareTo(a.Updated));
            return list;
        }

        public static Mode DisplayMode(Session s, long now)
        {
            switch (s.State)
            {
                case "busy": return Mode.Busy;
                case "waiting": return Mode.Waiting;
                case "done": return now - s.DoneAt < CelebrateMs ? Mode.Done : Mode.Ready;
                case "error": return now - s.DoneAt < ErrorMs ? Mode.Error : Mode.Ready;
                default: return Mode.Ready;
            }
        }

        static DateTime SafeMtime(string path)
        {
            try { return File.Exists(path) ? File.GetLastWriteTimeUtc(path) : DateTime.MinValue; }
            catch { return DateTime.MinValue; }
        }

        bool WasInterrupted(string key, string transcript, DateTime mtime)
        {
            Tuple<DateTime, bool> cached;
            if (interruptCache.TryGetValue(key, out cached) && cached.Item1 == mtime) return cached.Item2;
            bool result = false;
            try
            {
                using (var fs = new FileStream(transcript, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
                {
                    long take = Math.Min(fs.Length, 32 * 1024);
                    fs.Seek(-take, SeekOrigin.End);
                    var buf = new byte[take];
                    int read = 0;
                    while (read < take)
                    {
                        int n = fs.Read(buf, read, (int)take - read);
                        if (n <= 0) break;
                        read += n;
                    }
                    string tail = Encoding.UTF8.GetString(buf, 0, read);
                    string last = tail.Split('\n').Select(l => l.Trim()).LastOrDefault(l => l.Length > 0) ?? "";
                    result = last.IndexOf("Request interrupted by user", StringComparison.Ordinal) >= 0;
                }
            }
            catch { }
            interruptCache[key] = Tuple.Create(mtime, result);
            return result;
        }
    }

    /// <summary>Scripted fake sessions for the tray's "Vorführen" item.</summary>
    static class Demo
    {
        public static List<Session> At(double t, long startMs)
        {
            var s = new Session { Id = "demo", Project = "mein-projekt", Updated = startMs };
            var other = new Session { Id = "demo2", Project = "website", State = "ready", Updated = startMs };
            if (t < 2.5) s.State = "ready";
            else if (t < 7.5)
            {
                s.State = "busy";
                s.TurnStart = startMs + 2500;
                s.Tool = "Bash";
                s.Detail = t < 5 ? "Liest · REPL.tsx" : "Bash · npm test";
            }
            else if (t < 11.5) { s.State = "waiting"; s.Tool = "Bash"; s.Detail = "Bash · git push origin main"; s.TurnStart = startMs + 2500; }
            else if (t < 14.5) { s.State = "busy"; s.TurnStart = startMs + 2500; s.Tool = "Edit"; s.Detail = "Bearbeitet · App.tsx"; }
            else { s.State = "done"; s.DoneAt = startMs + 14500; s.Duration = 12000; }
            return new List<Session> { s, other };
        }

        public const double Length = 20;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Physics
    // ─────────────────────────────────────────────────────────────────────

    /// <summary>Damped harmonic spring, integrated with fixed sub-steps.</summary>
    sealed class Spring
    {
        public double Value, Velocity, Target;
        readonly double stiffness, damping;

        public Spring(double value, double stiffness, double damping)
        {
            Value = Target = value;
            this.stiffness = stiffness;
            this.damping = damping;
        }

        public bool Settled
        {
            get { return Math.Abs(Value - Target) < 0.05 && Math.Abs(Velocity) < 0.5; }
        }

        public void Step(double dt)
        {
            const double h = 1.0 / 240;
            while (dt > 0)
            {
                double step = Math.Min(h, dt);
                double force = -stiffness * (Value - Target) - damping * Velocity;
                Velocity += force * step;
                Value += Velocity * step;
                dt -= step;
            }
            if (Settled) { Value = Target; Velocity = 0; }
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // The island
    // ─────────────────────────────────────────────────────────────────────

    static class Palette
    {
        public static readonly Color Island = Color.FromRgb(0, 0, 0);
        public static readonly Color Text = Color.FromRgb(245, 245, 247);
        public static readonly Color Secondary = Color.FromRgb(152, 152, 160);
        public static readonly Color Busy = Color.FromRgb(255, 140, 90);
        public static readonly Color Ready = Color.FromRgb(52, 211, 153);
        public static readonly Color Waiting = Color.FromRgb(251, 191, 36);
        public static readonly Color Error = Color.FromRgb(248, 113, 113);
        public static readonly Color Idle = Color.FromRgb(90, 90, 98);

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

        public static SolidColorBrush Brush(Color c)
        {
            var b = new SolidColorBrush(c);
            b.Freeze();
            return b;
        }
    }

    sealed class IslandWindow : Window
    {
        // Geometry (DIPs)
        const double WindowW = 560, WindowH = 300;
        const double Shoulder = 9;
        const double HeaderH = 34;
        const double RowH = 46;
        const int MaxRows = 4;
        const double PadX = 14;

        readonly bool demoOnStart;
        readonly SessionStore store = new SessionStore();
        readonly Settings settings = Settings.Load();

        // Physics
        readonly Spring width = new Spring(48, 420, 30);
        readonly Spring height = new Spring(26, 420, 30);
        readonly Spring shake = new Spring(0, 1100, 14);
        bool rendering;
        TimeSpan lastRender;

        // Visual tree
        Canvas canvas;
        Path islandPath;
        DropShadowEffect glow;
        Canvas contentHost;
        Grid header;
        Grid indicatorHost;
        TextBlock label, timeLabel;
        StackPanel accessory;
        FrameworkElement bars;
        Border countBadge;
        TextBlock countText;
        StackPanel rowsPanel;
        readonly Dictionary<Mode, FrameworkElement> indicators = new Dictionary<Mode, FrameworkElement>();

        // State
        Mode mode = (Mode)(-1);
        bool expanded;
        long hoverSince;
        long autoExpandUntil;
        string focusSession;
        readonly Dictionary<string, Mode> lastModes = new Dictionary<string, Mode>();
        bool firstPoll = true;
        bool pendingFlash;
        long demoStart;
        bool hiddenForFullscreen;
        IntPtr hwnd;
        WinForms.NotifyIcon tray;

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
            Focusable = false;
            Width = WindowW;
            Height = WindowH;
            Top = 0;
            Left = SystemParameters.PrimaryScreenWidth / 2 - WindowW / 2;
            TextOptions.SetTextFormattingMode(this, TextFormattingMode.Display);
            TextOptions.SetTextRenderingMode(this, TextRenderingMode.ClearType);

            BuildVisualTree();
            SourceInitialized += OnSourceInitialized;
            Loaded += OnLoaded;
            Closed += (s, e) => { if (tray != null) tray.Dispose(); };
            SystemParameters.StaticPropertyChanged += (s, e) =>
            {
                if (e.PropertyName == "PrimaryScreenWidth")
                    Left = SystemParameters.PrimaryScreenWidth / 2 - WindowW / 2;
            };
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
            // Click-through, never focused, hidden from Alt+Tab.
            int ex = GetWindowLong(hwnd, GWL_EXSTYLE);
            SetWindowLong(hwnd, GWL_EXSTYLE, ex | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_LAYERED | WS_EX_NOACTIVATE);
        }

        void OnLoaded(object sender, RoutedEventArgs e)
        {
            SetupTray();

            var poll = new DispatcherTimer(DispatcherPriority.Background) { Interval = TimeSpan.FromMilliseconds(250) };
            poll.Tick += (s, a) => Poll();
            poll.Start();

            var hover = new DispatcherTimer(DispatcherPriority.Input) { Interval = TimeSpan.FromMilliseconds(40) };
            hover.Tick += (s, a) => CheckHover();
            hover.Start();

            var chores = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1.5) };
            chores.Tick += (s, a) => { KeepOnTop(); CheckFullscreen(); };
            chores.Start();

            // Entrance: drop in from above the screen edge.
            height.Value = 0;
            width.Value = 24;
            if (demoOnStart) StartDemo();
            Poll();
            StartRendering();
        }

        void KeepOnTop()
        {
            if (hwnd != IntPtr.Zero)
                SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
        }

        /// <summary>Fade out while a fullscreen app (video, game, slides) owns the primary screen.</summary>
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
                        IntPtr mon = MonitorFromWindow(fg, 2 /* MONITOR_DEFAULTTONEAREST */);
                        if (GetWindowRect(fg, out r) && GetMonitorInfo(mon, ref mi) && (mi.dwFlags & 1) != 0 /* primary */)
                            fullscreen = r.Left <= mi.rcMonitor.Left && r.Top <= mi.rcMonitor.Top &&
                                         r.Right >= mi.rcMonitor.Right && r.Bottom >= mi.rcMonitor.Bottom;
                    }
                }
            }
            catch { }
            if (fullscreen == hiddenForFullscreen) return;
            hiddenForFullscreen = fullscreen;
            var anim = new DoubleAnimation(fullscreen ? 0 : 1, TimeSpan.FromMilliseconds(fullscreen ? 180 : 320));
            anim.EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut };
            canvas.BeginAnimation(OpacityProperty, anim);
        }

        // ── visual tree ───────────────────────────────────────────────────

        static readonly FontFamily UiFont = new FontFamily("Segoe UI Variable Text, Segoe UI");

        void BuildVisualTree()
        {
            canvas = new Canvas { Width = WindowW, Height = WindowH };
            Content = canvas;

            glow = new DropShadowEffect { ShadowDepth = 0, BlurRadius = 26, Color = Colors.Black, Opacity = 0.55, RenderingBias = RenderingBias.Performance };
            islandPath = new Path { Fill = Palette.Brush(Palette.Island), Effect = glow, SnapsToDevicePixels = false };
            canvas.Children.Add(islandPath);

            contentHost = new Canvas { ClipToBounds = true };
            canvas.Children.Add(contentHost);

            header = new Grid { Height = HeaderH };
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(18) });
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            contentHost.Children.Add(header);

            indicatorHost = new Grid { Width = 18, Height = 18, VerticalAlignment = VerticalAlignment.Center };
            header.Children.Add(indicatorHost);
            indicators[Mode.Busy] = MakeSpinner();
            indicators[Mode.Ready] = MakeReadyDot();
            indicators[Mode.Waiting] = MakeWaitingPulse();
            indicators[Mode.Done] = MakeCheck();
            indicators[Mode.Error] = MakeErrorDot();
            indicators[Mode.None] = MakeIdleDot();
            foreach (var el in indicators.Values)
            {
                el.Opacity = 0;
                el.Visibility = Visibility.Collapsed;
                indicatorHost.Children.Add(el);
            }

            var labels = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(9, 0, 0, 1) };
            Grid.SetColumn(labels, 1);
            label = new TextBlock { FontFamily = UiFont, FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Palette.Brush(Palette.Text) };
            timeLabel = new TextBlock { FontFamily = UiFont, FontSize = 13, Foreground = Palette.Brush(Palette.Secondary) };
            Typography.SetNumeralAlignment(timeLabel, FontNumeralAlignment.Tabular);
            labels.Children.Add(label);
            labels.Children.Add(timeLabel);
            header.Children.Add(labels);

            accessory = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(10, 0, 0, 0) };
            Grid.SetColumn(accessory, 3);
            bars = MakeActivityBars();
            countText = new TextBlock { FontFamily = UiFont, FontSize = 11, FontWeight = FontWeights.SemiBold, Foreground = Palette.Brush(Palette.Text), HorizontalAlignment = HorizontalAlignment.Center };
            countBadge = new Border { CornerRadius = new CornerRadius(8), Background = Palette.Brush(Color.FromRgb(44, 44, 50)), Padding = new Thickness(6, 1, 6, 1), Child = countText, Margin = new Thickness(6, 0, 0, 0) };
            accessory.Children.Add(bars);
            accessory.Children.Add(countBadge);
            header.Children.Add(accessory);

            rowsPanel = new StackPanel { Opacity = 0 };
            contentHost.Children.Add(rowsPanel);
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

        static PropertyPath TransformPath(DependencyProperty transformProperty)
        {
            return new PropertyPath("(0).(1)", UIElement.RenderTransformProperty, transformProperty);
        }

        // Each indicator keeps its looping storyboards in Tag so they only run while visible.
        FrameworkElement MakeSpinner()
        {
            var g = new Grid { Width = 16, Height = 16 };
            g.Children.Add(new Ellipse { Stroke = Palette.Brush(Color.FromArgb(55, Palette.Busy.R, Palette.Busy.G, Palette.Busy.B)), StrokeThickness = 2.2 });
            var rot = new RotateTransform(0, 8, 8);
            var arcBrush = new LinearGradientBrush(Color.FromArgb(0, Palette.Busy.R, Palette.Busy.G, Palette.Busy.B), Palette.Busy, new Point(0, 0), new Point(1, 1));
            var arc = new Path
            {
                Data = Geometry.Parse("M 8,1.1 A 6.9,6.9 0 0 1 14.9,8"),
                Stroke = arcBrush,
                StrokeThickness = 2.2,
                StrokeStartLineCap = PenLineCap.Round,
                StrokeEndLineCap = PenLineCap.Round,
                RenderTransform = rot
            };
            g.Children.Add(arc);
            g.Tag = new[] { Forever(arc, TransformPath(RotateTransform.AngleProperty), 0, 360, 0.85, false, null) };
            return g;
        }

        FrameworkElement MakeReadyDot()
        {
            var dot = new Ellipse
            {
                Width = 9, Height = 9, Fill = Palette.Brush(Palette.Ready),
                RenderTransformOrigin = new Point(0.5, 0.5),
                RenderTransform = new ScaleTransform(1, 1),
                Effect = new DropShadowEffect { ShadowDepth = 0, BlurRadius = 10, Color = Palette.Ready, Opacity = 0.9 }
            };
            var ease = new SineEase { EasingMode = EasingMode.EaseInOut };
            dot.Tag = new[]
            {
                Forever(dot, TransformPath(ScaleTransform.ScaleXProperty), 1, 0.78, 1.5, true, ease),
                Forever(dot, TransformPath(ScaleTransform.ScaleYProperty), 1, 0.78, 1.5, true, ease),
                Forever(dot, new PropertyPath("(0).(1)", UIElement.EffectProperty, DropShadowEffect.OpacityProperty), 0.9, 0.35, 1.5, true, ease),
            };
            return dot;
        }

        FrameworkElement MakeWaitingPulse()
        {
            var g = new Grid { Width = 18, Height = 18 };
            var ring = new Ellipse
            {
                Width = 9, Height = 9, Stroke = Palette.Brush(Palette.Waiting), StrokeThickness = 1.6,
                RenderTransformOrigin = new Point(0.5, 0.5), RenderTransform = new ScaleTransform(1, 1)
            };
            var dot = new Ellipse { Width = 9, Height = 9, Fill = Palette.Brush(Palette.Waiting) };
            g.Children.Add(ring);
            g.Children.Add(dot);
            var ease = new QuadraticEase { EasingMode = EasingMode.EaseOut };
            g.Tag = new[]
            {
                Forever(ring, TransformPath(ScaleTransform.ScaleXProperty), 1, 2.3, 1.1, false, ease),
                Forever(ring, TransformPath(ScaleTransform.ScaleYProperty), 1, 2.3, 1.1, false, ease),
                Forever(ring, new PropertyPath(UIElement.OpacityProperty), 0.9, 0, 1.1, false, ease),
            };
            return g;
        }

        Path checkPath;
        Ellipse checkCircle;

        FrameworkElement MakeCheck()
        {
            var g = new Grid { Width = 18, Height = 18 };
            checkCircle = new Ellipse
            {
                Width = 17, Height = 17, Fill = Palette.Brush(Palette.Ready),
                RenderTransformOrigin = new Point(0.5, 0.5), RenderTransform = new ScaleTransform(1, 1)
            };
            checkPath = new Path
            {
                Data = Geometry.Parse("M 5,9.3 L 7.8,12 L 13.2,6.2"),
                Stroke = Brushes.Black,
                StrokeThickness = 2.1,
                StrokeStartLineCap = PenLineCap.Round,
                StrokeEndLineCap = PenLineCap.Round,
                StrokeLineJoin = PenLineJoin.Round,
                StrokeDashArray = new DoubleCollection { 6, 6 },
                StrokeDashOffset = 6
            };
            g.Children.Add(checkCircle);
            g.Children.Add(checkPath);
            return g;
        }

        void PlayCheck()
        {
            var pop = new DoubleAnimation(0.3, 1, TimeSpan.FromMilliseconds(420)) { EasingFunction = new BackEase { Amplitude = 0.55, EasingMode = EasingMode.EaseOut } };
            checkCircle.RenderTransform.BeginAnimation(ScaleTransform.ScaleXProperty, pop);
            checkCircle.RenderTransform.BeginAnimation(ScaleTransform.ScaleYProperty, pop);
            var draw = new DoubleAnimation(6, 0, TimeSpan.FromMilliseconds(360))
            {
                BeginTime = TimeSpan.FromMilliseconds(150),
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
            };
            checkPath.BeginAnimation(Shape.StrokeDashOffsetProperty, draw);
        }

        FrameworkElement MakeErrorDot()
        {
            var g = new Grid { Width = 17, Height = 17 };
            g.Children.Add(new Ellipse { Fill = Palette.Brush(Palette.Error) });
            g.Children.Add(new TextBlock
            {
                Text = "!", FontFamily = UiFont, FontSize = 12, FontWeight = FontWeights.Bold, Foreground = Brushes.Black,
                HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, -1, 0, 0)
            });
            return g;
        }

        FrameworkElement MakeIdleDot()
        {
            return new Ellipse { Width = 6, Height = 6, Fill = Palette.Brush(Palette.Idle) };
        }

        FrameworkElement MakeActivityBars()
        {
            var panel = new StackPanel { Orientation = Orientation.Horizontal, Height = 14, VerticalAlignment = VerticalAlignment.Center };
            var brush = new LinearGradientBrush(Palette.Busy, Color.FromRgb(255, 196, 140), 90);
            brush.Freeze();
            double[] periods = { 0.42, 0.57, 0.36, 0.5 };
            var boards = new List<Storyboard>();
            for (int i = 0; i < periods.Length; i++)
            {
                var bar = new Rectangle
                {
                    Width = 3, Height = 14, RadiusX = 1.5, RadiusY = 1.5, Fill = brush,
                    Margin = new Thickness(i == 0 ? 0 : 2.5, 0, 0, 0),
                    RenderTransformOrigin = new Point(0.5, 0.5), RenderTransform = new ScaleTransform(1, 0.3)
                };
                panel.Children.Add(bar);
                boards.Add(Forever(bar, TransformPath(ScaleTransform.ScaleYProperty), 0.28, 1, periods[i], true, new SineEase { EasingMode = EasingMode.EaseInOut }));
            }
            panel.Tag = boards.ToArray();
            return panel;
        }

        static void SetLooping(FrameworkElement el, bool on)
        {
            var boards = el.Tag as Storyboard[];
            if (boards == null) return;
            foreach (var sb in boards)
            {
                if (on) sb.Begin(el, true);
                else sb.Stop(el);
            }
        }

        // ── state → visuals ──────────────────────────────────────────────

        void Poll()
        {
            long now = Clock.NowMs();
            List<Session> sessions;
            if (demoStart > 0)
            {
                double t = (now - demoStart) / 1000.0;
                if (t > Demo.Length) { demoStart = 0; sessions = store.Load(); }
                else sessions = Demo.At(t, demoStart);
            }
            else sessions = store.Load();

            // Transitions drive the "moments": celebrate, ask, shake.
            foreach (var s in sessions)
            {
                Mode m = SessionStore.DisplayMode(s, now);
                Mode prev;
                bool known = lastModes.TryGetValue(s.Id, out prev);
                lastModes[s.Id] = m;
                if (firstPoll || !known || prev == m) continue;
                if (m == Mode.Done || m == Mode.Error)
                {
                    focusSession = s.Id;
                    autoExpandUntil = now + 3800;
                    if (m == Mode.Done) pendingFlash = true;
                    if (settings.Sound) System.Media.SystemSounds.Asterisk.Play();
                }
                else if (m == Mode.Waiting)
                {
                    focusSession = s.Id;
                    autoExpandUntil = now + 5000;
                    shake.Velocity += 520;
                    StartRendering();
                    if (settings.Sound) System.Media.SystemSounds.Exclamation.Play();
                }
            }
            firstPoll = false;

            Mode overall = Mode.None;
            if (sessions.Count > 0) overall = Mode.Ready;
            Func<Mode, int> count = x => sessions.Count(s => SessionStore.DisplayMode(s, now) == x);
            int waiting = count(Mode.Waiting), busy = count(Mode.Busy), done = count(Mode.Done), error = count(Mode.Error);
            if (waiting > 0) overall = Mode.Waiting;
            else if (busy > 0) overall = Mode.Busy;
            else if (error > 0) overall = Mode.Error;
            else if (done > 0) overall = Mode.Done;

            string text = "", time = "";
            switch (overall)
            {
                case Mode.Waiting:
                    text = waiting > 1 ? waiting + " brauchen dich" : "Braucht dich";
                    break;
                case Mode.Busy:
                {
                    long longest = sessions.Where(s => SessionStore.DisplayMode(s, now) == Mode.Busy && s.TurnStart > 0)
                                           .Select(s => now - s.TurnStart).DefaultIfEmpty(0).Max();
                    text = busy > 1 ? busy + " arbeiten" : "Arbeitet";
                    time = "  " + Clock.Duration(longest);
                    break;
                }
                case Mode.Done:
                {
                    var s = sessions.FirstOrDefault(x => x.Id == focusSession && SessionStore.DisplayMode(x, now) == Mode.Done)
                            ?? sessions.First(x => SessionStore.DisplayMode(x, now) == Mode.Done);
                    text = "Fertig";
                    if (s.Duration > 0) time = "  " + Clock.Duration(s.Duration);
                    break;
                }
                case Mode.Error: text = "Fehler"; break;
                case Mode.Ready: text = "Bereit"; break;
            }

            ApplyMode(overall);
            // After ApplyMode, which resets the glow; otherwise the flash is lost.
            if (pendingFlash) { pendingFlash = false; Flash(Palette.Ready); }
            label.Text = text;
            timeLabel.Text = time;
            label.Foreground = overall == Mode.Busy ? ShimmerBrush() : Palette.Brush(Palette.Text);

            bars.Visibility = overall == Mode.Busy ? Visibility.Visible : Visibility.Collapsed;
            countBadge.Visibility = sessions.Count > 1 ? Visibility.Visible : Visibility.Collapsed;
            countText.Text = sessions.Count.ToString();

            bool wantExpanded = (hoverSince > 0 && now - hoverSince > 220) || now < autoExpandUntil;
            UpdateRows(sessions, now, wantExpanded);
            SetExpanded(wantExpanded);
            UpdateTargets(sessions.Count);
        }

        void ApplyMode(Mode next)
        {
            if (next == mode) return;
            Mode prev = mode;
            mode = next;

            foreach (var kv in indicators)
            {
                bool show = kv.Key == next;
                var el = kv.Value;
                if (show)
                {
                    el.Visibility = Visibility.Visible;
                    SetLooping(el, true);
                    var fadeIn = new DoubleAnimation(1, TimeSpan.FromMilliseconds(240)) { BeginTime = TimeSpan.FromMilliseconds(70) };
                    el.BeginAnimation(OpacityProperty, fadeIn);
                    if (kv.Key == Mode.Done) PlayCheck();
                }
                else if (el.Visibility == Visibility.Visible)
                {
                    var fadeOut = new DoubleAnimation(0, TimeSpan.FromMilliseconds(120));
                    var captured = el;
                    fadeOut.Completed += (s, e) =>
                    {
                        if (mode == kv.Key) return;
                        SetLooping(captured, false);
                        captured.Visibility = Visibility.Collapsed;
                    };
                    el.BeginAnimation(OpacityProperty, fadeOut);
                }
            }

            // Header text slides up into place.
            var lift = new TranslateTransform(0, 6);
            header.Children[1].RenderTransform = lift;
            lift.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(6, 0, TimeSpan.FromMilliseconds(320)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } });
            header.Children[1].BeginAnimation(OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(260)));

            // Glow follows the mood.
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
                    break; // Flash() owns the glow
                default:
                    glow.BeginAnimation(DropShadowEffect.OpacityProperty, new DoubleAnimation(0.5, TimeSpan.FromMilliseconds(500)));
                    break;
            }

            // A little squash on every change keeps it feeling alive.
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
            height.Velocity += 140; // a happy bounce
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

        // ── expanded rows ────────────────────────────────────────────────

        void UpdateRows(List<Session> sessions, long now, bool show)
        {
            var visible = sessions.Take(MaxRows).ToList();
            if (visible.Count == 0)
            {
                while (rowsPanel.Children.Count > 1) rowsPanel.Children.RemoveAt(rowsPanel.Children.Count - 1);
                if (rowsPanel.Children.Count == 0) rowsPanel.Children.Add(MakeRow());
                var empty = (Grid)rowsPanel.Children[0];
                FillRow(empty, Palette.Idle, "Keine aktive Sitzung", "Starte Claude Code in einem Terminal", "");
                return;
            }
            while (rowsPanel.Children.Count < visible.Count) rowsPanel.Children.Add(MakeRow());
            while (rowsPanel.Children.Count > visible.Count) rowsPanel.Children.RemoveAt(rowsPanel.Children.Count - 1);
            for (int i = 0; i < visible.Count; i++)
            {
                var s = visible[i];
                Mode m = SessionStore.DisplayMode(s, now);
                string detail, right = "";
                switch (m)
                {
                    case Mode.Busy:
                        detail = s.Detail.Length > 0 ? s.Detail : "Denkt nach…";
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
                FillRow((Grid)rowsPanel.Children[i], Palette.For(m), s.Project, detail, right);
            }
        }

        static Grid MakeRow()
        {
            var g = new Grid { Height = RowH, Margin = new Thickness(PadX + 1, 0, PadX, 0) };
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(18) });
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            var dot = new Ellipse { Width = 7, Height = 7, VerticalAlignment = VerticalAlignment.Top, Margin = new Thickness(0, 11, 0, 0), HorizontalAlignment = HorizontalAlignment.Left };
            var texts = new StackPanel { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(2, 0, 10, 0) };
            Grid.SetColumn(texts, 1);
            texts.Children.Add(new TextBlock { FontFamily = UiFont, FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Palette.Brush(Palette.Text), TextTrimming = TextTrimming.CharacterEllipsis });
            texts.Children.Add(new TextBlock { FontFamily = UiFont, FontSize = 11.5, Foreground = Palette.Brush(Palette.Secondary), TextTrimming = TextTrimming.CharacterEllipsis, Margin = new Thickness(0, 1, 0, 0) });
            var right = new TextBlock { FontFamily = UiFont, FontSize = 12, Foreground = Palette.Brush(Palette.Secondary), VerticalAlignment = VerticalAlignment.Top, Margin = new Thickness(0, 6, 0, 0) };
            Typography.SetNumeralAlignment(right, FontNumeralAlignment.Tabular);
            Grid.SetColumn(right, 2);
            g.Children.Add(dot);
            g.Children.Add(texts);
            g.Children.Add(right);
            return g;
        }

        static void FillRow(Grid row, Color color, string title, string detail, string right)
        {
            var dot = (Ellipse)row.Children[0];
            var texts = (StackPanel)row.Children[1];
            var rightText = (TextBlock)row.Children[2];
            var current = dot.Fill as SolidColorBrush;
            if (current == null || current.Color != color) dot.Fill = Palette.Brush(color);
            ((TextBlock)texts.Children[0]).Text = title;
            ((TextBlock)texts.Children[1]).Text = detail;
            rightText.Text = right;
        }

        void SetExpanded(bool on)
        {
            if (on == expanded) return;
            expanded = on;
            var a = new DoubleAnimation(on ? 1 : 0, TimeSpan.FromMilliseconds(on ? 260 : 110));
            if (on) a.BeginTime = TimeSpan.FromMilliseconds(110);
            rowsPanel.BeginAnimation(OpacityProperty, a);
            if (!on) focusSession = null;
        }

        // ── sizing & physics ─────────────────────────────────────────────

        void UpdateTargets(int sessionCount)
        {
            double w, h;
            if (mode == Mode.None && !expanded)
            {
                w = 46;
                h = 26;
            }
            else
            {
                header.UpdateLayout();
                // indicator + labels + accessory, with breathing room
                double labelsW = header.Children[1].DesiredSize.Width;
                double accW = accessory.Children.Cast<UIElement>().Any(c => c.Visibility == Visibility.Visible) ? accessory.DesiredSize.Width : 0;
                w = PadX + 18 + labelsW + accW + PadX + 4;
                w = Math.Max(w, 112);
                h = HeaderH;
                if (expanded)
                {
                    int rows = Math.Max(1, Math.Min(MaxRows, sessionCount));
                    w = Math.Max(w, 380);
                    h = HeaderH + rows * RowH + 8;
                }
            }
            w = Math.Round(w);
            if (Math.Abs(width.Target - w) > 0.5 || Math.Abs(height.Target - h) > 0.5)
            {
                width.Target = w;
                height.Target = h;
                StartRendering();
            }
        }

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
            double w = Math.Max(20, width.Value);
            double h = Math.Max(0, height.Value);
            double left = (WindowW - w) / 2 + shake.Value;

            islandPath.Data = NotchGeometry(w, h);
            Canvas.SetLeft(islandPath, left - Shoulder);
            Canvas.SetTop(islandPath, 0);

            contentHost.Width = w;
            contentHost.Height = h;
            Canvas.SetLeft(contentHost, left);
            Canvas.SetTop(contentHost, 0);

            header.Width = w - PadX * 2;
            Canvas.SetLeft(header, PadX);
            Canvas.SetTop(header, Math.Min(0, h - HeaderH) * 0.5);
            rowsPanel.Width = w;
            Canvas.SetTop(rowsPanel, HeaderH - 2);
        }

        /// <summary>
        /// A notch that hangs from the screen edge: concave shoulders where it
        /// meets the top, rounded corners at the bottom.
        /// </summary>
        static Geometry NotchGeometry(double w, double h)
        {
            double r = Math.Min(h / 2, 22);
            double s = Math.Max(0, Math.Min(Shoulder, h - r));
            var g = new StreamGeometry();
            using (var c = g.Open())
            {
                c.BeginFigure(new Point(Shoulder - s, 0), true, true);
                c.QuadraticBezierTo(new Point(Shoulder, 0), new Point(Shoulder, s), true, true);
                c.LineTo(new Point(Shoulder, h - r), true, true);
                c.ArcTo(new Point(Shoulder + r, h), new Size(r, r), 0, false, SweepDirection.Counterclockwise, true, true);
                c.LineTo(new Point(Shoulder + w - r, h), true, true);
                c.ArcTo(new Point(Shoulder + w, h - r), new Size(r, r), 0, false, SweepDirection.Counterclockwise, true, true);
                c.LineTo(new Point(Shoulder + w, s), true, true);
                c.QuadraticBezierTo(new Point(Shoulder + w, 0), new Point(Shoulder + w + s, 0), true, true);
            }
            g.Freeze();
            return g;
        }

        // ── hover ────────────────────────────────────────────────────────

        void CheckHover()
        {
            POINT p;
            if (!GetCursorPos(out p) || PresentationSource.FromVisual(contentHost) == null) return;
            Point local = contentHost.PointFromScreen(new Point(p.X, p.Y));
            bool inside = local.X >= -6 && local.X <= contentHost.Width + 6 && local.Y >= -2 && local.Y <= contentHost.Height + 6;
            long now = Clock.NowMs();
            if (inside && hoverSince == 0) hoverSince = now;
            else if (!inside && hoverSince != 0) hoverSince = 0;
            else return;
            Poll();
        }

        // ── tray ─────────────────────────────────────────────────────────

        void SetupTray()
        {
            tray = new WinForms.NotifyIcon { Text = "Claude Island", Icon = MakeTrayIcon(), Visible = true };
            var menu = new WinForms.ContextMenuStrip();
            menu.Items.Add("Animation vorführen", null, (s, e) => Dispatcher.BeginInvoke(new Action(StartDemo)));
            var sound = new WinForms.ToolStripMenuItem("Ton bei Fertig / Freigabe") { Checked = settings.Sound, CheckOnClick = true };
            sound.CheckedChanged += (s, e) => { settings.Sound = sound.Checked; settings.Save(); };
            menu.Items.Add(sound);
            menu.Items.Add("Sitzungsordner öffnen", null, (s, e) =>
            {
                Directory.CreateDirectory(AppPaths.Sessions);
                System.Diagnostics.Process.Start("explorer.exe", "\"" + AppPaths.Sessions + "\"");
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
                    g.SmoothingMode = Drawing.Drawing2D.SmoothingMode.AntiAlias;
                    g.Clear(Drawing.Color.Transparent);
                    using (var pill = new Drawing.Drawing2D.GraphicsPath())
                    {
                        pill.AddArc(2, 9, 14, 14, 90, 180);
                        pill.AddArc(16, 9, 14, 14, 270, 180);
                        pill.CloseFigure();
                        using (var b = new Drawing.SolidBrush(Drawing.Color.FromArgb(20, 20, 24))) g.FillPath(b, pill);
                        using (var pen = new Drawing.Pen(Drawing.Color.FromArgb(90, 90, 98), 1.2f)) g.DrawPath(pen, pill);
                    }
                    using (var b = new Drawing.SolidBrush(Drawing.Color.FromArgb(255, 140, 90))) g.FillEllipse(b, 6, 12, 8, 8);
                }
                return Drawing.Icon.FromHandle(bmp.GetHicon());
            }
        }
    }

    sealed class Settings
    {
        public bool Sound;

        public static Settings Load()
        {
            var s = new Settings();
            try
            {
                if (File.Exists(AppPaths.Settings))
                    foreach (var line in File.ReadAllLines(AppPaths.Settings))
                        if (line.Trim() == "sound=1") s.Sound = true;
            }
            catch { }
            return s;
        }

        public void Save()
        {
            try
            {
                Directory.CreateDirectory(AppPaths.Root);
                File.WriteAllText(AppPaths.Settings, "sound=" + (Sound ? "1" : "0") + Environment.NewLine);
            }
            catch { }
        }
    }
}
