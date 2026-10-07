// Claude Island - talking to Claude Code from the island.
//
// Questions and commands typed into the monster's mouth run as a headless
// `claude -p` in the chosen project folder. The prompt goes in over stdin, so
// nothing the user types ever passes through a shell. The answer streams back
// as stream-json and the session can be continued in a real terminal with
// `claude --resume <id>`.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;

namespace ClaudeIsland
{
    sealed class ClaudeRunner
    {
        /// <summary>Raised on a background thread; the island marshals to its dispatcher.</summary>
        public event Action<string> Text;
        public event Action<string> Activity;
        public event Action<bool, string> Finished;

        public string SessionId { get; private set; }
        Process process;
        readonly StringBuilder stderr = new StringBuilder();
        bool sawResult;
        bool cancelled;

        public bool Running
        {
            get
            {
                try { return process != null && !process.HasExited; }
                catch { return false; }
            }
        }

        // Read-only tools need no approval; edits only when the user chose "Ausführen".
        const string ReadOnlyTools = "Read,Glob,Grep,WebFetch,WebSearch,TodoWrite";

        public void Start(string prompt, string cwd, bool allowEdits, IEnumerable<string> extraDirs)
        {
            SessionId = null;
            sawResult = false;
            cancelled = false;
            stderr.Clear();

            var args = new List<string> { "-p", "--output-format", "stream-json", "--verbose", "--allowedTools", ReadOnlyTools };
            if (allowEdits)
            {
                // "Ausführen": edit files and run shell commands (tests, git) in the project.
                args[5] = ReadOnlyTools + ",Bash";
                args.Add("--permission-mode");
                args.Add("acceptEdits");
            }
            foreach (var dir in extraDirs.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                args.Add("--add-dir");
                args.Add(dir);
            }

            var psi = StartInfo(args);
            psi.WorkingDirectory = Directory.Exists(cwd) ? cwd : Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardInput = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            psi.StandardOutputEncoding = Encoding.UTF8;
            psi.StandardErrorEncoding = Encoding.UTF8;

            var p = new Process { StartInfo = psi, EnableRaisingEvents = true };
            p.OutputDataReceived += (s, e) => { if (e.Data != null) HandleLine(e.Data); };
            p.ErrorDataReceived += (s, e) => { if (e.Data != null) lock (stderr) stderr.AppendLine(e.Data); };
            p.Exited += (s, e) => OnExited();
            p.Start();
            process = p;
            p.BeginOutputReadLine();
            p.BeginErrorReadLine();
            using (var w = new StreamWriter(p.StandardInput.BaseStream, new UTF8Encoding(false)))
                w.Write(prompt);
        }

        public void Cancel()
        {
            cancelled = true;
            try { if (Running) process.Kill(); }
            catch { }
        }

        void OnExited()
        {
            // Let the output reader drain before deciding how the run ended.
            Thread.Sleep(150);
            if (sawResult) return;
            string err;
            lock (stderr) err = stderr.ToString().Trim();
            if (cancelled) Raise(Finished, false, "Abgebrochen.");
            else Raise(Finished, false, err.Length > 0 ? LastLines(err, 4) : "Claude Code wurde unerwartet beendet.");
        }

        void HandleLine(string line)
        {
            Dictionary<string, object> msg;
            try { msg = Json.Parse(line) as Dictionary<string, object>; }
            catch { return; }
            if (msg == null) return;
            string type = Json.Str(msg, "type");
            string sid = Json.Str(msg, "session_id");
            if (sid.Length > 0) SessionId = sid;

            if (type == "assistant")
            {
                var content = Json.Obj(msg, "message");
                object blocks;
                if (content == null || !content.TryGetValue("content", out blocks)) return;
                var list = blocks as List<object>;
                if (list == null) return;
                foreach (var b in list.OfType<Dictionary<string, object>>())
                {
                    string kind = Json.Str(b, "type");
                    if (kind == "text") Raise(Text, Json.Str(b, "text"));
                    else if (kind == "tool_use")
                        Raise(Activity, HookRecorder.DescribeTool(Json.Str(b, "name"), Json.Obj(b, "input")) + " …");
                }
            }
            else if (type == "result")
            {
                sawResult = true;
                bool error = Json.Str(msg, "is_error") == "True" || (Json.Str(msg, "subtype") != "success" && Json.Str(msg, "subtype").Length > 0);
                string result = Json.Str(msg, "result");
                Raise(Finished, !error, error ? (result.Length > 0 ? result : "Claude Code meldet einen Fehler.") : "");
            }
        }

