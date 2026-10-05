// Claude Island - helpers for the fun and the overview features.
//
// Chiptune sounds, a "is something playing?" audio meter, git branch and
// changes per project, the weather, the island's answer history, levels and
// badges, Windows quiet hours and opening a file in the editor.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace ClaudeIsland
{
    // ─────────────────────────────────────────────────────────────────────
    // 8-bit sounds, synthesized as square waves - no sound files needed.
    // ─────────────────────────────────────────────────────────────────────

    static class Chiptune
    {
        const int Rate = 22050;
        static readonly Dictionary<string, byte[]> cache = new Dictionary<string, byte[]>();

        // Each note: frequency in Hz (0 = rest, negative = noise), length in ms.
        static readonly Dictionary<string, int[]> Tunes = new Dictionary<string, int[]>
        {
            { "done", new[] { 523, 70, 659, 70, 784, 70, 1047, 160 } },
            { "waiting", new[] { 880, 90, 0, 60, 880, 90 } },
            { "chomp", new[] { -1, 45, 0, 70, -1, 45 } },
            { "commit", new[] { 784, 60, 1047, 110 } },
            { "push", new[] { 392, 50, 523, 50, 659, 50, 784, 50, 1047, 50, 1319, 120 } },
            { "level", new[] { 523, 80, 659, 80, 784, 80, 1047, 80, 784, 80, 1047, 240 } },
            { "fail", new[] { 330, 120, 262, 220 } },
            { "hifive", new[] { 1047, 50, 0, 30, 1319, 90 } },
        };

        public static void Play(string name)
        {
            try
            {
                byte[] wav;
                lock (cache)
                    if (!cache.TryGetValue(name, out wav))
                    {
                        int[] tune;
                        if (!Tunes.TryGetValue(name, out tune)) return;
                        wav = Render(tune);
                        cache[name] = wav;
                    }
                var player = new System.Media.SoundPlayer(new MemoryStream(wav));
                player.Play();
            }
            catch (Exception ex) { AppPaths.LogError("sound", ex); }
        }

        /// <summary>8-bit mono PCM WAV of a tune.</summary>
        public static byte[] Render(int[] tune)
        {
            var samples = new List<byte>();
            var rnd = new Random(7);
            for (int i = 0; i + 1 < tune.Length; i += 2)
            {
                int freq = tune[i], ms = tune[i + 1];
                int n = Rate * ms / 1000;
                for (int k = 0; k < n; k++)
                {
                    double env = Math.Min(1, (n - k) / (Rate * 0.012)); // short fade-out, no clicks
                    double v;
                    if (freq > 0) v = ((k * 2L * freq / Rate) % 2 == 0) ? 1 : -1;
                    else if (freq < 0) v = rnd.NextDouble() * 2 - 1;
                    else v = 0;
                    samples.Add((byte)(128 + v * env * 34));
                }
            }
            var ms2 = new MemoryStream();
            var w = new BinaryWriter(ms2);
            w.Write(Encoding.ASCII.GetBytes("RIFF"));
            w.Write(36 + samples.Count);
            w.Write(Encoding.ASCII.GetBytes("WAVEfmt "));
            w.Write(16);
            w.Write((short)1);      // PCM
            w.Write((short)1);      // mono
            w.Write(Rate);
            w.Write(Rate);          // bytes per second
            w.Write((short)1);      // block align
            w.Write((short)8);      // bits per sample
            w.Write(Encoding.ASCII.GetBytes("data"));
            w.Write(samples.Count);
            w.Write(samples.ToArray());
            w.Flush();
            return ms2.ToArray();
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Is anything playing? Peak level of the default speakers (Core Audio).
    // ─────────────────────────────────────────────────────────────────────

    static class AudioMeter
    {
        [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorCom { }

        [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IMMDeviceEnumerator
        {
            [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr devices);
            [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
        }

        [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IMMDevice
        {
            [PreserveSig] int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
        }

        [ComImport, Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IAudioMeterInformation
        {
            [PreserveSig] int GetPeakValue(out float peak);
        }

        static IAudioMeterInformation meter;
        static long retryAt;

        /// <summary>0..1, or -1 when there is no audio device.</summary>
        public static float Peak()
        {
            long now = Clock.NowMs();
            if (meter == null)
            {
                if (now < retryAt) return -1;
                retryAt = now + 30000;
                try
                {
                    var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorCom();
                    IMMDevice device;
                    if (enumerator.GetDefaultAudioEndpoint(0, 1, out device) != 0 || device == null) return -1;
                    var iid = typeof(IAudioMeterInformation).GUID;
                    object o;
                    if (device.Activate(ref iid, 23, IntPtr.Zero, out o) != 0) return -1;
                    meter = o as IAudioMeterInformation;
                }
                catch { meter = null; return -1; }
            }
            try
            {
                float p;
                if (meter.GetPeakValue(out p) == 0) return p;
            }
            catch { }
            meter = null; // device changed - find the new one later
            return -1;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Git: branch (read from .git directly) and number of changed files.
    // ─────────────────────────────────────────────────────────────────────

    sealed class GitState
    {
        public string Branch = "";
        public int Changed = -1; // -1 = unknown
    }

    static class GitInfo
    {
        static readonly Dictionary<string, GitState> cache = new Dictionary<string, GitState>(StringComparer.OrdinalIgnoreCase);
        static readonly Dictionary<string, long> checkedAt = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
        static readonly HashSet<string> running = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        static string gitExe;
        static bool gitSearched;

        /// <summary>Cached; refreshes in the background at most every 20 s per folder.</summary>
        public static GitState Get(string cwd)
        {
            if (string.IsNullOrEmpty(cwd)) return null;
            long now = Clock.NowMs();
            lock (cache)
            {
                GitState state;
                cache.TryGetValue(cwd, out state);
                long at;
                checkedAt.TryGetValue(cwd, out at);
                if (now - at > 20000 && !running.Contains(cwd))
                {
                    checkedAt[cwd] = now;
                    running.Add(cwd);
                    string dir = cwd;
                    ThreadPool.QueueUserWorkItem(_ => Refresh(dir));
                }
                return state;
            }
        }

        static void Refresh(string cwd)
        {
            var state = new GitState();
            try
            {
                string gitDir = FindGitDir(cwd);
                if (gitDir != null)
                {
                    state.Branch = ReadBranch(gitDir);
                    state.Changed = CountChanges(cwd);
                }
            }
            catch (Exception ex) { AppPaths.LogError("git", ex); }
            lock (cache)
            {
                running.Remove(cwd);
                cache[cwd] = state.Branch.Length > 0 ? state : null;
            }
        }

        public static string FindGitDir(string start)
        {
            string dir = start;
            for (int i = 0; i < 30 && !string.IsNullOrEmpty(dir); i++)
            {
                string git = System.IO.Path.Combine(dir, ".git");
                if (Directory.Exists(git)) return git;
                if (File.Exists(git))
                {
                    // Worktree or submodule: "gitdir: <path>"
                    string line = File.ReadAllText(git).Trim();
                    if (line.StartsWith("gitdir:"))
                    {
                        string p = line.Substring(7).Trim();
                        return System.IO.Path.IsPathRooted(p) ? p : System.IO.Path.GetFullPath(System.IO.Path.Combine(dir, p));
                    }
                }
                dir = System.IO.Path.GetDirectoryName(dir);
            }
            return null;
        }

        public static string ReadBranch(string gitDir)
        {
            string head = System.IO.Path.Combine(gitDir, "HEAD");
            if (!File.Exists(head)) return "";
            string text = File.ReadAllText(head).Trim();
            const string prefix = "ref: refs/heads/";
            if (text.StartsWith(prefix)) return text.Substring(prefix.Length);
            return text.Length >= 7 ? text.Substring(0, 7) : text;
        }

        static int CountChanges(string cwd)
        {
            if (!gitSearched) { gitSearched = true; gitExe = Shell.FindOnPath("git.exe"); }
            if (gitExe == null) return -1;
            var psi = new ProcessStartInfo(gitExe, "status --porcelain --untracked-files=normal")
            {
                WorkingDirectory = cwd, UseShellExecute = false, CreateNoWindow = true,
                RedirectStandardOutput = true, RedirectStandardError = true, StandardOutputEncoding = Encoding.UTF8
            };
            using (var p = Process.Start(psi))
            {
                var output = p.StandardOutput.ReadToEndAsync();
                if (!p.WaitForExit(4000)) { try { p.Kill(); } catch { } return -1; }
                if (p.ExitCode != 0) return -1;
                return output.Result.Split('\n').Count(l => l.Trim().Length > 0);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Weather from open-meteo.com (free, no key) for a place the user picks.
    // ─────────────────────────────────────────────────────────────────────

    sealed class WeatherNow
    {
        public string Kind = "";   // "" | rain | snow | storm | sun | clouds
        public double Temperature = double.NaN;
        public long Updated;
    }

    static class Weather
    {
        public static WeatherNow Current = new WeatherNow();
        static long nextFetch;

        public static string Kind(int code)
        {
            if (code >= 95) return "storm";
            if ((code >= 71 && code <= 77) || code == 85 || code == 86) return "snow";
            if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
            if (code <= 1) return "sun";
            return "clouds";
        }

        /// <summary>Refresh every 30 minutes in the background.</summary>
        public static void Tick(double lat, double lon)
        {
            long now = Clock.NowMs();
            if (now < nextFetch) return;
            nextFetch = now + 30 * 60 * 1000;
            var inv = System.Globalization.CultureInfo.InvariantCulture;
            string url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat.ToString("0.###", inv) + "&longitude=" + lon.ToString("0.###", inv) + "&current=temperature_2m,weather_code";
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    var d = Json.Parse(Http.Get(url)) as Dictionary<string, object>;
                    var cur = Json.Obj(d, "current");
                    if (cur == null) return;
                    var w = new WeatherNow
                    {
                        Kind = Kind((int)Json.Long(cur, "weather_code")),
                        Temperature = cur.ContainsKey("temperature_2m") && cur["temperature_2m"] != null ? Convert.ToDouble(cur["temperature_2m"], inv) : double.NaN,
                        Updated = Clock.NowMs()
                    };
                    Current = w;
                }
                catch (Exception ex) { AppPaths.LogError("weather", ex); nextFetch = Clock.NowMs() + 5 * 60 * 1000; }
            });
        }

        public static void Reset() { nextFetch = 0; Current = new WeatherNow(); }

        /// <summary>Look up a place by name: (name, lat, lon) or null.</summary>
        public static Tuple<string, double, double> Find(string place)
        {
            string url = "https://geocoding-api.open-meteo.com/v1/search?count=1&language=de&name=" + Uri.EscapeDataString(place.Trim());
            var d = Json.Parse(Http.Get(url)) as Dictionary<string, object>;
            object raw;
            if (d == null || !d.TryGetValue("results", out raw)) return null;
            var first = (raw as List<object> ?? new List<object>()).OfType<Dictionary<string, object>>().FirstOrDefault();
            if (first == null) return null;
            var inv = System.Globalization.CultureInfo.InvariantCulture;
            string name = Json.Str(first, "name") + (Json.Str(first, "country").Length > 0 ? ", " + Json.Str(first, "country") : "");
            return Tuple.Create(name, Convert.ToDouble(first["latitude"], inv), Convert.ToDouble(first["longitude"], inv));
        }
    }

    static class Http
    {
        public static string Get(string url)
        {
            System.Net.ServicePointManager.SecurityProtocol |= System.Net.SecurityProtocolType.Tls12;
            var req = (System.Net.HttpWebRequest)System.Net.WebRequest.Create(url);
            req.Timeout = 10000;
            req.UserAgent = "ClaudeIsland";
            using (var resp = req.GetResponse())
            using (var r = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                return r.ReadToEnd();
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // History of questions asked in the island and their answers.
    // ─────────────────────────────────────────────────────────────────────

    sealed class HistoryEntry
    {
        public long Time;
        public string Project = "", Question = "", Answer = "";
    }

    static class History
    {
        const int Keep = 300;

        public static void Add(HistoryEntry e)
        {
            try
            {
                Directory.CreateDirectory(AppPaths.Root);
                var all = Load();
                all.Add(e);
                var lines = all.Skip(Math.Max(0, all.Count - Keep)).Select(x => Json.Serialize(new Dictionary<string, object>
                {
                    { "time", x.Time }, { "project", x.Project }, { "q", x.Question }, { "a", x.Answer }
                }));
                File.WriteAllLines(AppPaths.History, lines, new UTF8Encoding(false));
            }
            catch (Exception ex) { AppPaths.LogError("history", ex); }
        }

        public static List<HistoryEntry> Load()
        {
            var list = new List<HistoryEntry>();
            try
            {
                if (!File.Exists(AppPaths.History)) return list;
                foreach (var line in File.ReadAllLines(AppPaths.History, Encoding.UTF8))
                {
                    if (line.Trim().Length == 0) continue;
                    try
                    {
                        var d = Json.Parse(line) as Dictionary<string, object>;
                        if (d == null) continue;
                        list.Add(new HistoryEntry { Time = Json.Long(d, "time"), Project = Json.Str(d, "project"), Question = Json.Str(d, "q"), Answer = Json.Str(d, "a") });
                    }
                    catch { }
                }
            }
            catch (Exception ex) { AppPaths.LogError("history load", ex); }
            return list;
        }

        public static List<HistoryEntry> Search(List<HistoryEntry> all, string query)
        {
            var words = (query ?? "").Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            return all.Where(e => words.All(w =>
                        (e.Question + " " + e.Answer + " " + e.Project).IndexOf(w, StringComparison.OrdinalIgnoreCase) >= 0))
                      .OrderByDescending(e => e.Time).ToList();
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Levels, looks and badges, all computed from the daily stats.
    // ─────────────────────────────────────────────────────────────────────

    sealed class Badge
    {
        public string Id, Name, How;
    }

    sealed class Skin
    {
        public string Id, Name;
        public int Level;          // needed level, 0 = needs a badge
        public string BadgeId;     // needed badge
        public byte R, G, B;
        public bool Rainbow, Shades;
    }

    sealed class ProgressState
    {
        public int Tasks, Edits, Level, NextAt;
        public readonly List<string> Badges = new List<string>();
    }

    static class Progress
    {
        public static readonly Badge[] AllBadges =
        {
            new Badge { Id = "first", Name = "Erste Aufgabe", How = "Die erste erledigte Aufgabe." },
            new Badge { Id = "owl", Name = "Nachteule", How = "Eine Aufgabe zwischen 0 und 5 Uhr erledigt." },
            new Badge { Id = "early", Name = "Frühaufsteher", How = "Eine Aufgabe zwischen 5 und 7 Uhr erledigt." },
            new Badge { Id = "marathon", Name = "Marathon", How = "Claude hat über 30 Minuten am Stück gearbeitet." },
            new Badge { Id = "busy", Name = "Fleißiges Bienchen", How = "20 Aufgaben an einem Tag." },
            new Badge { Id = "streak", Name = "Dranbleiber", How = "An 5 Tagen hintereinander mit Claude gearbeitet." },
            new Badge { Id = "hundred", Name = "Hundert", How = "100 erledigte Aufgaben." },
            new Badge { Id = "edits", Name = "1000 Änderungen", How = "Claude hat 1000-mal Dateien bearbeitet." },
        };

        public static readonly Skin[] Skins =
        {
            new Skin { Id = "classic", Name = "Klassisch", Level = 1, R = 215, G = 119, B = 87 },
            new Skin { Id = "gold", Name = "Gold", Level = 5, R = 232, G = 184, B = 74 },
            new Skin { Id = "hacker", Name = "Hacker (mit Sonnenbrille)", BadgeId = "owl", R = 61, G = 200, B = 130, Shades = true },
            new Skin { Id = "midnight", Name = "Mitternacht", Level = 8, R = 124, G = 112, B = 214 },
            new Skin { Id = "rainbow", Name = "Regenbogen", Level = 12, R = 215, G = 119, B = 87, Rainbow = true },
        };

        public static int LevelFor(int tasks) { return 1 + (int)Math.Floor(Math.Sqrt(tasks / 3.0)); }
        public static int TasksFor(int level) { return 3 * (level - 1) * (level - 1); }

        public static bool Unlocked(Skin s, ProgressState p)
        {
            return s.BadgeId != null ? p.Badges.Contains(s.BadgeId) : p.Level >= s.Level;
        }

        public static string UnlockText(Skin s)
        {
            if (s.BadgeId != null) return "Abzeichen „" + AllBadges.First(b => b.Id == s.BadgeId).Name + "“";
            return "Level " + s.Level;
        }

        public static ProgressState Compute(IEnumerable<Dictionary<string, object>> days)
        {
            var p = new ProgressState();
            var activeDays = new List<DateTime>();
            bool owl = false, early = false, marathon = false, busy = false;
            foreach (var d in days)
            {
                int tasks = (int)Json.Long(d, "tasks");
                p.Tasks += tasks;
                var files = Json.Obj(d, "files");
                if (files != null) p.Edits += files.Keys.Sum(k => (int)Json.Long(files, k));
                if (Json.Long(d, "night") > 0) owl = true;
                if (Json.Long(d, "early") > 0) early = true;
                if (Json.Long(d, "long") > 0) marathon = true;
                if (tasks >= 20) busy = true;
                DateTime day;
                if (tasks > 0 && DateTime.TryParseExact(Json.Str(d, "_day"), "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out day))
                    activeDays.Add(day);
            }
            activeDays.Sort();
            int run = 0, best = 0;
            for (int i = 0; i < activeDays.Count; i++)
            {
                run = i > 0 && (activeDays[i] - activeDays[i - 1]).TotalDays == 1 ? run + 1 : 1;
                best = Math.Max(best, run);
            }
            if (p.Tasks >= 1) p.Badges.Add("first");
            if (owl) p.Badges.Add("owl");
            if (early) p.Badges.Add("early");
            if (marathon) p.Badges.Add("marathon");
            if (busy) p.Badges.Add("busy");
            if (best >= 5) p.Badges.Add("streak");
            if (p.Tasks >= 100) p.Badges.Add("hundred");
            if (p.Edits >= 1000) p.Badges.Add("edits");
            p.Level = LevelFor(p.Tasks);
            p.NextAt = TasksFor(p.Level + 1);
            return p;
        }

        /// <summary>Reads every daily stats file.</summary>
        public static ProgressState Load()
        {
            var days = new List<Dictionary<string, object>>();
            try
            {
                if (Directory.Exists(AppPaths.Stats))
                    foreach (var f in Directory.GetFiles(AppPaths.Stats, "*.json"))
                    {
                        try
                        {
                            string text;
                            using (var fs = new FileStream(f, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
                            using (var r = new StreamReader(fs, Encoding.UTF8)) text = r.ReadToEnd();
                            var d = Json.Parse(text) as Dictionary<string, object>;
                            if (d == null) continue;
                            d["_day"] = System.IO.Path.GetFileNameWithoutExtension(f);
                            days.Add(d);
                        }
                        catch { }
                    }
            }
            catch (Exception ex) { AppPaths.LogError("progress", ex); }
            return Compute(days);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Windows quiet hours, presentation mode and the editor.
    // ─────────────────────────────────────────────────────────────────────

    static class Quiet
    {
        [DllImport("shell32.dll")] static extern int SHQueryUserNotificationState(out int state);

        /// <summary>Presentation mode or quiet hours (focus assist): no sounds or pop-ups now.</summary>
        public static bool Now()
        {
            try
            {
                int state;
                if (SHQueryUserNotificationState(out state) != 0) return false;
                return state == 4 || state == 6; // QUNS_PRESENTATION_MODE, QUNS_QUIET_TIME
            }
            catch { return false; }
        }
    }

    static class Editor
    {
        /// <summary>Open a file in VS Code if it is installed, otherwise with its default app.</summary>
        public static bool Open(string path)
        {
            if (!File.Exists(path)) return false;
            string code = FindCode();
            if (code != null) Process.Start(new ProcessStartInfo(code, Shell.Quote(path)) { UseShellExecute = false });
            else Process.Start(new ProcessStartInfo(path) { UseShellExecute = true });
            return true;
        }

        static string FindCode()
        {
            var candidates = new List<string>();
            string cmd = Shell.FindOnPath("code.cmd");
            if (cmd != null) candidates.Add(System.IO.Path.GetFullPath(System.IO.Path.Combine(System.IO.Path.GetDirectoryName(cmd), "..", "Code.exe")));
            candidates.Add(System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Microsoft VS Code", "Code.exe"));
            candidates.Add(System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft VS Code", "Code.exe"));
            return candidates.FirstOrDefault(File.Exists);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // What a shell command tells us: tests passed or failed, a commit, a push.
    // ─────────────────────────────────────────────────────────────────────

    static class Signals
    {
        static readonly System.Text.RegularExpressions.Regex TestCommand = new System.Text.RegularExpressions.Regex(
            @"\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\b(pytest|jest|vitest|mocha|phpunit|rspec|tox)\b|\b(go|cargo|dotnet|mix|deno|swift)\s+test\b|\b(mvn|mvnw|gradle|gradlew)\b.*\btest\b|\bmake\s+(test|check)\b|\bnpx\s+(jest|vitest|playwright\s+test)\b|\bpython\s+-m\s+(pytest|unittest)\b",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        static readonly System.Text.RegularExpressions.Regex FailedCount = new System.Text.RegularExpressions.Regex(
            @"\b[1-9]\d*\s+(failed|failing|failures?|errors?)\b|^\s*FAIL\b|\bTests failed\b|\bFAILED\b", System.Text.RegularExpressions.RegexOptions.Multiline);
        static readonly System.Text.RegularExpressions.Regex GitCommit = new System.Text.RegularExpressions.Regex(@"\bgit\s+(-C\s+\S+\s+)?commit\b");
        static readonly System.Text.RegularExpressions.Regex GitPush = new System.Text.RegularExpressions.Regex(@"\bgit\s+(-C\s+\S+\s+)?push\b");

        public static bool IsTest(string command) { return TestCommand.IsMatch(command ?? ""); }

        public static string OutputOf(object response)
        {
            var d = response as Dictionary<string, object>;
            if (d != null) return Json.Str(d, "stdout") + "\n" + Json.Str(d, "stderr") + "\n" + Json.Str(d, "output");
            return Convert.ToString(response) ?? "";
        }

        /// <summary>Record tests / git events of a finished shell command in the session.</summary>
        public static void FromShell(Dictionary<string, object> s, string command, bool failed, object response, long now)
        {
            if (string.IsNullOrEmpty(command)) return;
            if (IsTest(command))
            {
                bool red = failed || FailedCount.IsMatch(OutputOf(response));
                s["tests"] = red ? "fail" : "pass";
                s["testsAt"] = now;
                s["testFails"] = red ? Json.Long(s, "testFails") + 1 : 0;
            }
            if (failed) return;
            if (GitPush.IsMatch(command)) { s["git"] = "push"; s["gitAt"] = now; }
            else if (GitCommit.IsMatch(command)) { s["git"] = "commit"; s["gitAt"] = now; }
        }

        /// <summary>Full paths of the files Claude changed in the current turn (newest first, at most 20).</summary>
        public static void AddFile(Dictionary<string, object> s, string path)
        {
            if (string.IsNullOrEmpty(path)) return;
            object v;
            var list = (s.TryGetValue("files", out v) ? v as List<object> : null) ?? new List<object>();
            list.RemoveAll(x => string.Equals(x as string, path, StringComparison.OrdinalIgnoreCase));
            list.Insert(0, path);
            while (list.Count > 20) list.RemoveAt(list.Count - 1);
            s["files"] = list;
        }
    }
}
