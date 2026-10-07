// Claude Island - "Hey Clawd", the voice assistant.
//
// Say "Hey Clawd" (or press Ctrl+Alt+Space) and talk to him: he tells the
// time, the weather and your usage limit, plays/pauses music and changes the
// volume, opens apps and projects, sets timers, takes screenshots, answers
// approvals - and anything else goes to Claude Code as a question, whose
// answer he speaks out loud with a moving mouth.
//
// Speech recognition and the voice are Windows' own (System.Speech) and run
// offline on the PC. Only free questions go to Claude Code, exactly as if
// they had been typed into the island.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Speech.Recognition;
using System.Speech.Synthesis;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Threading;
using WinForms = System.Windows.Forms;

namespace ClaudeIsland
{
    sealed partial class IslandWindow
    {
        SpeechRecognitionEngine ears;
        SpeechSynthesizer voice;
        Grammar gWakeCommand, gWakeAsk, gWake, gCommand, gAsk;
        string voiceState = "";       // "" | listening | thinking | speaking
        long listenUntil, voiceShownAt;
        int speakMouth;
        bool voiceAsk;
        string heard = "";
        DispatcherTimer listenTimer;
        readonly List<DispatcherTimer> timers = new List<DispatcherTimer>();

        static readonly string[] WakeWords = { "hey clawd", "hallo clawd", "hey claude", "hallo claude", "hey klod", "hey klaud", "hallo klaud", "okay clawd", "he clawd" };

        static readonly Dictionary<string, int> Numbers = new Dictionary<string, int>
        {
            { "eine", 1 }, { "einer", 1 }, { "zwei", 2 }, { "drei", 3 }, { "vier", 4 }, { "fünf", 5 }, { "sechs", 6 }, { "sieben", 7 },
            { "acht", 8 }, { "neun", 9 }, { "zehn", 10 }, { "zwölf", 12 }, { "fünfzehn", 15 }, { "zwanzig", 20 }, { "fünfundzwanzig", 25 },
            { "dreißig", 30 }, { "vierzig", 40 }, { "fünfundvierzig", 45 }, { "sechzig", 60 },
        };

        // App name -> what to start (an exe, a URI or a special value).
        static readonly Dictionary<string, string> Apps = new Dictionary<string, string>
        {
            { "rechner", "calc.exe" }, { "taschenrechner", "calc.exe" }, { "editor", "notepad.exe" }, { "explorer", "explorer.exe" },
            { "browser", "https://www.google.de" }, { "spotify", "spotify:" }, { "discord", "discord://" }, { "steam", "steam://open/main" },
            { "einstellungen", "ms-settings:" }, { "task manager", "taskmgr.exe" }, { "terminal", "wt.exe" }, { "mail", "mailto:" },
            { "vs code", "@code" }, { "visual studio code", "@code" }, { "downloads", "@downloads" }, { "claude code", "@claude" },
        };

        // ── setup ─────────────────────────────────────────────────────────

        WinForms.ToolStripMenuItem voiceItem;
        bool syncingVoiceItem;

        /// <summary>The "always listen" switch, shared by the tray menu and the right-click menu on Clawd.</summary>
        void SetVoiceAlways(bool on)
        {
            if (syncingVoiceItem) return;
            if (on == settings.Voice && (!on || ears != null)) return; // already like this (e.g. the tray tick being synced)
            if (on && !StartVoice(true)) on = false; // no German recognizer or no microphone: stay off
            if (!on) StopVoice();
            else Toast("Ich höre zu. Sag „Hey Clawd“ und dann z. B. „wie spät ist es“ oder eine Frage. Alles außer freien Fragen bleibt auf deinem PC.", 8);
            settings.Voice = on;
            settings.Save();
            if (voiceItem != null && voiceItem.Checked != on)
            {
                syncingVoiceItem = true;
                voiceItem.Checked = on;
                syncingVoiceItem = false;
            }
        }

