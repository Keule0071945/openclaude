// Claude Island - recording from a chosen microphone.
//
// Windows' speech engine only knows "the default recording device". On many
// gaming PCs that is a virtual device (Steam Streaming Microphone, Oculus,
// VB-Cable ...) that never hears your voice. MicStream records from a device
// we pick ourselves (waveIn, 16 kHz mono) and hands the audio to the engine.

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Threading;

namespace ClaudeIsland
{
    sealed class MicStream : Stream
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        struct WAVEINCAPS
        {
            public short wMid, wPid;
            public int vDriverVersion;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string szPname;
            public int dwFormats;
            public short wChannels, wReserved1;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct WAVEFORMATEX { public short wFormatTag, nChannels; public int nSamplesPerSec, nAvgBytesPerSec; public short nBlockAlign, wBitsPerSample, cbSize; }

        [StructLayout(LayoutKind.Sequential)]
        struct WAVEHDR { public IntPtr lpData; public int dwBufferLength, dwBytesRecorded; public IntPtr dwUser; public int dwFlags, dwLoops; public IntPtr lpNext, reserved; }

        [DllImport("winmm.dll")] static extern int waveInGetNumDevs();
        [DllImport("winmm.dll", CharSet = CharSet.Unicode, EntryPoint = "waveInGetDevCapsW")] static extern int waveInGetDevCaps(IntPtr id, ref WAVEINCAPS caps, int size);
        [DllImport("winmm.dll")] static extern int waveInOpen(out IntPtr h, IntPtr id, ref WAVEFORMATEX fmt, IntPtr cb, IntPtr inst, int flags);
        [DllImport("winmm.dll")] static extern int waveInPrepareHeader(IntPtr h, IntPtr hdr, int size);
        [DllImport("winmm.dll")] static extern int waveInUnprepareHeader(IntPtr h, IntPtr hdr, int size);
        [DllImport("winmm.dll")] static extern int waveInAddBuffer(IntPtr h, IntPtr hdr, int size);
        [DllImport("winmm.dll")] static extern int waveInStart(IntPtr h);
        [DllImport("winmm.dll")] static extern int waveInReset(IntPtr h);
        [DllImport("winmm.dll")] static extern int waveInClose(IntPtr h);

        public const int Rate = 16000;
        const int WHDR_DONE = 1, Buffers = 6, BufferBytes = Rate * 2 / 10; // 100 ms each

        /// <summary>Names of all recording devices, by waveIn id.</summary>
        public static List<string> Devices()
        {
            var list = new List<string>();
            try
            {
                int n = waveInGetNumDevs();
                for (int i = 0; i < n; i++)
                {
                    var caps = new WAVEINCAPS();
                    list.Add(waveInGetDevCaps(new IntPtr(i), ref caps, Marshal.SizeOf(typeof(WAVEINCAPS))) == 0 ? caps.szPname : "Mikrofon " + (i + 1));
                }
            }
            catch { }
            return list;
        }

        static readonly Regex Virtual = new Regex("steam|oculus|virtual|vb-audio|cable|voicemeeter|stereo ?mix|stereomix|wave link|obs", RegexOptions.IgnoreCase);

        public static bool IsVirtual(string name) { return Virtual.IsMatch(name ?? ""); }

        /// <summary>
        /// The device to listen on: the one chosen in the tray (by name), otherwise the first real
        /// microphone - headsets first. -1 = let Windows use its default.
        /// </summary>
        public static int Pick(string preferred, out string name)
        {
            var devices = Devices();
            name = "";
            if (!string.IsNullOrEmpty(preferred))
            {
                int i = devices.FindIndex(d => string.Equals(d, preferred, StringComparison.OrdinalIgnoreCase));
                if (i >= 0) { name = devices[i]; return i; }
            }
            var real = devices.Select((d, i) => new { d, i }).Where(x => !IsVirtual(x.d)).ToList();
            var best = real.FirstOrDefault(x => Regex.IsMatch(x.d, "headset|usb|rode|blue|yeti|hyperx|shure|elgato|razer|steelseries|logitech", RegexOptions.IgnoreCase))
                       ?? real.FirstOrDefault();
            if (best == null) return -1;
            name = best.d;
            return best.i;
        }

        IntPtr handle;
        readonly IntPtr[] headers = new IntPtr[Buffers];
        readonly Queue<byte[]> chunks = new Queue<byte[]>();
        byte[] current;
        int currentPos;
        volatile bool running;
        Thread pump;

        public MicStream(int device)
        {
            var fmt = new WAVEFORMATEX { wFormatTag = 1, nChannels = 1, nSamplesPerSec = Rate, nAvgBytesPerSec = Rate * 2, nBlockAlign = 2, wBitsPerSample = 16, cbSize = 0 };
            int err = waveInOpen(out handle, new IntPtr(device), ref fmt, IntPtr.Zero, IntPtr.Zero, 0);
            if (err != 0) throw new IOException("Mikrofon konnte nicht geöffnet werden (waveIn " + err + ").");
            int size = Marshal.SizeOf(typeof(WAVEHDR));
            for (int i = 0; i < Buffers; i++)
            {
                var hdr = new WAVEHDR { lpData = Marshal.AllocHGlobal(BufferBytes), dwBufferLength = BufferBytes };
                headers[i] = Marshal.AllocHGlobal(size);
                Marshal.StructureToPtr(hdr, headers[i], false);
                waveInPrepareHeader(handle, headers[i], size);
                waveInAddBuffer(handle, headers[i], size);
            }
            running = true;
            waveInStart(handle);
            pump = new Thread(Pump) { IsBackground = true, Name = "mic" };
            pump.Start();
        }

        /// <summary>Collects filled buffers and hands them back to the driver.</summary>
        void Pump()
        {
            int size = Marshal.SizeOf(typeof(WAVEHDR));
            while (running)
            {
                for (int i = 0; i < Buffers && running; i++)
                {
                    var hdr = (WAVEHDR)Marshal.PtrToStructure(headers[i], typeof(WAVEHDR));
                    if ((hdr.dwFlags & WHDR_DONE) == 0) continue;
                    if (hdr.dwBytesRecorded > 0)
                    {
                        var data = new byte[hdr.dwBytesRecorded];
                        Marshal.Copy(hdr.lpData, data, 0, data.Length);
                        lock (chunks)
                        {
                            chunks.Enqueue(data);
                            while (chunks.Count > 200) chunks.Dequeue(); // never fall behind by more than ~20 s
                            Monitor.PulseAll(chunks);
                        }
                    }
                    waveInUnprepareHeader(handle, headers[i], size);
                    hdr.dwFlags = 0;
                    hdr.dwBytesRecorded = 0;
                    Marshal.StructureToPtr(hdr, headers[i], false);
                    waveInPrepareHeader(handle, headers[i], size);
                    waveInAddBuffer(handle, headers[i], size);
                }
                Thread.Sleep(10);
            }
        }

        public override int Read(byte[] buffer, int offset, int count)
        {
            lock (chunks)
            {
                while (current == null || currentPos >= current.Length)
                {
                    if (chunks.Count > 0) { current = chunks.Dequeue(); currentPos = 0; break; }
                    if (!running) return 0;
                    Monitor.Wait(chunks, 200);
                }
            }
            int n = Math.Min(count, current.Length - currentPos);
            Buffer.BlockCopy(current, currentPos, buffer, offset, n);
            currentPos += n;
            return n;
        }

        protected override void Dispose(bool disposing)
        {
            if (running)
            {
                running = false;
                lock (chunks) Monitor.PulseAll(chunks);
                try { if (pump != null) pump.Join(500); } catch { }
                try
                {
                    waveInReset(handle);
                    int size = Marshal.SizeOf(typeof(WAVEHDR));
                    foreach (var h in headers)
                    {
                        if (h == IntPtr.Zero) continue;
                        var hdr = (WAVEHDR)Marshal.PtrToStructure(h, typeof(WAVEHDR));
                        waveInUnprepareHeader(handle, h, size);
                        Marshal.FreeHGlobal(hdr.lpData);
                        Marshal.FreeHGlobal(h);
                    }
                    waveInClose(handle);
                }
                catch { }
            }
            base.Dispose(disposing);
        }

        public override bool CanRead { get { return true; } }
        public override bool CanSeek { get { return false; } }
        public override bool CanWrite { get { return false; } }
        public override long Length { get { throw new NotSupportedException(); } }
        public override long Position { get { return 0; } set { throw new NotSupportedException(); } }
        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) { throw new NotSupportedException(); }
        public override void SetLength(long value) { throw new NotSupportedException(); }
        public override void Write(byte[] buffer, int offset, int count) { throw new NotSupportedException(); }
    }
}

