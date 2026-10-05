// Claude Island - a Dynamic-Island-style status overlay for Claude Code on Windows.
//
// One executable, three roles:
//   ClaudeIsland.exe            -> the always-on-top island (single instance)
//   ClaudeIsland.exe hook       -> invoked by Claude Code hooks; reads the hook
//                                  JSON from stdin and records the session state
//   ClaudeIsland.exe statusline -> Claude Code's status line command; records
//                                  usage limits and context, then prints a line
//   ClaudeIsland.exe permission -> synchronous PermissionRequest hook; lets you
//                                  allow or deny a tool right in the island
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
        public static readonly string Stats = System.IO.Path.Combine(Root, "stats");
        public static readonly string Requests = System.IO.Path.Combine(Root, "requests");
        public static readonly string Shots = System.IO.Path.Combine(Root, "shots");
        public static readonly string History = System.IO.Path.Combine(Root, "history.jsonl");
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

        /// <summary>A failed start must never be silent: log it and tell the user.</summary>
        static void ReportCrash(Exception ex)
        {
            AppPaths.LogError("start", ex ?? new Exception("unknown"));
            try
            {
                System.Windows.Forms.MessageBox.Show(
                    "Claude Island konnte nicht starten:\n\n" + (ex != null ? ex.Message : "unbekannter Fehler") +
                    "\n\nDetails stehen in:\n" + AppPaths.Log,
                    "Claude Island", System.Windows.Forms.MessageBoxButtons.OK, System.Windows.Forms.MessageBoxIcon.Error);
            }
            catch { }
        }

        [STAThread]
        static int Main(string[] args)
        {
            string mode = args.Length > 0 ? args[0].ToLowerInvariant() : "";
            // Claude Code pipes the hook payload into stdin; treat a piped
            // launch without arguments as a hook call too.
            if (mode == "permission")
            {
                try { return PermissionBroker.Run(); }
                catch (Exception ex) { AppPaths.LogError("permission", ex); return 0; }
            }
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
                AppDomain.CurrentDomain.UnhandledException += (s, e) => ReportCrash(e.ExceptionObject as Exception);
                try
                {
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
                catch (Exception ex)
                {
                    ReportCrash(ex);
                    return 1;
                }
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

            // Subagents only move the baby-Clawd counter; they never change the state.
            if (ev == "SubagentStart" || ev == "SubagentStop")
            {
                int agents = (int)Json.Long(s, "agents") + (ev == "SubagentStart" ? 1 : -1);
                s["agents"] = Math.Max(0, Math.Min(9, agents));
                if (!s.ContainsKey("session")) s["session"] = Json.Str(hook, "session_id");
                if (!s.ContainsKey("updated")) s["updated"] = now;
                WriteAtomic(path, Json.Serialize(s));
                return;
            }
            if (Json.Long(s, "updated") > now) return; // a newer event already landed

            string state = Json.Str(s, "state");
            string toolName = Json.Str(hook, "tool_name");
            string detail = DescribeTool(toolName, Json.Obj(hook, "tool_input"));

            switch (ev)
            {
                case "SessionStart":
                    if (state != "busy" && state != "waiting") state = "ready";
                    s["agents"] = 0;
                    break;
                case "UserPromptSubmit":
                    state = "busy";
                    Todos.ForgetIfFinished(s);
                    s.Remove("files");
                    s["turnStart"] = now;
                    s["tool"] = "";
                    s["detail"] = "";
                    s["agents"] = 0;
                    break;
                case "PreToolUse":
                case "PostToolUse":
                case "PostToolUseFailure":
                case "PermissionDenied":
                    state = "busy";
                    if (Json.Long(s, "turnStart") == 0) s["turnStart"] = now;
                    if (toolName.Length > 0) { s["tool"] = toolName; s["detail"] = detail; }
                    if (ev == "PostToolUse" || (ev == "PreToolUse" && toolName == "TodoWrite")) Todos.Apply(s, toolName, Json.Obj(hook, "tool_input"), hook.ContainsKey("tool_response") ? hook["tool_response"] : null);
                    if (ev == "PostToolUse" && (toolName == "Edit" || toolName == "Write" || toolName == "MultiEdit" || toolName == "NotebookEdit"))
                    {
                        var input = Json.Obj(hook, "tool_input");
                        string full = Json.Str(input, "file_path").Length > 0 ? Json.Str(input, "file_path") : Json.Str(input, "notebook_path");
                        string file = PathText.LastSegment(full);
                        if (file.Length > 0) Stats.RecordFile(file);
                        Signals.AddFile(s, full);
                    }
                    if ((ev == "PostToolUse" || ev == "PostToolUseFailure") && (toolName == "Bash" || toolName == "PowerShell"))
                        Signals.FromShell(s, Json.Str(Json.Obj(hook, "tool_input"), "command"), ev == "PostToolUseFailure",
                                          hook.ContainsKey("tool_response") ? hook["tool_response"] : null, now);
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
                {
                    state = "done";
                    s["doneAt"] = now;
                    long start = Json.Long(s, "turnStart");
                    long duration = start > 0 ? now - start : 0;
                    s["duration"] = duration;
                    s["turnStart"] = 0;
                    s["agents"] = 0;
                    string summary = Summarize(Json.Str(hook, "last_assistant_message"));
                    if (summary.Length > 0) s["summary"] = summary;
                    if (duration > 0) Stats.RecordTask(duration);
                    break;
                }
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
            // Remember the terminal window so a click in the island can bring it forward.
            if (Json.Long(s, "hwnd") == 0 && (ev == "SessionStart" || ev == "UserPromptSubmit"))
            {
                long hwnd = TerminalWindow.FindForThisProcess();
                if (hwnd != 0) s["hwnd"] = hwnd;
            }

            WriteAtomic(path, Json.Serialize(s));
        }

        /// <summary>The last two sentences of an answer, plain text, at most 220 characters.</summary>
        public static string Summarize(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "";
            var sb = new StringBuilder();
            bool inCode = false;
            foreach (var raw in text.Replace("\r", "").Split('\n'))
            {
                string line = raw.Trim();
                if (line.StartsWith("```")) { inCode = !inCode; continue; }
                if (inCode || line.Length == 0) continue;
                line = line.TrimStart('#', '>', '-', '*', ' ').Replace("**", "").Replace("`", "");
                sb.Append(line).Append(' ');
            }
            string plain = System.Text.RegularExpressions.Regex.Replace(sb.ToString(), "\\s+", " ").Trim();
            var sentences = System.Text.RegularExpressions.Regex.Split(plain, "(?<=[.!?])\\s+").Where(x => x.Length > 0).ToList();
            string tail = string.Join(" ", sentences.Skip(Math.Max(0, sentences.Count - 2)));
            if (tail.Length > 220) tail = tail.Substring(0, 219).TrimEnd() + "…";
            return tail;
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
            var costObj = Json.Obj(d, "cost");
            double cost = costObj != null && costObj.ContainsKey("total_cost_usd") && costObj["total_cost_usd"] != null
                ? Convert.ToDouble(costObj["total_cost_usd"]) : -1;
            string sid = Json.Str(d, "session_id");
            string cwd = Json.Str(d, "cwd");
            if (sid.Length > 0)
            {
                HookRecorder.UpdateSession(sid, s =>
                {
                    if (ctxPct >= 0) s["context"] = ctxPct;
                    if (model.Length > 0) s["model"] = model;
                    if (cost >= 0) s["cost"] = cost;
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

        public static string FindOnPath(string name)
        {
            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (var raw in path.Split(';'))
            {
                string dir = raw.Trim().Trim('"');
                if (dir.Length == 0) continue;
                try
                {
                    string candidate = System.IO.Path.Combine(dir, name);
                    if (File.Exists(candidate)) return candidate;
                }
                catch (ArgumentException) { }
            }
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Daily statistics (tasks, time worked, most edited files)
    // ─────────────────────────────────────────────────────────────────────

    sealed class DayStats
    {
        public int Tasks;
        public long BusyMs;
        public List<KeyValuePair<string, int>> Files = new List<KeyValuePair<string, int>>();
    }

    static class Stats
    {
        static string PathFor(DateTime day)
        {
            return System.IO.Path.Combine(AppPaths.Stats, day.ToString("yyyy-MM-dd") + ".json");
        }

        static void Update(Func<Dictionary<string, object>, bool> mutate)
        {
            try
            {
                Directory.CreateDirectory(AppPaths.Stats);
                string path = PathFor(DateTime.Now);
                Dictionary<string, object> d = null;
                if (File.Exists(path))
                {
                    try { d = Json.Parse(File.ReadAllText(path, Encoding.UTF8)) as Dictionary<string, object>; }
                    catch { d = null; }
                }
                if (d == null) d = new Dictionary<string, object>();
                if (mutate(d)) HookRecorder.WriteAtomic(path, Json.Serialize(d));
            }
            catch (Exception ex) { AppPaths.LogError("stats", ex); }
        }

        /// <summary>Called by the hook while it already holds the sessions lock.</summary>
        public static void RecordTask(long durationMs)
        {
            Update(d =>
            {
                d["tasks"] = Json.Long(d, "tasks") + 1;
                d["busyMs"] = Json.Long(d, "busyMs") + durationMs;
                // For the badges: night owl, early bird, marathon.
                int hour = DateTime.Now.Hour;
                if (hour < 5) d["night"] = Json.Long(d, "night") + 1;
                else if (hour < 7) d["early"] = Json.Long(d, "early") + 1;
                if (durationMs > 30 * 60 * 1000) d["long"] = Json.Long(d, "long") + 1;
                return true;
            });
        }

        public static void RecordFile(string name)
        {
            Update(d =>
            {
                var files = Json.Obj(d, "files") ?? new Dictionary<string, object>();
                files[name] = Json.Long(files, name) + 1;
                d["files"] = files;
                return true;
            });
        }

        public static DayStats Load(DateTime day)
        {
            var r = new DayStats();
            try
            {
                string path = PathFor(day);
                if (!File.Exists(path)) return r;
                string text;
                using (var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
                using (var reader = new StreamReader(fs, Encoding.UTF8)) text = reader.ReadToEnd();
                var d = Json.Parse(text) as Dictionary<string, object>;
                r.Tasks = (int)Json.Long(d, "tasks");
                r.BusyMs = Json.Long(d, "busyMs");
                var files = Json.Obj(d, "files");
                if (files != null)
                    r.Files = files.Select(kv => new KeyValuePair<string, int>(kv.Key, (int)Json.Long(files, kv.Key)))
                                   .OrderByDescending(kv => kv.Value).ToList();
            }
            catch (IOException) { }
            catch (Exception ex) { AppPaths.LogError("stats load", ex); }
            return r;
        }

        /// <summary>Monday through today.</summary>
        public static DayStats Week()
        {
            var total = new DayStats();
            var files = new Dictionary<string, int>();
            DateTime today = DateTime.Today;
            int back = ((int)today.DayOfWeek + 6) % 7;
            for (int i = 0; i <= back; i++)
            {
                var d = Load(today.AddDays(-i));
                total.Tasks += d.Tasks;
                total.BusyMs += d.BusyMs;
                foreach (var f in d.Files)
                {
                    int c;
                    files.TryGetValue(f.Key, out c);
                    files[f.Key] = c + f.Value;
                }
            }
            total.Files = files.OrderByDescending(kv => kv.Value).ToList();
            return total;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // The terminal window a session runs in
    // ─────────────────────────────────────────────────────────────────────

    static class TerminalWindow
    {
        [StructLayout(LayoutKind.Sequential)]
        struct PROCESS_BASIC_INFORMATION
        {
            public IntPtr Reserved1, PebBaseAddress, Reserved2_0, Reserved2_1, UniqueProcessId, InheritedFromUniqueProcessId;
        }

        [DllImport("ntdll.dll")]
        static extern int NtQueryInformationProcess(IntPtr process, int infoClass, ref PROCESS_BASIC_INFORMATION info, int size, out int returned);
        [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
        [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
        [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
        [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
        [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
        [DllImport("kernel32.dll")] static extern IntPtr GetConsoleWindow();

        static int ParentOf(System.Diagnostics.Process p)
        {
            var info = new PROCESS_BASIC_INFORMATION();
            int returned;
            if (NtQueryInformationProcess(p.Handle, 0, ref info, Marshal.SizeOf(info), out returned) != 0) return 0;
            return info.InheritedFromUniqueProcessId.ToInt32();
        }

        /// <summary>
        /// Walk up from the hook process (child of Claude Code) to the first
        /// ancestor that owns a visible window: Windows Terminal, conhost, VS Code ...
        /// </summary>
        public static long FindForThisProcess()
        {
            try
            {
                var p = System.Diagnostics.Process.GetCurrentProcess();
                for (int depth = 0; depth < 8 && p != null; depth++)
                {
                    int parent = ParentOf(p);
                    if (parent <= 4) break;
                    try { p = System.Diagnostics.Process.GetProcessById(parent); }
                    catch { break; }
                    IntPtr h = p.MainWindowHandle;
                    if (h != IntPtr.Zero && IsWindowVisible(h)) return h.ToInt64();
                }
            }
            catch (Exception ex) { AppPaths.LogError("terminal lookup", ex); }
            return 0;
        }

        public static bool Focus(long hwnd)
        {
            var h = new IntPtr(hwnd);
            if (hwnd == 0 || !IsWindow(h)) return false;
            if (IsIconic(h)) ShowWindow(h, 9 /* SW_RESTORE */);
            return SetForegroundWindow(h);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Approving tool use from the island (synchronous PermissionRequest hook)
    // ─────────────────────────────────────────────────────────────────────

    sealed class ApprovalRequest
    {
        public string Id, Session, Tool, Detail, Project;
        public long Created;
    }

    static class PermissionBroker
    {
        /// <summary>How long the island may hold a request before the terminal dialog takes over.</summary>
        public const int WaitSeconds = 110;

        public static bool IslandRunning()
        {
            Mutex m;
            if (!Mutex.TryOpenExisting("Local\\ClaudeIsland.Overlay", out m)) return false;
            m.Dispose();
            return true;
        }

        public static int Run()
        {
            string input;
            using (var reader = new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false)))
                input = reader.ReadToEnd();
            string answer = Ask(input, IslandRunning, WaitSeconds * 1000);
            string output = Decision(answer);
            if (output.Length > 0)
            {
                var bytes = new UTF8Encoding(false).GetBytes(output);
                using (var o = Console.OpenStandardOutput()) o.Write(bytes, 0, bytes.Length);
            }
            return 0;
        }

        /// <summary>
        /// Post the request for the island and wait for its answer: "allow", "deny",
        /// or "" to let Claude Code show its own dialog in the terminal.
        /// </summary>
        public static string Ask(string input, Func<bool> islandRunning, int timeoutMs)
        {
            if (!islandRunning() || !Settings.Load().ApprovalsInIsland) return "";
            var hook = Json.Parse(input) as Dictionary<string, object>;
            if (hook == null) return "";
            string tool = Json.Str(hook, "tool_name");
            string id = Guid.NewGuid().ToString("N");
            var req = new Dictionary<string, object>();
            req["id"] = id;
            req["session"] = Json.Str(hook, "session_id");
            req["tool"] = tool;
            req["detail"] = HookRecorder.DescribeTool(tool, Json.Obj(hook, "tool_input"));
            req["project"] = PathText.LastSegment(Json.Str(hook, "cwd"));
            req["created"] = Clock.NowMs();
            Directory.CreateDirectory(AppPaths.Requests);
            string reqPath = System.IO.Path.Combine(AppPaths.Requests, id + ".json");
            string ansPath = System.IO.Path.Combine(AppPaths.Requests, id + ".answer");
            HookRecorder.WriteAtomic(reqPath, Json.Serialize(req));
            string answer = "";
            try
            {
                var watch = System.Diagnostics.Stopwatch.StartNew();
                while (watch.ElapsedMilliseconds < timeoutMs)
                {
                    if (File.Exists(ansPath))
                    {
                        try { answer = File.ReadAllText(ansPath).Trim(); break; }
                        catch (IOException) { }
                    }
                    if (watch.ElapsedMilliseconds % 2000 < 160 && !islandRunning()) break;
                    Thread.Sleep(150);
                }
            }
            finally
            {
                try { File.Delete(reqPath); } catch { }
                try { File.Delete(ansPath); } catch { }
            }
            return answer == "allow" || answer == "deny" ? answer : "";
        }

        public static string Decision(string answer)
        {
            if (answer != "allow" && answer != "deny") return "";
            var decision = new Dictionary<string, object>();
            decision["behavior"] = answer;
            if (answer == "deny") decision["message"] = "In der Claude Island abgelehnt.";
            var specific = new Dictionary<string, object>();
            specific["hookEventName"] = "PermissionRequest";
            specific["decision"] = decision;
            var root = new Dictionary<string, object>();
            root["hookSpecificOutput"] = specific;
            return Json.Serialize(root);
        }

        /// <summary>Requests waiting for an answer, oldest first (island side).</summary>
        public static List<ApprovalRequest> Pending()
        {
            var list = new List<ApprovalRequest>();
            if (!Directory.Exists(AppPaths.Requests)) return list;
            foreach (var file in Directory.GetFiles(AppPaths.Requests, "*.json"))
            {
                try
                {
                    var d = Json.Parse(File.ReadAllText(file, Encoding.UTF8)) as Dictionary<string, object>;
                    if (d == null) continue;
                    var r = new ApprovalRequest
                    {
                        Id = Json.Str(d, "id"), Session = Json.Str(d, "session"), Tool = Json.Str(d, "tool"),
                        Detail = Json.Str(d, "detail"), Project = Json.Str(d, "project"), Created = Json.Long(d, "created")
                    };
                    // Stale leftovers (hook killed) are cleaned up here.
                    if (Clock.NowMs() - r.Created > (WaitSeconds + 30) * 1000L) { File.Delete(file); continue; }
                    if (!File.Exists(System.IO.Path.Combine(AppPaths.Requests, r.Id + ".answer"))) list.Add(r);
                }
                catch (IOException) { }
                catch (Exception ex) { AppPaths.LogError("pending", ex); }
            }
            return list.OrderBy(r => r.Created).ToList();
        }

        public static void Answer(string id, string answer)
        {
            Directory.CreateDirectory(AppPaths.Requests);
            File.WriteAllText(System.IO.Path.Combine(AppPaths.Requests, id + ".answer"), answer);
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
        public int Agents;
        public string Summary = "";
        public double Cost = -1;
        public long Hwnd;
        public int TodoDone, TodoTotal; // Claude's own task list
        public string Tests = "";       // "" | pass | fail
        public long TestsAt;
        public int TestFails;           // failed runs in a row
        public string Git = "";         // "" | commit | push
        public long GitAt;
        public List<string> Files = new List<string>(); // changed this turn, newest first
        public string TodoNow = "";
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
                    s.Agents = (int)Json.Long(d, "agents");
                    s.Summary = Json.Str(d, "summary");
                    s.Cost = d.ContainsKey("cost") && d["cost"] != null ? Convert.ToDouble(d["cost"]) : -1;
                    s.Hwnd = Json.Long(d, "hwnd");
                    Todos.Read(d, s);
                    s.Tests = Json.Str(d, "tests");
                    s.TestsAt = Json.Long(d, "testsAt");
                    s.TestFails = (int)Json.Long(d, "testFails");
                    s.Git = Json.Str(d, "git");
                    s.GitAt = Json.Long(d, "gitAt");
                    object files;
                    if (d.TryGetValue("files", out files) && files is List<object>) s.Files = ((List<object>)files).OfType<string>().ToList();
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
        // 0-2.5 ready · 2.5-4.5 reads (glasses) · 4.5-6.5 searches the web (magnifier, two sub-agents)
        // · 6.5-8.5 runs tests (keyboard) · 8.5-12 asks for approval · 12-14.5 edits (pencil)
        // · 14.5 done with a summary · 20-21.6 a PDF comes close · 21.6 chomp
        public static List<Session> At(double t, long startMs)
        {
            var s = new Session { Id = "demo", Project = "mein-projekt", Cwd = @"C:\code\mein-projekt", Context = 34, Model = "Opus", Updated = startMs, Cost = 1.85 };
            var other = new Session { Id = "demo2", Project = "website", Cwd = @"C:\code\website", Context = 8, Model = "Sonnet", State = "ready", Updated = startMs, Cost = 0.40 };
            s.Tool = "";
            s.Detail = "";
            if (t < 2.5) s.State = "ready";
            else if (t < 8.5)
            {
                s.State = "busy";
                s.TurnStart = startMs + 2500;
                if (t < 4.5) { s.Tool = "Read"; s.Detail = "Liest · REPL.tsx"; }
                else if (t < 6.5) { s.Tool = "WebSearch"; s.Detail = "Recherchiert · WPF Animation"; s.Agents = 2; s.Context = 58; }
                else { s.Tool = "Bash"; s.Detail = "Bash · npm test"; s.Context = 58; }
            }
            else if (t < 12) { s.State = "waiting"; s.Tool = "Bash"; s.Detail = "Bash · git push origin main"; s.TurnStart = startMs + 2500; s.Context = 58; }
            else if (t < 14.5) { s.State = "busy"; s.TurnStart = startMs + 2500; s.Tool = "Edit"; s.Detail = "Bearbeitet · App.tsx"; s.Context = 61; }
            else
            {
                s.State = "done"; s.DoneAt = startMs + 14500; s.Duration = 12000; s.Context = 61;
                s.Summary = "Alle 42 Tests laufen wieder. Der Fehler lag im Mock für fetch.";
            }
            // Tests fail first (grumpy Clawd), then pass; then a commit (confetti) and a push (rocket).
            if (t >= 8.5) { s.Tests = "fail"; s.TestsAt = startMs + 8500; s.TestFails = 1; }
            if (t >= 13.5) { s.Tests = "pass"; s.TestsAt = startMs + 13500; s.TestFails = 0; }
            if (t >= 16) { s.Git = "commit"; s.GitAt = startMs + 16000; }
            if (t >= 17.5) { s.Git = "push"; s.GitAt = startMs + 17500; }
            if (t >= 14.5) s.Files = new List<string> { @"C:\code\mein-projekt\src\App.tsx", @"C:\code\mein-projekt\src\api\fetch.ts", @"C:\code\mein-projekt\test\App.test.tsx" };
            // Claude's task list fills up as the demo goes on.
            if (t >= 2.5)
            {
                string[] steps = { "Liest den fehlschlagenden Test", "Sucht nach der Ursache", "Führt die Tests aus", "Repariert den Mock" };
                int done = t < 4.5 ? 0 : t < 6.5 ? 1 : t < 12 ? 2 : t < 14.5 ? 3 : 4;
                s.TodoTotal = steps.Length;
                s.TodoDone = done;
                s.TodoNow = done < steps.Length ? steps[done] : "";
            }
            return new List<Session> { s, other };
        }

        /// <summary>The approval request shown while the demo is "waiting".</summary>
        public static ApprovalRequest Request(double t, long startMs)
        {
            if (t < 8.5 || t >= 12) return null;
            return new ApprovalRequest { Id = "demo", Session = "demo", Tool = "Bash", Detail = "Bash · git push origin main", Project = "mein-projekt", Created = startMs + 8500 };
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

    /// <summary>
    /// Claude's own task list, from TodoWrite (the whole list each time) or
    /// TaskCreate / TaskUpdate (one task at a time). Stored in the session file
    /// as "todos": [{ "id", "s" (pending | in_progress | completed), "t", "a" }].
    /// </summary>
    static class Todos
    {
        public static void Apply(Dictionary<string, object> s, string tool, Dictionary<string, object> input, object response)
        {
            if (input == null) return;
            var list = Load(s);
            if (tool == "TodoWrite")
            {
                var todos = input.ContainsKey("todos") ? input["todos"] as List<object> : null;
                if (todos == null) return;
                list.Clear();
                int n = 0;
                foreach (var item in todos.OfType<Dictionary<string, object>>())
                {
                    n++;
                    list.Add(Item(Json.Str(item, "id").Length > 0 ? Json.Str(item, "id") : n.ToString(),
                                  Json.Str(item, "status"), Json.Str(item, "content"), Json.Str(item, "activeForm")));
                }
            }
            else if (tool == "TaskCreate")
            {
                string id = TaskIdFrom(response);
                if (id.Length == 0) id = (list.Count + 1).ToString();
                list.RemoveAll(x => Json.Str(x, "id") == id);
                list.Add(Item(id, "pending", Json.Str(input, "subject"), Json.Str(input, "activeForm")));
            }
            else if (tool == "TaskUpdate")
            {
                string id = Json.Str(input, "taskId");
                var item = list.FirstOrDefault(x => Json.Str(x, "id") == id);
                if (item == null) return;
                string status = Json.Str(input, "status");
                if (status == "deleted") list.Remove(item);
                else if (status.Length > 0) item["s"] = status;
                if (Json.Str(input, "subject").Length > 0) item["t"] = Json.Str(input, "subject");
                if (Json.Str(input, "activeForm").Length > 0) item["a"] = Json.Str(input, "activeForm");
            }
            else return;
            s["todos"] = list.Cast<object>().ToList();
        }

        /// <summary>A new prompt starts a fresh list once the old one is all done.</summary>
        public static void ForgetIfFinished(Dictionary<string, object> s)
        {
            var list = Load(s);
            if (list.Count > 0 && list.All(x => Json.Str(x, "s") == "completed")) s.Remove("todos");
        }

        public static void Read(Dictionary<string, object> d, Session s)
        {
            var list = Load(d);
            s.TodoTotal = list.Count;
            s.TodoDone = list.Count(x => Json.Str(x, "s") == "completed");
            var now = list.FirstOrDefault(x => Json.Str(x, "s") == "in_progress");
            s.TodoNow = now == null ? "" : (Json.Str(now, "a").Length > 0 ? Json.Str(now, "a") : Json.Str(now, "t"));
        }

        static List<Dictionary<string, object>> Load(Dictionary<string, object> s)
        {
            object v;
            var raw = s.TryGetValue("todos", out v) ? v as List<object> : null;
            return raw == null ? new List<Dictionary<string, object>>() : raw.OfType<Dictionary<string, object>>().ToList();
        }

        static Dictionary<string, object> Item(string id, string status, string text, string active)
        {
            return new Dictionary<string, object> { { "id", id }, { "s", status.Length > 0 ? status : "pending" }, { "t", text }, { "a", active } };
        }

        /// <summary>TaskCreate answers with the new id, as an object or as text like "Task #3 created".</summary>
        static string TaskIdFrom(object response)
        {
            var d = response as Dictionary<string, object>;
            if (d != null)
            {
                var task = Json.Obj(d, "task");
                if (task != null && Json.Str(task, "id").Length > 0) return Json.Str(task, "id");
                if (Json.Str(d, "id").Length > 0) return Json.Str(d, "id");
                if (Json.Str(d, "taskId").Length > 0) return Json.Str(d, "taskId");
            }
            var m = System.Text.RegularExpressions.Regex.Match(Convert.ToString(response) ?? "", "#(\\d+)");
            return m.Success ? m.Groups[1].Value : "";
        }
    }

    /// <summary>
    /// Predicts when the 5-hour limit runs out at the current pace, from the
    /// usage samples the status line delivers.
    /// </summary>
    sealed class UsageForecast
    {
        const long WindowMs = 40 * 60 * 1000;
        readonly List<KeyValuePair<long, double>> samples = new List<KeyValuePair<long, double>>();
        long resetsAt;

        public void Add(long ms, double pct, long resetsAtSeconds)
        {
            if (pct < 0) return;
            bool newWindow = resetsAtSeconds != resetsAt && resetsAt != 0 && Math.Abs(resetsAtSeconds - resetsAt) > 120;
            if (newWindow || (samples.Count > 0 && pct < samples[samples.Count - 1].Value - 1)) samples.Clear();
            resetsAt = resetsAtSeconds;
            if (samples.Count > 0 && samples[samples.Count - 1].Key >= ms) return;
            samples.Add(new KeyValuePair<long, double>(ms, pct));
            samples.RemoveAll(x => ms - x.Key > WindowMs);
        }

        /// <summary>Unix ms when 100 % is reached before the reset; 0 = it lasts; -1 = not enough data yet.</summary>
        public long FullAt(long nowMs)
        {
            if (samples.Count < 2) return -1;
            var first = samples[0];
            var last = samples[samples.Count - 1];
            long span = last.Key - first.Key;
            double rise = last.Value - first.Value;
            if (span < 5 * 60 * 1000) return -1;
            if (rise <= 0.5) return 0;
            double perMs = rise / span;
            long eta = last.Key + (long)((100 - last.Value) / perMs);
            if (eta < nowMs) eta = nowMs;
            return resetsAt > 0 && eta >= resetsAt * 1000 ? 0 : eta;
        }
    }

    /// <summary>Push messages to the phone through ntfy.sh (free app, no account).</summary>
    static class Phone
    {
        public static bool IsValidTopic(string topic)
        {
            return !string.IsNullOrEmpty(topic) && topic.Length <= 64 && topic.All(c => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_');
        }

        public static string NewTopic()
        {
            const string chars = "abcdefghijkmnpqrstuvwxyz23456789";
            var bytes = new byte[14];
            using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create()) rng.GetBytes(bytes);
            return "clawd-" + new string(bytes.Select(b => chars[b % chars.Length]).ToArray());
        }

        public static string Body(string topic, string title, string message, string tag, int priority)
        {
            return Json.Serialize(new Dictionary<string, object>
            {
                { "topic", topic }, { "title", title }, { "message", message.Length > 0 ? message : " " },
                { "tags", new List<object> { tag } }, { "priority", priority }
            });
        }

        /// <summary>Fire and forget on a pool thread; failures only go to the log.</summary>
        public static void Send(string topic, string title, string message, string tag, int priority, Action<bool> done)
        {
            if (!IsValidTopic(topic)) return;
            string body = Body(topic, title, message, tag, priority);
            ThreadPool.QueueUserWorkItem(_ =>
            {
                bool ok = false;
                try
                {
                    System.Net.ServicePointManager.SecurityProtocol |= System.Net.SecurityProtocolType.Tls12;
                    var req = (System.Net.HttpWebRequest)System.Net.WebRequest.Create("https://ntfy.sh/");
                    req.Method = "POST";
                    req.ContentType = "application/json; charset=utf-8";
                    req.Timeout = 10000;
                    var bytes = new UTF8Encoding(false).GetBytes(body);
                    using (var s = req.GetRequestStream()) s.Write(bytes, 0, bytes.Length);
                    using (var resp = (System.Net.HttpWebResponse)req.GetResponse()) ok = (int)resp.StatusCode < 300;
                }
                catch (Exception ex) { AppPaths.LogError("phone", ex); }
                if (done != null) done(ok);
            });
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

    sealed class QuickCommand
    {
        public string Label, Prompt;
        public bool Edits;
    }

    sealed class Settings
    {
        public bool Sound;
        public bool HideInFullscreen;
        public bool ApprovalsInIsland = true;
        public bool FollowMonitor = true;
        public bool Notify = true;
        public string Birthday = ""; // "MM-dd"
        public string PhoneTopic = ""; // ntfy topic; empty = off
        public bool PetOut;
        public string Skin = "classic";
        public string KnownBadges = "";  // comma separated, to announce new ones once
        public int KnownLevel;
        public string WeatherPlace = "";
        public double WeatherLat, WeatherLon;
        public bool Breaks = true;       // stretch reminder after 90 minutes
        public bool RespectQuiet = true; // no sounds or pop-ups in quiet hours
        public bool Fireworks = true;    // full-screen fireworks after big tasks
        public readonly List<string> RecentProjects = new List<string>();
        public readonly List<QuickCommand> Quick = new List<QuickCommand>();

        static readonly QuickCommand[] DefaultQuick =
        {
            new QuickCommand { Label = "Tests laufen lassen", Prompt = "Führe die Tests dieses Projekts aus und fasse das Ergebnis kurz zusammen. Repariere nichts, sag mir nur, was fehlschlägt.", Edits = true },
            new QuickCommand { Label = "Änderungen committen", Prompt = "Sieh dir die aktuellen Änderungen an und erstelle einen Commit mit einer passenden Nachricht.", Edits = true },
            new QuickCommand { Label = "Was hab ich gestern gemacht?", Prompt = "Fasse anhand der Git-Historie zusammen, was in diesem Projekt gestern geändert wurde.", Edits = false },
            new QuickCommand { Label = "Projekt erklären", Prompt = "Erkläre mir kurz, worum es in diesem Projekt geht und wie es aufgebaut ist.", Edits = false },
        };

        public static Settings Load()
        {
            var s = new Settings();
            try
            {
                if (File.Exists(AppPaths.Settings))
                    foreach (var raw in File.ReadAllLines(AppPaths.Settings, Encoding.UTF8))
                    {
                        string line = raw.Trim();
                        int eq = line.IndexOf('=');
                        if (eq <= 0) continue;
                        string key = line.Substring(0, eq), value = line.Substring(eq + 1);
                        switch (key)
                        {
                            case "sound": s.Sound = value == "1"; break;
                            case "hideFullscreen": s.HideInFullscreen = value == "1"; break;
                            case "approvals": s.ApprovalsInIsland = value != "0"; break;
                            case "followMonitor": s.FollowMonitor = value != "0"; break;
                            case "notify": s.Notify = value != "0"; break;
                            case "birthday": s.Birthday = value; break;
                            case "phone": s.PhoneTopic = Phone.IsValidTopic(value) ? value : ""; break;
                            case "pet": s.PetOut = value == "1"; break;
                            case "skin": s.Skin = value; break;
                            case "badges": s.KnownBadges = value; break;
                            case "level": int.TryParse(value, out s.KnownLevel); break;
                            case "weatherPlace": s.WeatherPlace = value; break;
                            case "weatherLat": double.TryParse(value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out s.WeatherLat); break;
                            case "weatherLon": double.TryParse(value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out s.WeatherLon); break;
                            case "breaks": s.Breaks = value != "0"; break;
                            case "quiet": s.RespectQuiet = value != "0"; break;
                            case "fireworks": s.Fireworks = value != "0"; break;
                            case "project": s.RecentProjects.Add(value); break;
                            case "quick":
                            {
                                // quick=Label|Prompt|edit
                                var parts = value.Split('|');
                                if (parts.Length >= 2)
                                    s.Quick.Add(new QuickCommand { Label = parts[0], Prompt = parts[1], Edits = parts.Length > 2 && parts[2].Trim() == "edit" });
                                break;
                            }
                        }
                    }
            }
            catch { }
            if (s.Quick.Count == 0) s.Quick.AddRange(DefaultQuick);
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
                var lines = new List<string>
                {
                    "sound=" + (Sound ? "1" : "0"),
                    "hideFullscreen=" + (HideInFullscreen ? "1" : "0"),
                    "approvals=" + (ApprovalsInIsland ? "1" : "0"),
                    "followMonitor=" + (FollowMonitor ? "1" : "0"),
                    "notify=" + (Notify ? "1" : "0"),
                    "birthday=" + Birthday,
                    "phone=" + PhoneTopic,
                    "pet=" + (PetOut ? "1" : "0"),
                    "skin=" + Skin,
                    "badges=" + KnownBadges,
                    "level=" + KnownLevel,
                    "weatherPlace=" + WeatherPlace,
                    "weatherLat=" + WeatherLat.ToString("R", System.Globalization.CultureInfo.InvariantCulture),
                    "weatherLon=" + WeatherLon.ToString("R", System.Globalization.CultureInfo.InvariantCulture),
                    "breaks=" + (Breaks ? "1" : "0"),
                    "quiet=" + (RespectQuiet ? "1" : "0"),
                    "fireworks=" + (Fireworks ? "1" : "0"),
                };
                lines.AddRange(RecentProjects.Select(p => "project=" + p));
                lines.AddRange(Quick.Select(q => "quick=" + q.Label + "|" + q.Prompt + "|" + (q.Edits ? "edit" : "ask")));
                File.WriteAllLines(AppPaths.Settings, lines, new UTF8Encoding(false));
            }
            catch { }
        }
    }
}