        /// <summary>Start listening for "Hey Clawd". Returns false (with a toast) when Windows has no German recognizer.</summary>
        bool StartVoice(bool wakeWord)
        {
            if (ears != null) { gWake.Enabled = gWakeCommand.Enabled = gWakeAsk.Enabled = wakeWord; return true; }
            try
            {
                var info = SpeechRecognitionEngine.InstalledRecognizers()
                    .FirstOrDefault(r => r.Culture.TwoLetterISOLanguageName == "de");
                if (info == null)
                {
                    VoiceLog("fehler: keine deutsche Spracherkennung; vorhanden: " + string.Join(", ", SpeechRecognitionEngine.InstalledRecognizers().Select(x => x.Culture.Name)), null);
                    Toast("Für „Hey Clawd“ fehlt die deutsche Spracherkennung von Windows: Einstellungen → Zeit und Sprache → Sprache → Deutsch → Optionen → Spracherkennung installieren.", 10);
                    return false;
                }
                ears = new SpeechRecognitionEngine(info);
                ears.SetInputToDefaultAudioDevice();
                BuildGrammars(info.Culture);
                gWake.Enabled = gWakeCommand.Enabled = gWakeAsk.Enabled = wakeWord;
                gCommand.Enabled = gAsk.Enabled = false;
                ears.SpeechRecognized += (s, e) => Dispatcher.BeginInvoke(new Action(() => Guard("voice", () => OnHeard(e.Result))));
                ears.SpeechRecognitionRejected += (s, e) => { if (e.Result != null && e.Result.Text.Length > 0) VoiceLog("verworfen", e.Result); };
                VoiceLog("start: Erkenner " + info.Name + " (" + info.Culture.Name + "), immer zuhören=" + wakeWord, null);
                ears.RecognizeAsync(RecognizeMode.Multiple);

                voice = new SpeechSynthesizer();
                var german = voice.GetInstalledVoices().Where(v => v.Enabled && v.VoiceInfo.Culture.TwoLetterISOLanguageName == "de").ToList();
                if (german.Count > 0) voice.SelectVoice(german[0].VoiceInfo.Name);
                voice.Rate = 1;
                voice.SetOutputToDefaultAudioDevice();
                // Lip sync: the mouth follows the visemes of the voice.
                voice.VisemeReached += (s, e) => { speakMouth = e.Viseme == 0 ? 0 : (e.Viseme <= 7 ? 2 : 1); };
                voice.SpeakCompleted += (s, e) => Dispatcher.BeginInvoke(new Action(() =>
                {
                    speakMouth = 0;
                    if (voiceState == "speaking") SetVoiceState("");
                }));
                return true;
            }
            catch (Exception ex)
            {
                AppPaths.LogError("voice", ex);
                VoiceLog("fehler: " + ex.GetType().Name + ": " + ex.Message, null);
                try { if (ears != null) ears.Dispose(); } catch { }
                ears = null;
                Toast("Das Mikrofon konnte ich nicht öffnen. Ist eins angeschlossen und für Desktop-Apps freigegeben?", 6);
                return false;
            }
        }

        void StopVoice()
        {
            try { if (ears != null) { ears.RecognizeAsyncCancel(); ears.Dispose(); } } catch { }
            try { if (voice != null) voice.Dispose(); } catch { }
            ears = null;
            voice = null;
            SetVoiceState("");
        }

