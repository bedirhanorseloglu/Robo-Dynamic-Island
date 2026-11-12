param([string]$PipeName = 'twocode-ghelper-bridge')

$ErrorActionPreference = 'Stop'

$logFile = Join-Path $PSScriptRoot 'bridge-runtime.log'
function Log-Bridge($msg) {
    "$(Get-Date -Format 'HH:mm:ss.fff') $msg" | Out-File $logFile -Append
}

Log-Bridge "Bridge host started. PipeName=$PipeName PID=$PID"

$mutex = New-Object System.Threading.Mutex($false, 'Local\TwoCodeGHelperBridge')
try { $ownsMutex = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $ownsMutex = $true }
if (-not $ownsMutex) {
    Log-Bridge "Mutex already held, exiting."
    exit 0
}

Add-Type -TypeDefinition @'
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int _Vtbl0(); int _Vtbl1(); int _Vtbl2(); int _Vtbl3(); int _Vtbl4(); int _Vtbl5(); int _Vtbl6(); int _Vtbl7(); int _Vtbl8(); int _Vtbl9();
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
    int GetMute(out bool pbMute);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int _Vtbl0();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject { }

public static class GHelperOsdBridge {
  delegate void WinEventDelegate(IntPtr hook, uint eventType, IntPtr hwnd, int objectId, int childId, uint threadId, uint time);

  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
  [StructLayout(LayoutKind.Sequential)] struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam; public IntPtr lParam; public uint time; public int ptX; public int ptY; }

  [DllImport("user32.dll")] static extern IntPtr SetWinEventHook(uint eventMin, uint eventMax, IntPtr module, WinEventDelegate callback, uint processId, uint threadId, uint flags);
  [DllImport("user32.dll")] static extern bool UnhookWinEvent(IntPtr hook);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int count);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hwnd, int command);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr hwnd, int index);
  [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr hwnd, int index, int value);
  [DllImport("user32.dll")] static extern bool SetLayeredWindowAttributes(IntPtr hwnd, uint colorKey, byte alpha, uint flags);
  [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);
  [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr monitor, ref MONITORINFO info);
  [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll")] static extern uint MsgWaitForMultipleObjects(uint count, IntPtr[] handles, bool waitAll, uint milliseconds, uint wakeMask);
  [DllImport("user32.dll")] static extern bool PeekMessage(out MSG msg, IntPtr hwnd, uint filterMin, uint filterMax, uint remove);
  [DllImport("user32.dll")] static extern bool TranslateMessage(ref MSG msg);
  [DllImport("user32.dll")] static extern IntPtr DispatchMessage(ref MSG msg);

  const uint EVENT_OBJECT_CREATE = 0x8000;
  const uint EVENT_OBJECT_SHOW = 0x8002;
  const uint WINEVENT_SKIPOWNPROCESS = 0x0002;
  const int GWL_EXSTYLE = -20;
  const int WS_EX_LAYERED = 0x00080000;
  const uint LWA_ALPHA = 0x2;
  const string OsdCaption = "FloatingNativeWindow";

  public static readonly ConcurrentQueue<string> Messages = new ConcurrentQueue<string>();
  public static bool HookReady;
  public static volatile bool TwoCodeActive = false;

  static WinEventDelegate winEventCallback;
  static IntPtr winEventHook = IntPtr.Zero;
  static readonly ConcurrentDictionary<uint, bool> processCache = new ConcurrentDictionary<uint, bool>();
  static readonly Dictionary<IntPtr, long> suppressedAt = new Dictionary<IntPtr, long>();
  static bool lastMicState = false;
  static bool micInitialized = false;

  static long Now() { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }

  public static bool IsMicMuted() {
    try {
        var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
        IMMDevice dev = null;
        enumerator.GetDefaultAudioEndpoint(1, 2, out dev);
        if (dev == null) return false;
        Guid epvId = typeof(IAudioEndpointVolume).GUID;
        IAudioEndpointVolume aev;
        dev.Activate(ref epvId, 23, 0, out aev);
        if (aev == null) return false;
        bool muted;
        aev.GetMute(out muted);
        return muted;
    } catch {
        return false;
    }
  }

  static bool IsGHelperProcess(uint processId) {
    if (processId == 0) return false;
    bool cached;
    if (processCache.TryGetValue(processId, out cached)) return cached;
    bool isGHelper = false;
    try {
      using (Process process = Process.GetProcessById((int)processId)) {
        string name = process.ProcessName;
        isGHelper = string.Equals(name, "GHelper", StringComparison.OrdinalIgnoreCase) || string.Equals(name, "G-Helper", StringComparison.OrdinalIgnoreCase);
      }
    } catch {}
    if (processCache.Count > 512) processCache.Clear();
    processCache[processId] = isGHelper;
    return isGHelper;
  }

  static bool IsToastGeometry(IntPtr hwnd, out int outWidth, out int outHeight) {
    outWidth = 0; outHeight = 0;
    RECT rect;
    if (!GetWindowRect(hwnd, out rect)) return false;
    int width = rect.Right - rect.Left;
    int height = rect.Bottom - rect.Top;
    outWidth = width; outHeight = height;
    MONITORINFO info = new MONITORINFO();
    info.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
    if (!GetMonitorInfo(MonitorFromWindow(hwnd, 2), ref info)) return false;
    int monitorWidth = info.rcMonitor.Right - info.rcMonitor.Left;
    int monitorCenter = info.rcMonitor.Left + monitorWidth / 2;
    int center = rect.Left + width / 2;
    int bottomOffset = info.rcMonitor.Bottom - rect.Bottom;
    if (height < 60 || height > 200) return false;
    if (width < 200 || width > monitorWidth) return false;
    if (Math.Abs(center - monitorCenter) > monitorWidth * 0.20) return false;
    if (bottomOffset < 140 || bottomOffset > 600) return false;
    return true;
  }

  static void Suppress(IntPtr hwnd) {
    if (IsWindowVisible(hwnd)) ShowWindow(hwnd, 0);
    if (!SetLayeredWindowAttributes(hwnd, 0, 0, LWA_ALPHA) && !IsWindowVisible(hwnd)) {
      int exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
      SetWindowLong(hwnd, GWL_EXSTYLE, exStyle & ~WS_EX_LAYERED);
      SetWindowLong(hwnd, GWL_EXSTYLE, exStyle | WS_EX_LAYERED);
      SetLayeredWindowAttributes(hwnd, 0, 0, LWA_ALPHA);
    }
    if (IsWindowVisible(hwnd)) ShowWindow(hwnd, 0);
  }

  static void OnWinEvent(IntPtr hook, uint eventType, IntPtr hwnd, int objectId, int childId, uint threadId, uint time) {
    try {
      if (hwnd == IntPtr.Zero || objectId != 0) return;
      uint processId;
      GetWindowThreadProcessId(hwnd, out processId);
      if (!IsGHelperProcess(processId)) return;
      StringBuilder caption = new StringBuilder(64);
      GetWindowText(hwnd, caption, caption.Capacity);
      if (caption.ToString() != OsdCaption) return;
      int width, height;
      if (!IsToastGeometry(hwnd, out width, out height)) return;

      // Always suppress G-Helper's black OSD window immediately,
      // even if TwoCode is still starting up or reconnecting!
      Suppress(hwnd);

      if (!TwoCodeActive) return;

      long now = Now();
      bool firstTime = !suppressedAt.ContainsKey(hwnd);
      suppressedAt[hwnd] = now;
      if (suppressedAt.Count > 64) suppressedAt.Clear();
      if (firstTime) {
        bool currentMic = IsMicMuted();
        bool micToggled = false;
        if (!micInitialized) {
            lastMicState = currentMic;
            micInitialized = true;
        } else if (currentMic != lastMicState) {
            lastMicState = currentMic;
            micToggled = true;
        }

        string msg = string.Format("{{\"type\":\"osd-trigger\",\"width\":{0},\"height\":{1},\"micMuted\":{2},\"micToggled\":{3},\"at\":{4}}}",
            width, height, currentMic.ToString().ToLowerInvariant(), micToggled.ToString().ToLowerInvariant(), now);
        Messages.Enqueue(msg);
      }
    } catch {}
  }

  public static void Start() {
    try { SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch {}
    lastMicState = IsMicMuted();
    micInitialized = true;
    winEventCallback = new WinEventDelegate(OnWinEvent);
    winEventHook = SetWinEventHook(EVENT_OBJECT_CREATE, EVENT_OBJECT_SHOW, IntPtr.Zero, winEventCallback, 0, 0, WINEVENT_SKIPOWNPROCESS);
    HookReady = winEventHook != IntPtr.Zero;
  }

  public static void Pump(int milliseconds) {
    MsgWaitForMultipleObjects(0, null, false, (uint)milliseconds, 0x04FF);
    MSG msg;
    while (PeekMessage(out msg, IntPtr.Zero, 0, 0, 1)) {
      TranslateMessage(ref msg);
      DispatchMessage(ref msg);
    }
  }

  public static void Stop() {
    if (winEventHook != IntPtr.Zero) { UnhookWinEvent(winEventHook); winEventHook = IntPtr.Zero; }
  }
}
'@

Log-Bridge "C# compiled. Connecting to pipe $PipeName..."

try {
  # Keep the elevated window hook alive even if TwoCode has not opened its
  # named pipe yet (common when both apps start at Windows logon).
  [GHelperOsdBridge]::Start()
  [GHelperOsdBridge]::TwoCodeActive = $false
  Log-Bridge "OSD hook started. HookReady=$([GHelperOsdBridge]::HookReady)"

  while ($true) {
    $pipe = $null
    $writer = $null
    try {
      $pipe = New-Object System.IO.Pipes.NamedPipeClientStream('.', $PipeName, [System.IO.Pipes.PipeDirection]::Out)
      $pipe.Connect(1000)
      $writer = New-Object System.IO.StreamWriter($pipe, (New-Object System.Text.UTF8Encoding($false)))
      $writer.AutoFlush = $true
      [GHelperOsdBridge]::TwoCodeActive = $true
      Log-Bridge "Connected to pipe $PipeName"
      try {
        $writer.WriteLine(('{{"type":"hello","hook":{0},"pid":{1}}}' -f ([GHelperOsdBridge]::HookReady.ToString().ToLowerInvariant()), $PID))
      } catch {}

      $lastPing = [DateTimeOffset]::UtcNow
      $message = $null
      while ($pipe.IsConnected) {
        [GHelperOsdBridge]::Pump(30)
        while ([GHelperOsdBridge]::Messages.TryDequeue([ref]$message)) {
          try {
            $writer.WriteLine($message)
          } catch {
            break
          }
        }
        if (([DateTimeOffset]::UtcNow - $lastPing).TotalSeconds -ge 4) {
          $lastPing = [DateTimeOffset]::UtcNow
          try {
            $writer.WriteLine('{"type":"ping"}')
          } catch {
            break
          }
        }
      }
      Log-Bridge "Pipe disconnected; retrying."
    } catch {
      Log-Bridge "Pipe unavailable; retrying: $($_.Exception.Message)"
    } finally {
      [GHelperOsdBridge]::TwoCodeActive = $false
      if ($writer) { try { $writer.Dispose() } catch {} }
      if ($pipe) { try { $pipe.Dispose() } catch {} }
    }
    for ($i = 0; $i -lt 5; $i++) {
      [GHelperOsdBridge]::Pump(100)
    }
  }
} catch {
  Log-Bridge "Fatal bridge exception: $($_.Exception.ToString())"
} finally {
  [GHelperOsdBridge]::TwoCodeActive = $false
  Log-Bridge "Stopping bridge..."
  [GHelperOsdBridge]::Stop()
  if ($ownsMutex) { try { $mutex.ReleaseMutex() } catch {} }
}
