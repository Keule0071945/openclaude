// Clawd Diktat - recording from a chosen microphone (shared with Claude Island).
//
// Windows' speech engine only knows "the default recording device". On many
// gaming PCs that is a virtual device (Steam Streaming Microphone, Oculus,
// VB-Cable ...) that never hears your voice. MicStream records from a device
// we pick ourselves (waveIn, converted to 16 kHz mono 16-bit, which is what Whisper wants).

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Threading;

namespace ClawdDiktat
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
        const int WHDR_DONE = 1, Buffers = 6;

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

        // Source format actually opened; audio is converted to 16 kHz mono for the speech engine.
        int srcRate = Rate, srcChannels = 1;
        double resamplePos;
        short lastSample;
        public string Format { get; private set; }

        const int WAVE_MAPPED = 0x4;

        static string Explain(int err)
        {
            switch (err)
            {
                case 2: return "Gerät nicht gefunden";
                case 4: return "wird gerade von einem anderen Programm exklusiv benutzt";
                case 32: return "Audioformat nicht unterstützt";
                case 6: return "kein Treiber";
                default: return "Fehler " + err;
            }
        }

        public MicStream(int device)
        {
            // Many headsets only record at 48 kHz; try what the device likes and convert ourselves.
            var tries = new[]
            {
                new[] { Rate, 1, WAVE_MAPPED }, new[] { Rate, 1, 0 },
                new[] { 48000, 1, 0 }, new[] { 48000, 2, 0 }, new[] { 44100, 1, 0 }, new[] { 44100, 2, 0 },
                new[] { 48000, 2, WAVE_MAPPED }, new[] { 32000, 1, 0 }, new[] { 22050, 1, 0 },
            };
            int err = -1;
            foreach (var tr in tries)
            {
                var fmt = new WAVEFORMATEX { wFormatTag = 1, nChannels = (short)tr[1], nSamplesPerSec = tr[0], nAvgBytesPerSec = tr[0] * 2 * tr[1], nBlockAlign = (short)(2 * tr[1]), wBitsPerSample = 16, cbSize = 0 };
                err = waveInOpen(out handle, new IntPtr(device), ref fmt, IntPtr.Zero, IntPtr.Zero, tr[2]);
                if (err == 0) { srcRate = tr[0]; srcChannels = tr[1]; break; }
                if (err == 2 || err == 4 || err == 6) break; // no point in other formats
            }
            if (err != 0) throw new IOException("Mikrofon " + (device + 1) + ": " + Explain(err) + " (waveIn " + err + ")");
            Format = srcRate + " Hz, " + (srcChannels == 1 ? "mono" : "stereo");
            int bufferBytes = srcRate * 2 * srcChannels / 10; // 100 ms
            int size = Marshal.SizeOf(typeof(WAVEHDR));
            for (int i = 0; i < Buffers; i++)
            {
                var hdr = new WAVEHDR { lpData = Marshal.AllocHGlobal(bufferBytes), dwBufferLength = bufferBytes };
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
                        var raw = new byte[hdr.dwBytesRecorded];
                        Marshal.Copy(hdr.lpData, raw, 0, raw.Length);
                        var data = Convert16kMono(raw);
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

        /// <summary>16-bit PCM in the opened format -> 16 kHz mono (channel mix + linear resampling).</summary>
        byte[] Convert16kMono(byte[] raw)
        {
            if (srcRate == Rate && srcChannels == 1) return raw;
            int frames = raw.Length / (2 * srcChannels);
            var mono = new short[frames];
            for (int f = 0; f < frames; f++)
            {
                int sum = 0;
                for (int c = 0; c < srcChannels; c++) sum += BitConverter.ToInt16(raw, (f * srcChannels + c) * 2);
                mono[f] = (short)(sum / srcChannels);
            }
            double step = srcRate / (double)Rate;
            var output = new List<byte>(frames * 2 * Rate / srcRate + 4);
            // resamplePos runs over the previous last sample (-1) and this chunk (0..frames-1).
            while (resamplePos < frames - 1)
            {
                int i = (int)Math.Floor(resamplePos);
                double frac = resamplePos - i;
                short a = i < 0 ? lastSample : mono[i];
                short b = mono[i + 1];
                short v = (short)(a + (b - a) * frac);
                output.Add((byte)(v & 0xFF));
                output.Add((byte)((v >> 8) & 0xFF));
                resamplePos += step;
            }
            resamplePos -= frames;
            if (frames > 0) lastSample = mono[frames - 1];
            return output.ToArray();
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