        List<string> CommandPhrases()
        {
            var list = new List<string>
            {
                "wie spät ist es", "wie viel uhr ist es", "welcher tag ist heute", "welches datum ist heute",
                "wie ist das wetter", "wie wird das wetter", "wie ist mein limit", "wie viel limit habe ich noch",
                "was macht claude", "status", "musik pause", "musik stopp", "musik weiter", "musik abspielen", "pause", "weiter",
                "nächster titel", "nächstes lied", "vorheriger titel", "letztes lied", "lauter", "leiser", "viel lauter", "viel leiser",
                "ton aus", "stumm", "ton an", "mach einen screenshot", "bildschirmfoto", "bildschirm sperren",
                "erlauben", "ablehnen", "feuerwerk", "komm raus", "geh auf den desktop", "komm zurück",
                "starte claude code", "öffne die island", "danke", "stopp", "abbrechen", "was kannst du",
            };
            list.AddRange(Apps.Keys.Select(a => "öffne " + a));
            foreach (var n in Numbers.Keys)
            {
                list.Add("timer " + n + " minuten");
                list.Add("stelle einen timer auf " + n + " minuten");
            }
            list.Add("timer eine minute");
            foreach (var name in ProjectNames())
            {
                list.Add("öffne projekt " + name);
                list.Add("öffne " + name + " in vs code");
            }
            return list.Distinct().ToList();
        }

        IEnumerable<string> ProjectNames()
        {
            return KnownProjects().Select(p => SpokenName(PathText.LastSegment(p))).Where(n => n.Length >= 3).Distinct().Take(20);
        }

        /// <summary>"mein-projekt" -> "mein projekt": speakable folder names.</summary>
        static string SpokenName(string folder)
        {
            // Only letters and single spaces: anything else can make the grammar fail to load.
            string s = Regex.Replace(folder.ToLowerInvariant(), "[^\\p{L}]+", " ");
            return Regex.Replace(s, "\\s+", " ").Trim();
        }

        void BuildGrammars(CultureInfo culture)
        {
            var wake = new Choices(WakeWords);
            var commands = new Choices(CommandPhrases().ToArray());

            var wc = new GrammarBuilder { Culture = culture };
            wc.Append(wake);
            wc.Append(commands);
            gWakeCommand = new Grammar(wc) { Name = "wake+cmd" };

            var wa = new GrammarBuilder { Culture = culture };
            wa.Append(wake);
            wa.AppendDictation();
            gWakeAsk = new Grammar(wa) { Name = "wake+ask", Weight = 0.6f };

            var w = new GrammarBuilder { Culture = culture };
            w.Append(wake);
            gWake = new Grammar(w) { Name = "wake" };

            var c = new GrammarBuilder { Culture = culture };
            c.Append(commands);
            gCommand = new Grammar(c) { Name = "cmd" };

            var a = new GrammarBuilder { Culture = culture };
            a.AppendDictation();
            gAsk = new Grammar(a) { Name = "ask", Weight = 0.6f };

            foreach (var g in new[] { gWakeCommand, gWakeAsk, gWake, gCommand, gAsk }) ears.LoadGrammar(g);
        }

        // ── listening ─────────────────────────────────────────────────────

        /// <summary>Listen for a few seconds without the wake word (Ctrl+Alt+Space, or after "Hey Clawd").</summary>
        void ListenNow()
        {
            if (ears == null && !StartVoice(settings.Voice)) return;
            if (voice != null && voiceState == "speaking") voice.SpeakAsyncCancelAll();
            gCommand.Enabled = gAsk.Enabled = true;
            listenUntil = Clock.NowMs() + 7000;
            SetVoiceState("listening");
            Sound("hifive");
            if (listenTimer == null)
            {
                listenTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(250) };
                listenTimer.Tick += (s, e) =>
                {
                    if (Clock.NowMs() < listenUntil) return;
                    listenTimer.Stop();
                    EndListening();
                };
            }
            listenTimer.Start();
        }

        void EndListening()
        {
            if (gCommand != null) gCommand.Enabled = gAsk.Enabled = false;
            if (voiceState == "listening") SetVoiceState("");
        }

