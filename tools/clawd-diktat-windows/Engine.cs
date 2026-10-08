// Clawd Diktat - the speech recognizer: whisper.cpp (whisper-cli.exe) with a local model.
// Runs completely offline; nothing you say leaves the computer.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace ClawdDiktat
{
    static class Engine
    {
        public static string Root
        {
            get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ClawdDiktat"); }
        }
        public static string EngineDir { get { return Path.Combine(Root, "engine"); } }
        public static string ModelDir { get { return Path.Combine(Root, "models"); } }

        public static string Exe()
        {
            foreach (var name in new[] { "whisper-cli.exe", "main.exe" })
            {
                var p = Path.Combine(EngineDir, name);
                if (File.Exists(p)) return p;
            }
            return null;
        }

        static readonly string[] Preference = { "large-v3-turbo", "small", "base", "tiny" };

        public static List<string> Models()
        {
            try
            {
                if (!Directory.Exists(ModelDir)) return new List<string>();
                return Directory.GetFiles(ModelDir, "ggml-*.bin").Where(f => new FileInfo(f).Length > 10000000).Select(Path.GetFileName)
                    .OrderBy(f => { int i = Array.FindIndex(Preference, p => f.Contains(p)); return i < 0 ? 99 : i; }).ToList();
            }
            catch { return new List<string>(); }
        }

        /// <summary>"ggml-small.bin" -> "small (gut)" for menus.</summary>
        public static string Describe(string file)
        {
            var n = Regex.Replace(file ?? "", @"^ggml-|\.bin$", "");
            if (n.StartsWith("large")) return n + " – beste Qualität";
            if (n.StartsWith("small")) return n + " – empfohlen";
            if (n.StartsWith("base")) return n + " – schnell";
            if (n.StartsWith("tiny")) return n + " – sehr schnell";
            return n;
        }

        public static string ModelPath(Settings s)
        {
            var all = Models();
            if (all.Count == 0) return null;
            var chosen = all.FirstOrDefault(m => string.Equals(m, s.Model, StringComparison.OrdinalIgnoreCase)) ?? all[0];
            return Path.Combine(ModelDir, chosen);
        }

        public const int DllMissing = unchecked((int)0xC0000135);

        /// <summary>Transcribes a 16 kHz mono WAV file. Returns the raw text, or null with an error message.</summary>
        public static string Transcribe(string wav, Settings s, out string error)
        {
            error = null;
            var exe = Exe();
            if (exe == null) { error = "Spracherkennung nicht installiert – Rechtsklick aufs Symbol → „Spracherkennung installieren“."; return null; }
            var model = ModelPath(s);
            if (model == null) { error = "Kein Sprachmodell gefunden – Rechtsklick aufs Symbol → „Modell herunterladen“."; return null; }
            int threads = Math.Max(2, Math.Min(8, Environment.ProcessorCount - 1));
            var lang = string.IsNullOrEmpty(s.Language) ? "de" : s.Language;
            var prompt = (s.Vocabulary ?? "").Replace("\"", "'").Trim();
            var args = new StringBuilder();
            args.Append("-m \"").Append(model).Append("\" -f \"").Append(wav).Append("\" -l ").Append(lang)
                .Append(" -nt -np -t ").Append(threads);
            if (prompt.Length > 0) args.Append(" --prompt \"").Append(prompt).Append('"');
            var psi = new ProcessStartInfo(exe, args.ToString())
            {
                UseShellExecute = false, CreateNoWindow = true,
                RedirectStandardOutput = true, RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8, StandardErrorEncoding = Encoding.UTF8,
                WorkingDirectory = EngineDir,
            };
            try
            {
                using (var p = Process.Start(psi))
                {
                    var errTask = p.StandardError.ReadToEndAsync();
                    var output = p.StandardOutput.ReadToEnd();
                    if (!p.WaitForExit(120000)) { try { p.Kill(); } catch { } error = "Die Erkennung hat zu lange gedauert. Nimm ein kleineres Modell."; return null; }
                    if (p.ExitCode == DllMissing) { error = "Es fehlt die Microsoft Visual C++ Laufzeit. Installier sie über das Tray-Menü → „Spracherkennung installieren“."; return null; }
                    if (p.ExitCode != 0 && output.Trim().Length == 0)
                    {
                        var e = errTask.Result ?? "";
                        var last = e.Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0).LastOrDefault() ?? "";
                        error = "Whisper ist mit Fehler " + p.ExitCode + " beendet worden. " + last;
                        return null;
                    }
                    return output;
                }
            }
            catch (Exception ex) { error = "Whisper ließ sich nicht starten: " + ex.Message; return null; }
        }

        /// <summary>Runs the engine with --help: 0 = fine, DllMissing = needs the VC++ runtime.</summary>
        public static int SelfTest()
        {
            var exe = Exe();
            if (exe == null) return -1;
            try
            {
                var psi = new ProcessStartInfo(exe, "--help") { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
                using (var p = Process.Start(psi))
                {
                    p.StandardOutput.ReadToEndAsync(); p.StandardError.ReadToEndAsync();
                    if (!p.WaitForExit(15000)) { try { p.Kill(); } catch { } return -2; }
                    return p.ExitCode;
                }
            }
            catch { return -3; }
        }
    }
}