namespace ClaudeIsland
{
    /// <summary>
    /// "ClaudeIsland.exe check": what the diagnosis cannot see from PowerShell - which Claude Code
    /// Clawd would use, and whether the microphone Clawd picks hears "Hey Clawd". Writes check.txt.
    /// </summary>
    static class SelfCheck
    {
        public static void Run()
        {
            var lines = new List<string>();
            var settings = Settings.Load();
            var devices = MicStream.Devices();
            string name;
            int pick = MicStream.Pick(settings.Mic, out name);
            for (int i = 0; i < devices.Count; i++)
                lines.Add("Aufnahmegeraet " + i + ": " + devices[i] + (MicStream.IsVirtual(devices[i]) ? "  (virtuell)" : "") + (i == pick ? "   <- Clawd hoert hier zu" : ""));
            if (pick < 0) lines.Add("Kein echtes Mikrofon gefunden, Clawd nimmt den Windows-Standard.");

            try
            {
                var info = System.Speech.Recognition.SpeechRecognitionEngine.InstalledRecognizers().FirstOrDefault(r => r.Culture.TwoLetterISOLanguageName == "de");
                if (info == null) lines.Add("Test: keine deutsche Spracherkennung");
                else
                {
                    using (var eng = new System.Speech.Recognition.SpeechRecognitionEngine(info))
                    using (var mic = pick >= 0 ? new MicStream(pick) : null)
                    {
                        if (mic != null) eng.SetInputToAudioStream(mic, new System.Speech.AudioFormat.SpeechAudioFormatInfo(MicStream.Rate, System.Speech.AudioFormat.AudioBitsPerSample.Sixteen, System.Speech.AudioFormat.AudioChannel.Mono));
                        else eng.SetInputToDefaultAudioDevice();
                        var gb = new System.Speech.Recognition.GrammarBuilder(new System.Speech.Recognition.Choices("hey clawd", "hallo clawd", "hey klaud", "hey klod", "hey claude")) { Culture = info.Culture };
                        eng.LoadGrammar(new System.Speech.Recognition.Grammar(gb));
                        var r = eng.Recognize(TimeSpan.FromSeconds(6));
                        lines.Add(r != null
                            ? "Test: gehoert '" + r.Text + "' Sicherheit " + r.Confidence.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture) + " (ab 0.15 reagiert Clawd)"
                            : "Test: nichts erkannt");
                    }
                }
            }
            catch (Exception ex) { lines.Add("Test: Fehler " + ex.GetType().Name + ": " + ex.Message); }

            try
            {
                foreach (var c in ClaudeLocator.Candidates()) lines.Add("Claude-Kandidat: " + c);
                ClaudeLocator.Forget();
                lines.Add("Claude Code benutzt: " + (ClaudeLocator.Find() ?? "KEINS GEFUNDEN"));
            }
            catch (Exception ex) { lines.Add("Claude-Suche: Fehler " + ex.Message); }

            Directory.CreateDirectory(AppPaths.Root);
            File.WriteAllLines(Path.Combine(AppPaths.Root, "check.txt"), lines, new System.Text.UTF8Encoding(false));
        }
    }
}