        void OnHeard(RecognitionResult r)
        {
            if (r == null || r.Grammar == null) return;
            VoiceLog("gehört", r);
            string kind = r.Grammar.Name;
            bool wakeFirst = kind.StartsWith("wake");
            // The wake word must be heard clearly; free questions need a bit of confidence too.
            if (wakeFirst)
            {
                var first = r.Words.Take(2).ToList();
                if (first.Count == 0 || first.Average(w => w.Confidence) < 0.6) return;
            }
            if (r.Confidence < (kind.EndsWith("ask") ? 0.35 : 0.55)) return;

            string text = r.Text.ToLowerInvariant().Trim();
            foreach (var wake in WakeWords)
                if (text.StartsWith(wake)) { text = text.Substring(wake.Length).Trim(); break; }

            if (kind == "wake") { ListenNow(); return; }
            if (listenTimer != null) listenTimer.Stop();
            if (gCommand != null) gCommand.Enabled = gAsk.Enabled = false;
            heard = text;
            Toast("„" + text + "“", 3);

            if (kind == "wake+cmd" || kind == "cmd") RunCommand(text);
            else if (text.Length > 0) AskClaude(text);
            else SetVoiceState("");
        }

        // ── commands ──────────────────────────────────────────────────────

        void RunCommand(string t)
        {
            var de = new CultureInfo("de-DE");
            var now = DateTime.Now;
            int minutes;
            Match m;

            if (t == "wie spät ist es" || t == "wie viel uhr ist es")
                Say("Es ist " + now.Hour + " Uhr " + (now.Minute > 0 ? now.Minute.ToString() : "") + ".");
            else if (t.StartsWith("welche"))
                Say("Heute ist " + now.ToString("dddd", de) + ", der " + now.Day + ". " + now.ToString("MMMM", de) + ".");
            else if (t.StartsWith("wie ist das wetter") || t.StartsWith("wie wird das wetter")) SayWeather();
            else if (t.Contains("limit")) SayLimit();
            else if (t == "was macht claude" || t == "status") SayStatus();
            else if (t == "musik pause" || t == "musik stopp" || t == "musik weiter" || t == "musik abspielen" || t == "pause" || t == "weiter") { PressKey(0xB3, 1); Done(); }
            else if (t == "nächster titel" || t == "nächstes lied") { PressKey(0xB0, 1); Done(); }
            else if (t == "vorheriger titel" || t == "letztes lied") { PressKey(0xB1, 1); Done(); }
            else if (t == "lauter" || t == "viel lauter") { PressKey(0xAF, t == "lauter" ? 5 : 12); Done(); }
            else if (t == "leiser" || t == "viel leiser") { PressKey(0xAE, t == "leiser" ? 5 : 12); Done(); }
            else if (t == "ton aus" || t == "stumm" || t == "ton an") { PressKey(0xAD, 1); Done(); }
            else if (t == "mach einen screenshot" || t == "bildschirmfoto") { SetVoiceState(""); TakeScreenshot(); }
            else if (t == "bildschirm sperren") { SetVoiceState(""); LockWorkStation(); }
            else if (t == "erlauben" || t == "ablehnen")
            {
                if (pendingApproval == null) Say("Gerade wartet keine Freigabe.");
                else { AnswerApproval(t == "erlauben" ? "allow" : "deny"); Say(t == "erlauben" ? "Erlaubt." : "Abgelehnt."); }
            }
            else if (t == "feuerwerk") { SetVoiceState(""); ShowFireworks("Für dich!"); }
            else if (t == "komm raus" || t == "geh auf den desktop") { LetOut(false); Say("Bin unterwegs!"); }
            else if (t == "komm zurück") { Recall(); Say("Bin wieder da."); }
            else if (t == "starte claude code") { SafeRun(() => ClaudeRunner.OpenTerminal(CurrentProject(), null)); Say("Claude Code startet in " + SpokenName(PathText.LastSegment(CurrentProject())) + "."); }
            else if (t == "öffne die island") { SetVoiceState(""); FocusComposer(); }
            else if (t == "danke") Say(new[] { "Gern!", "Immer doch.", "Dafür bin ich da." }[random.Next(3)]);
            else if (t == "stopp" || t == "abbrechen") { if (voice != null) voice.SpeakAsyncCancelAll(); SetVoiceState(""); }
            else if (t == "was kannst du")
                Say("Frag mich nach Uhrzeit, Wetter oder deinem Limit. Ich steuere Musik und Lautstärke, öffne Apps und Projekte, stelle Timer und mache Bildschirmfotos. Und alles andere frage ich Claude.");
            else if ((m = Regex.Match(t, @"timer (?:auf )?(\w+) minuten?$")).Success || (m = Regex.Match(t, @"stelle einen timer auf (\w+) minuten?$")).Success)
            {
                minutes = Numbers.ContainsKey(m.Groups[1].Value) ? Numbers[m.Groups[1].Value] : 0;
                if (minutes <= 0) { Say("Wie viele Minuten?"); return; }
                StartTimer(minutes);
                Say("Timer läuft: " + minutes + (minutes == 1 ? " Minute." : " Minuten."));
            }
            else if ((m = Regex.Match(t, @"^öffne projekt (.+)$")).Success) OpenProject(m.Groups[1].Value, false);
            else if ((m = Regex.Match(t, @"^öffne (.+) in vs code$")).Success) OpenProject(m.Groups[1].Value, true);
            else if ((m = Regex.Match(t, @"^öffne (.+)$")).Success) OpenApp(m.Groups[1].Value);
            else AskClaude(t);
        }

