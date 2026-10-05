// Claude Island - a Dynamic-Island-style status overlay for Claude Code on Windows.
//
// One executable, three roles:
//   ClaudeIsland.exe            -> the always-on-top island (single instance)
//   ClaudeIsland.exe hook       -> invoked by Claude Code hooks; reads the hook
//                                  JSON from stdin and records the session state
//   ClaudeIsland.exe statusline -> Claude Code's status line command; records
//                                  usage limits and context, then prints a line
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
        public static readonly string Usage = System.IO.Path.Combine(Root, "usage.json");
        /// <summary>A status line command that was configured before the island took over.</summary>
        public static readonly string ChainedStatusLine = System.IO.Path.Combine(Root, "statusline-previous.txt");

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
            if (mode == "statusline")
            {
                try { return StatusLine.Run(); }
                catch (Exception ex) { AppPaths.LogError("statusline", ex); return 0; }
            }
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

        /// <summary>Read-modify-write a session file under the shared lock.</summary>
        public static void UpdateSession(string sessionId, Func<Dictionary<string, object>, bool> mutate)
        {
            string sid = SafeId(sessionId);
            if (sid.Length == 0) return;
            Directory.CreateDirectory(AppPaths.Sessions);
            string path = System.IO.Path.Combine(AppPaths.Sessions, sid + ".json");
            using (var mutex = new Mutex(false, "Local\\ClaudeIsland.Sessions"))
            {
                bool owned = false;
                try
                {
                    try { owned = mutex.WaitOne(4000); }
                    catch (AbandonedMutexException) { owned = true; }
                    Dictionary<string, object> s = null;
                    if (File.Exists(path))
                    {
                        try { s = Json.Parse(File.ReadAllText(path, Encoding.UTF8)) as Dictionary<string, object>; }
                        catch { s = null; }
                    }
                    if (s == null) s = new Dictionary<string, object>();
                    if (mutate(s)) WriteAtomic(path, Json.Serialize(s));
                }
                finally
                {
                    if (owned) mutex.ReleaseMutex();
                }
            }
        }

        public static void WriteAtomic(string path, string text)
        {
            string tmp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
            File.WriteAllText(tmp, text, new UTF8Encoding(false));
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

            WriteAtomic(path, Json.Serialize(s));
        }

        public static string SafeId(string id)
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

    // ─────────────────────────────────────────────────────────────────────
    // Usage limits (fed by the status line)
    // ─────────────────────────────────────────────────────────────────────

    sealed class Usage
    {
        public double FiveHour = -1, SevenDay = -1;      // percent used; -1 = unknown
        public long FiveHourResets, SevenDayResets;      // unix seconds
        public long Updated;

        public static Usage Load()
        {
            var u = new Usage();
            try
            {
                if (!File.Exists(AppPaths.Usage)) return u;
                string text;
                using (var fs = new FileStream(AppPaths.Usage, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
                using (var r = new StreamReader(fs, Encoding.UTF8)) text = r.ReadToEnd();
                var d = Json.Parse(text) as Dictionary<string, object>;
                if (d == null) return u;
                long nowS = Clock.NowMs() / 1000;
                u.Updated = Json.Long(d, "updated");
                // A window whose reset time has passed no longer applies.
                u.FiveHourResets = Json.Long(d, "fiveHourResets");
                if (d.ContainsKey("fiveHour") && (u.FiveHourResets == 0 || u.FiveHourResets > nowS)) u.FiveHour = Convert.ToDouble(d["fiveHour"]);
                u.SevenDayResets = Json.Long(d, "sevenDayResets");
                if (d.ContainsKey("sevenDay") && (u.SevenDayResets == 0 || u.SevenDayResets > nowS)) u.SevenDay = Convert.ToDouble(d["sevenDay"]);
            }
            catch (IOException) { }
            catch (Exception ex) { AppPaths.LogError("usage", ex); }
            return u;
        }

        public bool Known { get { return FiveHour >= 0 || SevenDay >= 0; } }

        /// <summary>"in 2 h 14 min", "um 14:30", "Mo 09:00".</summary>
        public static string ResetText(long resetsAtSeconds)
        {
            if (resetsAtSeconds <= 0) return "";
            var local = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddSeconds(resetsAtSeconds).ToLocalTime();
            var span = local - DateTime.Now;
            if (span.TotalMinutes < 1) return "gleich";
            if (span.TotalHours < 6)
                return "in " + (span.Hours > 0 ? span.Hours + " h " : "") + span.Minutes + " min";
            if (local.Date == DateTime.Today) return "um " + local.ToString("HH:mm");
            var de = new System.Globalization.CultureInfo("de-DE");
            return local.ToString("ddd HH:mm", de);
        }
    }

    /// <summary>
    /// Claude Code's status line command. Records the usage limits and the
    /// session's context fill for the island, then prints a status line -
    /// or forwards to the status line the user had configured before.
    /// </summary>
    static class StatusLine
    {
        public static int Run()
        {
            string input;
            using (var reader = new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false)))
                input = reader.ReadToEnd();
            string line = "";
            try { line = Record(input); }
            catch (Exception ex) { AppPaths.LogError("statusline record", ex); }

            string chained = RunChained(input);
            Write(chained ?? line);
            return 0;
        }

        /// <summary>Store limits and context; returns the island's own status line text.</summary>
        public static string Record(string input)
        {
            var d = Json.Parse(input) as Dictionary<string, object>;
            if (d == null) return "";
            var limits = Json.Obj(d, "rate_limits");
            var five = Json.Obj(limits, "five_hour");
            var week = Json.Obj(limits, "seven_day");
            if (five != null || week != null)
            {
                var u = new Dictionary<string, object>();
                u["updated"] = Clock.NowMs();
                if (five != null && five.ContainsKey("used_percentage"))
                {
                    u["fiveHour"] = Convert.ToDouble(five["used_percentage"]);
                    u["fiveHourResets"] = Json.Long(five, "resets_at");
                }
                if (week != null && week.ContainsKey("used_percentage"))
                {
                    u["sevenDay"] = Convert.ToDouble(week["used_percentage"]);
                    u["sevenDayResets"] = Json.Long(week, "resets_at");
                }
                Directory.CreateDirectory(AppPaths.Root);
                HookRecorder.WriteAtomic(AppPaths.Usage, Json.Serialize(u));
            }

            var ctx = Json.Obj(d, "context_window");
            object pctObj = null;
            int ctxPct = -1;
            if (ctx != null && ctx.TryGetValue("used_percentage", out pctObj) && pctObj != null)
                ctxPct = (int)Math.Round(Convert.ToDouble(pctObj));
            string model = Json.Str(Json.Obj(d, "model"), "display_name");
            string sid = Json.Str(d, "session_id");
            string cwd = Json.Str(d, "cwd");
            if (sid.Length > 0)
            {
                HookRecorder.UpdateSession(sid, s =>
                {
                    if (ctxPct >= 0) s["context"] = ctxPct;
                    if (model.Length > 0) s["model"] = model;
                    if (!s.ContainsKey("state")) s["state"] = "ready";
                    if (!s.ContainsKey("session")) s["session"] = sid;
                    if (cwd.Length > 0 && !s.ContainsKey("cwd")) s["cwd"] = cwd;
                    if (!s.ContainsKey("updated")) s["updated"] = Clock.NowMs();
                    return true;
                });
            }

            var parts = new List<string>();
            const string orange = "\u001b[38;2;217;119;87m", dim = "\u001b[2m", reset = "\u001b[0m";
            if (five != null && five.ContainsKey("used_percentage"))
                parts.Add("5h " + Bar(Convert.ToDouble(five["used_percentage"])) + " " + Math.Round(Convert.ToDouble(five["used_percentage"])) + "%" +
                          dim + " " + Usage.ResetText(Json.Long(five, "resets_at")) + reset);
            if (week != null && week.ContainsKey("used_percentage"))
                parts.Add("Woche " + Math.Round(Convert.ToDouble(week["used_percentage"])) + "%");
            if (ctxPct >= 0) parts.Add("Kontext " + ctxPct + "%");
            if (model.Length > 0) parts.Add(dim + model + reset);
            return orange + "\u258c" + reset + " " + string.Join(dim + " · " + reset, parts);
        }

        static string Bar(double pct)
        {
            int filled = (int)Math.Round(Math.Max(0, Math.Min(100, pct)) / 20);
            string color = pct >= 85 ? "\u001b[38;2;248;113;113m" : pct >= 60 ? "\u001b[38;2;251;191;36m" : "\u001b[38;2;52;211;153m";
            return color + new string('\u2588', filled) + "\u001b[2m" + new string('\u2591', 5 - filled) + "\u001b[0m";
        }

        /// <summary>Run the status line the user had before, so it keeps working.</summary>
        static string RunChained(string input)
        {
            try
            {
                if (!File.Exists(AppPaths.ChainedStatusLine)) return null;
                string command = File.ReadAllText(AppPaths.ChainedStatusLine, Encoding.UTF8).Trim();
                if (command.Length == 0) return null;
                var psi = new System.Diagnostics.ProcessStartInfo();
                string bash = FindGitBash();
                if (bash != null) { psi.FileName = bash; psi.Arguments = "-c " + Shell.Quote(command); }
                else { psi.FileName = "powershell.exe"; psi.Arguments = "-NoProfile -Command " + Shell.Quote(command); }
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardInput = true;
                psi.RedirectStandardOutput = true;
                psi.StandardOutputEncoding = Encoding.UTF8;
                using (var p = System.Diagnostics.Process.Start(psi))
                {
                    using (var w = new StreamWriter(p.StandardInput.BaseStream, new UTF8Encoding(false))) w.Write(input);
                    var read = p.StandardOutput.ReadToEndAsync();
                    if (!read.Wait(4000)) { try { p.Kill(); } catch { } return null; }
                    return read.Result.TrimEnd('\r', '\n');
                }
            }
            catch (Exception ex)
            {
                AppPaths.LogError("statusline chain", ex);
                return null;
            }
        }

        public static string FindGitBash()
        {
            string env = Environment.GetEnvironmentVariable("CLAUDE_CODE_GIT_BASH_PATH");
            if (!string.IsNullOrEmpty(env) && File.Exists(env)) return env;
            foreach (var root in new[] { Environment.GetEnvironmentVariable("ProgramFiles"), Environment.GetEnvironmentVariable("ProgramW6432"),
                                         System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs") })
            {
                if (string.IsNullOrEmpty(root)) continue;
                string candidate = System.IO.Path.Combine(root, "Git", "bin", "bash.exe");
                if (File.Exists(candidate)) return candidate;
            }
            return null;
        }

        static void Write(string text)
        {
            var bytes = new UTF8Encoding(false).GetBytes(text + "\n");
            using (var o = Console.OpenStandardOutput()) o.Write(bytes, 0, bytes.Length);
        }
    }

    /// <summary>Windows command-line quoting (CommandLineToArgvW rules).</summary>
    static class Shell
    {
        public static string Quote(string arg)
        {
            if (arg.Length > 0 && arg.IndexOfAny(new[] { ' ', '\t', '\n', '"' }) < 0) return arg;
            var sb = new StringBuilder("\"");
            int backslashes = 0;
            foreach (char c in arg)
            {
                if (c == '\\') { backslashes++; continue; }
                if (c == '"') { sb.Append('\\', backslashes * 2 + 1); sb.Append('"'); }
                else { sb.Append('\\', backslashes); sb.Append(c); }
                backslashes = 0;
            }
            sb.Append('\\', backslashes * 2);
            sb.Append('"');
            return sb.ToString();
        }

        public static string Join(IEnumerable<string> args)
        {
            return string.Join(" ", args.Select(Quote));
        }
    }

    enum Mode { None, Ready, Busy, Waiting, Done, Error }

    sealed class Session
    {
        public string Id;
        public string Project;
        public string Cwd = "";
        public string Model = "";
        public int Context = -1; // context window used, percent; -1 = unknown
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
                    s.Cwd = cwd;
                    s.Model = Json.Str(d, "model");
                    s.Context = d.ContainsKey("context") ? (int)Json.Long(d, "context") : -1;
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
            var s = new Session { Id = "demo", Project = "mein-projekt", Cwd = @"C:\code\mein-projekt", Context = 34, Model = "Opus", Updated = startMs };
            var other = new Session { Id = "demo2", Project = "website", Cwd = @"C:\code\website", Context = 8, Model = "Sonnet", State = "ready", Updated = startMs };
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

        public const double Length = 23.5;

        public static Usage FakeUsage(long startMs)
        {
            var u = new Usage();
            u.FiveHour = 42;
            u.FiveHourResets = startMs / 1000 + 2 * 3600 + 14 * 60;
            u.SevenDay = 18;
            u.SevenDayResets = startMs / 1000 + 4 * 86400;
            return u;
        }
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

    sealed class Settings
    {
        public bool Sound;
        public bool HideInFullscreen;
        public readonly List<string> RecentProjects = new List<string>();

        public static Settings Load()
        {
            var s = new Settings();
            try
            {
                if (File.Exists(AppPaths.Settings))
                    foreach (var raw in File.ReadAllLines(AppPaths.Settings, Encoding.UTF8))
                    {
                        string line = raw.Trim();
                        if (line == "sound=1") s.Sound = true;
                        else if (line == "hideFullscreen=1") s.HideInFullscreen = true;
                        else if (line.StartsWith("project=")) s.RecentProjects.Add(line.Substring(8));
                    }
            }
            catch { }
            return s;
        }

        public void RememberProject(string dir)
        {
            if (string.IsNullOrEmpty(dir)) return;
            RecentProjects.RemoveAll(p => string.Equals(p, dir, StringComparison.OrdinalIgnoreCase));
            RecentProjects.Insert(0, dir);
            while (RecentProjects.Count > 10) RecentProjects.RemoveAt(RecentProjects.Count - 1);
            Save();
        }

        public void Save()
        {
            try
            {
                Directory.CreateDirectory(AppPaths.Root);
                var lines = new List<string> { "sound=" + (Sound ? "1" : "0"), "hideFullscreen=" + (HideInFullscreen ? "1" : "0") };
                lines.AddRange(RecentProjects.Select(p => "project=" + p));
                File.WriteAllLines(AppPaths.Settings, lines, new UTF8Encoding(false));
            }
            catch { }
        }
    }
}