        static string LastLines(string text, int n)
        {
            var lines = text.Split('\n').Select(l => l.TrimEnd('\r')).Where(l => l.Length > 0).ToList();
            return string.Join("\n", lines.Skip(Math.Max(0, lines.Count - n)));
        }

        static void Raise(Action<string> handler, string value)
        {
            if (handler != null) handler(value);
        }

        static void Raise(Action<bool, string> handler, bool ok, string value)
        {
            if (handler != null) handler(ok, value);
        }

        // ── locating claude ─────────────────────────────────────────────

        /// <summary>
        /// Prefer launching claude.exe (native installer) or node + cli.js (npm)
        /// directly, so arguments never pass through cmd.exe.
        /// </summary>
        static ProcessStartInfo StartInfo(IList<string> args)
        {
            string exe = FindClaudeExe();
            if (exe != null) return new ProcessStartInfo(exe, Shell.Join(args));

            string cmd = FindOnPath("claude.cmd") ?? Existing(System.IO.Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "npm", "claude.cmd"));
            if (cmd != null)
            {
                string dir = System.IO.Path.GetDirectoryName(cmd);
                string cli = Existing(System.IO.Path.Combine(dir, "node_modules", "@anthropic-ai", "claude-code", "cli.js"));
                string node = Existing(System.IO.Path.Combine(dir, "node.exe")) ?? FindOnPath("node.exe");
                if (cli != null && node != null)
                    return new ProcessStartInfo(node, Shell.Quote(cli) + " " + Shell.Join(args));
            }
            // Last resort: let cmd.exe find it. Only fixed flags and folder paths are on this line.
            return new ProcessStartInfo("cmd.exe", "/d /s /c \"claude " + Shell.Join(args) + "\"");
        }

        static string FindClaudeExe()
        {
            return ClaudeLocator.Find();
        }