        void Done()
        {
            happyUntil = Clock.NowMs() + 600;
            SetVoiceState("");
        }

        void OpenApp(string name)
        {
            string target;
            if (!Apps.TryGetValue(name, out target)) { AskClaude("öffne " + name); return; }
            try
            {
                if (target == "@code")
                {
                    var code = Editor.FindCode();
                    if (code == null) { Say("VS Code habe ich nicht gefunden."); return; }
                    Process.Start(code);
                }
                else if (target == "@downloads") Process.Start("explorer.exe", Shell.Quote(System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads")));
                else if (target == "@claude") ClaudeRunner.OpenTerminal(CurrentProject(), null);
                else Process.Start(new ProcessStartInfo(target) { UseShellExecute = true });
                Say("Öffne " + name + ".");
            }
            catch (Exception ex)
            {
                AppPaths.LogError("voice open", ex);
                Say(name + " konnte ich nicht öffnen. Ist es installiert?");
            }
        }

        void OpenProject(string spoken, bool inCode)
        {
            string dir = KnownProjects().FirstOrDefault(p => SpokenName(PathText.LastSegment(p)) == spoken);
            if (dir == null) { Say("Das Projekt " + spoken + " kenne ich nicht."); return; }
            project = dir;
            settings.RememberProject(dir);
            try
            {
                if (inCode)
                {
                    var code = Editor.FindCode();
                    if (code == null) { Say("VS Code habe ich nicht gefunden."); return; }
                    Process.Start(new ProcessStartInfo(code, Shell.Quote(dir)) { UseShellExecute = false });
                    Say("Öffne " + spoken + " in VS Code.");
                }
                else
                {
                    ClaudeRunner.OpenTerminal(dir, null);
                    Say("Claude Code startet in " + spoken + ".");
                }
            }
            catch (Exception ex) { AppPaths.LogError("voice project", ex); Say("Das hat nicht geklappt."); }
        }

        void StartTimer(int minutes)
        {
            var t = new DispatcherTimer { Interval = TimeSpan.FromMinutes(minutes) };
            t.Tick += (s, e) =>
            {
                t.Stop();
                timers.Remove(t);
                Sound("waiting");
                shake.Velocity += 480;
                waveUntil = Clock.NowMs() + 3000;
                StartRendering();
                Toast("Dein Timer (" + minutes + " min) ist abgelaufen!", 8);
                Say("Dein Timer ist abgelaufen!");
            };
            timers.Add(t);
            t.Start();
        }

        void SayWeather()
        {
            var w = Weather.Current;
            if (settings.WeatherPlace.Length == 0) { Say("Sag mir zuerst deinen Ort, im Tray-Menü unter Wetter-Ort festlegen."); return; }
            if (double.IsNaN(w.Temperature)) { Say("Das Wetter lade ich gerade noch. Frag mich gleich nochmal."); return; }
            string kind;
            switch (w.Kind)
            {
                case "rain": kind = "es regnet"; break;
                case "storm": kind = "es gewittert"; break;
                case "snow": kind = "es schneit"; break;
                case "sun": kind = "die Sonne scheint"; break;
                default: kind = "es ist bewölkt"; break;
            }
            string place = settings.WeatherPlace.Split(',')[0];
            Say("In " + place + " sind es " + Math.Round(w.Temperature) + " Grad, und " + kind + ".");
        }

        void SayLimit()
        {
            var u = lastUsage;
            if (!u.Known) { Say("Dein Limit kenne ich erst nach der ersten Antwort in Claude Code."); return; }
            string text;
            if (u.FiveHour >= 0)
            {
                text = "Du hast " + Math.Round(u.FiveHour) + " Prozent deines Fünf-Stunden-Limits verbraucht.";
                string reset = Usage.ResetText(u.FiveHourResets);
                if (reset.Length > 0) text += " Reset " + reset.Replace("min", "Minuten").Replace(" h ", " Stunden ") + ".";
                long full = forecast.FullAt(Clock.NowMs());
                if (full > 0) text += " Bei deinem Tempo ist es um " + LocalTime(full) + " voll.";
            }
            else text = "Du hast " + Math.Round(u.SevenDay) + " Prozent deines Wochenlimits verbraucht.";
            Say(text);
        }

        void SayStatus()
        {
            long now = Clock.NowMs();
            var busy = lastSessions.FirstOrDefault(s => SessionStore.DisplayMode(s, now) == Mode.Busy);
            var waiting = lastSessions.FirstOrDefault(s => SessionStore.DisplayMode(s, now) == Mode.Waiting);
            if (waiting != null) Say("Claude braucht dich in " + SpokenName(waiting.Project) + ". " + (waiting.Detail.Length > 0 ? "Es geht um " + waiting.Detail.Replace("·", ":") + "." : ""));
            else if (busy != null)
                Say("Claude arbeitet in " + SpokenName(busy.Project) + (busy.TodoTotal > 0 ? ", Schritt " + Math.Min(busy.TodoTotal, busy.TodoDone + 1) + " von " + busy.TodoTotal : "") + ". " + (busy.Detail.Length > 0 ? busy.Detail.Replace("·", ":") + "." : ""));
            else if (lastSessions.Count == 0) Say("Gerade ist keine Claude-Code-Sitzung offen.");
            else Say("Alles ruhig. Claude wartet auf deinen nächsten Befehl.");
        }

        // ── free questions → Claude Code ──────────────────────────────────

        void AskClaude(string question)
        {
            SetVoiceState("thinking");
            voiceAsk = true;
            input.Text = question;
            Send(false);
            voiceAsk = false;
            if (!runner.Running && queue.Count == 0) SetVoiceState("");
        }

        /// <summary>Speak an answer from Claude: plain text, at most about 450 characters.</summary>
        void SpeakAnswer(string answer)
        {
            string plain = Regex.Replace(answer ?? "", "```[\\s\\S]*?```", " (Code steht in der Island) ");
            plain = Regex.Replace(plain, "[*_`#>|]", "");
            plain = Regex.Replace(plain, "https?://\\S+", "ein Link");
            plain = Regex.Replace(plain, "\\s+", " ").Trim();
            if (plain.Length > 450)
            {
                int cut = plain.LastIndexOfAny(new[] { '.', '!', '?' }, 450);
                plain = (cut > 120 ? plain.Substring(0, cut + 1) : plain.Substring(0, 450)) + " Den Rest findest du in der Island.";
            }
            Say(plain.Length > 0 ? plain : "Fertig.");
        }

        // ── speaking ──────────────────────────────────────────────────────

        void Say(string text)
        {
            Toast(text, Math.Max(3, Math.Min(10, text.Length / 14.0)));
            if (voice == null) { SetVoiceState(""); return; }
            try
            {
                voice.SpeakAsyncCancelAll();
                SetVoiceState("speaking");
                voice.SpeakAsync(text);
            }
            catch (Exception ex) { AppPaths.LogError("speak", ex); SetVoiceState(""); }
        }

        void SetVoiceState(string state)
        {
            if (state == voiceState) return;
            voiceState = state;
            voiceShownAt = Clock.NowMs();
            if (state == "listening") SetRimColors(new[] { Color.FromRgb(110, 198, 255), Color.FromRgb(167, 139, 250), Colors.White, Color.FromRgb(110, 198, 255) }, 1.6, true);
            else if (state == "speaking") SetRimColors(new[] { Palette.Clawd, Color.FromRgb(110, 198, 255), Palette.Clawd }, 2.2, false);
            else if (state == "thinking") SetRim(Mode.Busy);
            else SetRim(mode);
            StartRendering();
            // Push-to-talk only (no "always listen"): free the microphone once the conversation is over.
            if (state == "" && !settings.Voice && ears != null)
                Dispatcher.BeginInvoke(new Action(() =>
                {
                    if (voiceState == "" && !settings.Voice && !runner.Running && queue.Count == 0) StopVoice();
                }), DispatcherPriority.Background);
        }

        void SetRimColors(Color[] stops, double lap, bool pulse)
        {
            var gs = new GradientStopCollection();
            for (int i = 0; i < stops.Length; i++) gs.Add(new GradientStop(stops[i], i / (double)(stops.Length - 1)));
            rimBrush.GradientStops = gs;
            rimSpin.BeginAnimation(System.Windows.Media.RotateTransform.AngleProperty, new DoubleAnimation(0, 360, TimeSpan.FromSeconds(lap)) { RepeatBehavior = RepeatBehavior.Forever });
            var anim = pulse
                ? new DoubleAnimation(0.45, 1, TimeSpan.FromSeconds(0.5)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, EasingFunction = new SineEase() }
                : new DoubleAnimation(0.9, TimeSpan.FromMilliseconds(300));
            rim.BeginAnimation(OpacityProperty, anim);
            rimGlow.BeginAnimation(OpacityProperty, anim);
        }

        // ── Windows helpers ───────────────────────────────────────────────

        static readonly string VoiceLogPath = System.IO.Path.Combine(AppPaths.Root, "voice.log");

        /// <summary>What Clawd heard (and how sure he was) - the diagnosis shows it, to tune the phrases.</summary>
        static void VoiceLog(string what, RecognitionResult r)
        {
            try
            {
                Directory.CreateDirectory(AppPaths.Root);
                var info = new FileInfo(VoiceLogPath);
                if (info.Exists && info.Length > 64 * 1024) info.Delete();
                string line = DateTime.Now.ToString("HH:mm:ss") + " " + what +
                    (r != null ? ": \"" + r.Text + "\" (" + r.Confidence.ToString("0.00", CultureInfo.InvariantCulture) + ", " + (r.Grammar != null ? r.Grammar.Name : "-") + ")" : "");
                File.AppendAllText(VoiceLogPath, line + Environment.NewLine);
            }
            catch { }
        }

        [DllImport("user32.dll")] static extern bool LockWorkStation();

        void PressKey(byte vk, int times)
        {
            for (int i = 0; i < times; i++)
            {
                keybd_event(vk, 0, 0, UIntPtr.Zero);
                keybd_event(vk, 0, 2, UIntPtr.Zero);
            }
        }
    }
}
