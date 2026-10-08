// Clawd Diktat - everything that turns raw Whisper output into what gets typed:
// hallucination filter, user replacements, voice commands, plus WAV/silence helpers
// and the settings file. No Windows UI in here, so it can be tested on its own.

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace ClawdDiktat
{
    /// <summary>What a dictation turns into: text to insert, and keys to press afterwards.</summary>
    sealed class Dictation
    {
        public string Text = "";
        public bool Send;      // press Enter after inserting
        public bool Escape;    // press Esc instead of inserting anything
        public string Note = "";
    }

    static class Speech
    {
        // Whisper invents these on silence or noise - a well known quirk of its training data.
        static readonly Regex Hallucination = new Regex(
            @"untertitel\w*\s+(im\s+auftrag|von|der|des|durch)\b[^.!?]*[.!?]?|amara\.org[^.!?]*[.!?]?|(vielen\s+)?dank\s+f(ü|u)r'?s\s+zuschauen[^.!?]*[.!?]?|copyright\s+(wdr|swr|zdf|ard)[^.!?]*[.!?]?|thanks?\s+(you\s+)?for\s+watching[^.!?]*[.!?]?",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        static readonly Regex Annotation = new Regex(@"\[[^\]]*\]|\((musik|applaus|lachen|stille|gelächter|music|applause|laughter|silence|blank_audio)[^)]*\)|\*[^*]{1,30}\*", RegexOptions.IgnoreCase);
        static readonly Regex Timestamp = new Regex(@"^\s*\[\d[\d:.,]*\s*-->\s*[\d:.,]*\]\s*", RegexOptions.Multiline);

        static readonly Regex CancelWords = new Regex(@"^(abbrechen|abbruch|stopp?|escape|esc)$", RegexOptions.IgnoreCase);
        static readonly Regex SendTail = new Regex(@"(?<=^|[.!?,;:]|\s)\s*(und\s+)?(absenden|abschicken|enter\s+drücken)[\s.!?]*$", RegexOptions.IgnoreCase);
        static readonly Regex NewParagraph = new Regex(@"[\s,;:]*\bneuer\s+absatz\b[\s,.;:]*", RegexOptions.IgnoreCase);
        static readonly Regex NewLine = new Regex(@"[\s,;:]*\b(neue\s+zeile|zeilenumbruch)\b[\s,.;:]*", RegexOptions.IgnoreCase);
        static readonly Regex Slash = new Regex(@"^(?:slash|schrägstrich|släsch|slesh|/)\s*-?\s*([\p{L}][\p{L}-]*)(.*)$", RegexOptions.IgnoreCase | RegexOptions.Singleline);

        /// <summary>Spoken names of Claude Code slash commands -> the real command.</summary>
        static readonly Dictionary<string, string> SlashWords = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "clear", "clear" }, { "klier", "clear" }, { "klir", "clear" }, { "kliar", "clear" }, { "leeren", "clear" },
            { "compact", "compact" }, { "kompakt", "compact" }, { "kompakte", "compact" }, { "compakt", "compact" },
            { "help", "help" }, { "hilfe", "help" }, { "model", "model" }, { "modell", "model" },
            { "review", "review" }, { "rewiew", "review" }, { "init", "init" }, { "memory", "memory" }, { "speicher", "memory" },
            { "config", "config" }, { "konfig", "config" }, { "cost", "cost" }, { "kosten", "cost" },
            { "resume", "resume" }, { "fortsetzen", "resume" }, { "exit", "exit" }, { "beenden", "exit" },
            { "agents", "agents" }, { "agenten", "agents" }, { "permissions", "permissions" }, { "rechte", "permissions" },
            { "status", "status" }, { "doctor", "doctor" }, { "doktor", "doctor" }, { "login", "login" }, { "logout", "logout" },
            { "mcp", "mcp" }, { "context", "context" }, { "kontext", "context" }, { "rewind", "rewind" }, { "zurück", "rewind" },
        };

        public static string Clean(string raw)
        {
            var t = Timestamp.Replace(raw ?? "", "");
            t = Annotation.Replace(t, " ");
            t = Hallucination.Replace(t, " ");
            t = Regex.Replace(t, @"[ \t\r\n]+", " ").Trim();
            // A lone "-" or "." is what Whisper prints for pure noise.
            if (Regex.IsMatch(t, @"^[\p{P}\s]*$")) t = "";
            return t;
        }

        public static Dictation Process(string raw, List<KeyValuePair<Regex, string>> replacements, bool commands, bool autoSend)
        {
            var d = new Dictation();
            var t = Clean(raw);
            if (replacements != null)
                foreach (var r in replacements) t = r.Key.Replace(t, r.Value);

            if (commands && t.Length > 0)
            {
                var core = t.Trim().TrimEnd('.', '!', '?', ',').Trim();
                if (CancelWords.IsMatch(core)) { d.Escape = true; d.Note = "Esc gedrückt"; return d; }

                var m = SendTail.Match(t);
                if (m.Success) { d.Send = true; t = t.Substring(0, m.Index).TrimEnd(' ', ','); }

                t = NewParagraph.Replace(t, "\n\n");
                t = NewLine.Replace(t, "\n");
                t = Regex.Replace(t, @"\n([a-zäöü])", x => "\n" + x.Groups[1].Value.ToUpper(CultureInfo.GetCultureInfo("de-DE")));

                var s = Slash.Match(t.Trim());
                if (s.Success)
                {
                    string word = s.Groups[1].Value.Trim('-'), cmd;
                    if (!SlashWords.TryGetValue(word, out cmd)) cmd = word.ToLowerInvariant();
                    var rest = s.Groups[2].Value.Trim().TrimStart('.', ',', ':').Trim();
                    rest = rest.TrimEnd('.');
                    t = "/" + cmd + (rest.Length > 0 ? " " + rest : "");
                }
            }
            d.Text = t.Trim(' ');
            if (autoSend && d.Text.Length > 0) d.Send = true;
            if (d.Text.Length == 0 && !d.Send) d.Note = "Nichts verstanden";
            return d;
        }

        public const string DefaultReplacements =
            "# Clawd Diktat - Ersetzungen\r\n" +
            "# Eine Regel pro Zeile:   falsch erkannt => richtig\r\n" +
            "# Groß-/Kleinschreibung ist egal. Zeilen mit # werden ignoriert.\r\n" +
            "\r\n" +
            "Cloud Code => Claude Code\r\n" +
            "Cloud-Code => Claude Code\r\n" +
            "Klaut Code => Claude Code\r\n" +
            "Klod Code => Claude Code\r\n" +
            "Hey Cloud => Hey Claude\r\n" +
            "Git Hub => GitHub\r\n" +
            "Java Script => JavaScript\r\n" +
            "Type Script => TypeScript\r\n" +
            "Pull-Request => Pull Request\r\n";

        public static List<KeyValuePair<Regex, string>> ParseReplacements(string text)
        {
            var list = new List<KeyValuePair<Regex, string>>();
            foreach (var line in (text ?? "").Split('\n'))
            {
                var l = line.Trim();
                if (l.Length == 0 || l.StartsWith("#")) continue;
                int i = l.IndexOf("=>", StringComparison.Ordinal);
                if (i <= 0) continue;
                var from = l.Substring(0, i).Trim();
                var to = l.Substring(i + 2).Trim();
                if (from.Length == 0) continue;
                var pattern = @"(?<![\p{L}\d])" + Regex.Escape(from).Replace(@"\ ", @"\s+") + @"(?![\p{L}\d])";
                list.Add(new KeyValuePair<Regex, string>(new Regex(pattern, RegexOptions.IgnoreCase), to.Replace("$", "$$")));
            }
            return list;
        }

        // ── audio helpers (16 kHz mono 16-bit PCM) ──

        public static double Rms(byte[] pcm, int offset, int count)
        {
            int n = count / 2;
            if (n == 0) return 0;
            double sum = 0;
            for (int i = 0; i < n; i++) { double v = BitConverter.ToInt16(pcm, offset + i * 2); sum += v * v; }
            return Math.Sqrt(sum / n);
        }

        /// <summary>Cuts silence at both ends (keeps 250 ms around speech). speech = seconds that sound like speech.</summary>
        public static byte[] TrimSilence(byte[] pcm, out double speech)
        {
            const int frame = 640; // 20 ms
            int frames = pcm.Length / frame;
            speech = 0;
            if (frames == 0) return pcm;
            var rms = new double[frames];
            for (int f = 0; f < frames; f++) rms[f] = Rms(pcm, f * frame, frame);
            var sorted = rms.OrderBy(x => x).ToArray();
            double floor = sorted[frames / 5];
            double threshold = Math.Max(floor * 3, 300);
            int first = -1, last = -1, loud = 0;
            for (int f = 0; f < frames; f++)
                if (rms[f] > threshold) { if (first < 0) first = f; last = f; loud++; }
            speech = loud * 0.02;
            if (first < 0) return new byte[0];
            first = Math.Max(0, first - 12);
            last = Math.Min(frames - 1, last + 12);
            var outp = new byte[(last - first + 1) * frame];
            Buffer.BlockCopy(pcm, first * frame, outp, 0, outp.Length);
            return outp;
        }

        public static byte[] Wav(byte[] pcm)
        {
            using (var ms = new MemoryStream())
            using (var w = new BinaryWriter(ms))
            {
                w.Write(Encoding.ASCII.GetBytes("RIFF")); w.Write(36 + pcm.Length);
                w.Write(Encoding.ASCII.GetBytes("WAVEfmt ")); w.Write(16); w.Write((short)1); w.Write((short)1);
                w.Write(16000); w.Write(32000); w.Write((short)2); w.Write((short)16);
                w.Write(Encoding.ASCII.GetBytes("data")); w.Write(pcm.Length); w.Write(pcm);
                w.Flush();
                return ms.ToArray();
            }
        }

        /// <summary>A short sine "blip" as a WAV, for start/stop sounds.</summary>
        public static byte[] Tone(double[] freqs, int msEach, double volume)
        {
            int per = 16000 * msEach / 1000;
            var pcm = new byte[per * freqs.Length * 2];
            for (int k = 0; k < freqs.Length; k++)
                for (int i = 0; i < per; i++)
                {
                    double env = Math.Min(1, Math.Min(i / 160.0, (per - i) / 400.0));
                    short v = (short)(Math.Sin(2 * Math.PI * freqs[k] * i / 16000) * 32767 * volume * env);
                    int o = (k * per + i) * 2;
                    pcm[o] = (byte)(v & 0xFF); pcm[o + 1] = (byte)((v >> 8) & 0xFF);
                }
            return Wav(pcm);
        }
    }

    /// <summary>Settings in %APPDATA%\ClawdDiktat\settings.txt (key=value).</summary>
    sealed class Settings
    {
        public int Key = 0x78;            // F9
        public string Model = "";         // file name in models\, empty = best installed
        public string Language = "de";
        public string Mic = "";
        public bool TypeMode;             // type characters instead of pasting
        public bool Commands = true;
        public bool AutoSend;
        public bool Sounds = true;
        public string Vocabulary = "Claude, Claude Code, JavaScript, TypeScript, Python, GitHub, Commit, Pull Request, Branch, npm, API, Bug, Refactoring";

        public static string Dir
        {
            get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "ClawdDiktat"); }
        }
        static string FilePath { get { return Path.Combine(Dir, "settings.txt"); } }

        public static Settings Load()
        {
            var s = new Settings();
            try
            {
                if (!File.Exists(FilePath)) return s;
                foreach (var line in File.ReadAllLines(FilePath, Encoding.UTF8))
                {
                    int i = line.IndexOf('=');
                    if (i <= 0) continue;
                    string k = line.Substring(0, i).Trim(), v = line.Substring(i + 1).Trim();
                    int n;
                    switch (k)
                    {
                        case "key": if (int.TryParse(v, out n)) s.Key = n; break;
                        case "model": s.Model = v; break;
                        case "language": s.Language = v; break;
                        case "mic": s.Mic = v; break;
                        case "type": s.TypeMode = v == "1"; break;
                        case "commands": s.Commands = v != "0"; break;
                        case "autosend": s.AutoSend = v == "1"; break;
                        case "sounds": s.Sounds = v != "0"; break;
                        case "vocabulary": s.Vocabulary = v; break;
                    }
                }
            }
            catch { }
            return s;
        }

        public void Save()
        {
            try
            {
                Directory.CreateDirectory(Dir);
                File.WriteAllLines(FilePath, new[]
                {
                    "key=" + Key, "model=" + Model, "language=" + Language, "mic=" + Mic,
                    "type=" + (TypeMode ? 1 : 0), "commands=" + (Commands ? 1 : 0), "autosend=" + (AutoSend ? 1 : 0),
                    "sounds=" + (Sounds ? 1 : 0), "vocabulary=" + Vocabulary,
                }, Encoding.UTF8);
            }
            catch { }
        }
    }
}