        /// <summary>True when some Claude Code is installed on this PC (native, npm, Desktop app or editor extension).</summary>
        public static bool Installed()
        {
            if (ClaudeLocator.Find() != null) return true;
            string cmd = FindOnPath("claude.cmd") ?? Existing(System.IO.Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "npm", "claude.cmd"));
            return cmd != null;
        }

        /// <summary>Opens a PowerShell window that installs Claude Code with the official installer.</summary>
        public static void Install()
        {
            // After installing: reload PATH in this window (plus ~/.local/bin), so "claude" works right away.
            string script =
                "Write-Host 'Installiere Claude Code (offizieller Installer von claude.ai) ...' -ForegroundColor Cyan; " +
                "irm https://claude.ai/install.ps1 | iex; " +
                "$bin = Join-Path $env:USERPROFILE '.local\\bin'; " +
                "$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + $bin; " +
                "Write-Host ''; " +
                "if (Get-Command claude -ErrorAction SilentlyContinue) { Write-Host 'Fertig! Starte jetzt Claude Code zum Anmelden ...' -ForegroundColor Green; claude } " +
                "else { Write-Host 'Claude Code wurde nicht gefunden. Bitte schick Clawds Entwickler diesen Fensterinhalt.' -ForegroundColor Yellow }";
            Process.Start(new ProcessStartInfo("powershell.exe", "-NoExit -NoProfile -ExecutionPolicy Bypass -Command \"" + script.Replace("\"", "\\\"") + "\"")
            { UseShellExecute = true });
            ClaudeLocator.Forget();
        }

        static string FindOnPath(string name)
        {
            return Shell.FindOnPath(name);
        }

        static string Existing(string path)
        {
            return File.Exists(path) ? path : null;
        }

        /// <summary>Open a terminal running interactive Claude Code, optionally resuming a session.</summary>
        /// <remarks>Without any Claude Code on this PC the terminal shows the installer instead.</remarks>
        public static void OpenTerminal(string cwd, string resumeSessionId)
        {
            var args = new List<string>();
            if (!string.IsNullOrEmpty(resumeSessionId)) { args.Add("--resume"); args.Add(resumeSessionId); }
            string exe = FindClaudeExe();
            string command = (exe != null ? Shell.Quote(exe) : "claude") + (args.Count > 0 ? " " + Shell.Join(args) : "");
            var psi = new ProcessStartInfo("cmd.exe", "/k " + command)
            {
                WorkingDirectory = Directory.Exists(cwd) ? cwd : Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                UseShellExecute = true
            };
            Process.Start(psi);
        }

        /// <summary>The prompt sent for a question with attached files.</summary>
        public static string BuildPrompt(string text, IList<string> files)
        {
            string ask = (text ?? "").Trim();
            if (files.Count == 0) return ask;
            if (ask.Length == 0)
                ask = files.Count == 1 ? "Fasse die angehängte Datei kurz und verständlich zusammen." : "Fasse die angehängten Dateien kurz und verständlich zusammen.";
            var sb = new StringBuilder(ask);
            sb.Append("\n\nAngehängte Dateien (lies sie mit dem Read-Tool):");
            foreach (var f in files) sb.Append("\n- ").Append(f);
            return sb.ToString();
        }
    }

    /// <summary>
    /// Finds a Claude Code executable: on PATH, from the native installer (~/.local/bin), or the one
    /// bundled with the Claude Desktop app or the VS Code / Cursor extension. Candidates outside PATH
    /// are only used when "--version" says they are Claude Code. The result is cached.
    /// </summary>
    static class ClaudeLocator
    {
        static string found;
        static long searchedAt;

        public static void Forget() { found = null; searchedAt = 0; }

        public static string Find()
        {
            if (found != null && File.Exists(found)) return found;
            long now = Clock.NowMs();
            if (searchedAt != 0 && now - searchedAt < 60000) return null;
            searchedAt = now;
            found = Search();
            return found;
        }

        public static List<string> Candidates()
        {
            var list = new List<string>();
            string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string roaming = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            Action<string> add = p => { if (!string.IsNullOrEmpty(p) && File.Exists(p) && !list.Contains(p, StringComparer.OrdinalIgnoreCase)) list.Add(p); };
            add(Shell.FindOnPath("claude.exe"));
            add(System.IO.Path.Combine(home, ".local", "bin", "claude.exe"));
            // Bundled copies (Desktop app, editor extensions): newest version first.
            foreach (var root in new[]
            {
                System.IO.Path.Combine(roaming, "Claude", "claude-code"),
                System.IO.Path.Combine(local, "Claude", "claude-code"),
                System.IO.Path.Combine(local, "AnthropicClaude"),
                System.IO.Path.Combine(home, ".vscode", "extensions"),
                System.IO.Path.Combine(home, ".cursor", "extensions"),
                System.IO.Path.Combine(home, ".windsurf", "extensions"),
            })
            {
                try
                {
                    if (!Directory.Exists(root)) continue;
                    foreach (var f in Directory.EnumerateFiles(root, "claude.exe", SearchOption.AllDirectories)
                                               .Where(f => f.IndexOf("claude-code", StringComparison.OrdinalIgnoreCase) >= 0 || f.IndexOf("native-binary", StringComparison.OrdinalIgnoreCase) >= 0)
                                               .Where(f => f.IndexOf("\\app-", StringComparison.OrdinalIgnoreCase) < 0) // the Desktop app itself is also Claude.exe
                                               .OrderByDescending(f => File.GetLastWriteTimeUtc(f)))
                        add(f);
                }
                catch { }
            }
            return list;
        }

        static string Search()
        {
            foreach (var c in Candidates())
            {
                bool trusted = c.IndexOf("\\.local\\bin\\", StringComparison.OrdinalIgnoreCase) >= 0 || string.Equals(c, Shell.FindOnPath("claude.exe"), StringComparison.OrdinalIgnoreCase);
                if (trusted || IsClaudeCode(c)) return c;
            }
            return null;
        }

        static bool IsClaudeCode(string exe)
        {
            try
            {
                var psi = new ProcessStartInfo(exe, "--version") { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
                using (var p = Process.Start(psi))
                {
                    var text = p.StandardOutput.ReadToEndAsync();
                    if (!p.WaitForExit(6000)) { try { p.Kill(); } catch { } return false; }
                    return text.Result.IndexOf("Claude Code", StringComparison.OrdinalIgnoreCase) >= 0;
                }
            }
            catch { return false; }
        }
    }
}
