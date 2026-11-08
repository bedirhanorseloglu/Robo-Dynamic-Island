param(
    [ValidateSet('Scan', 'Connect')]
    [string]$Action = 'Scan',
    [string]$Ssid = ''
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not ('TwoCode.WlanApi' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

namespace TwoCode {
  public static class WlanApi {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    public struct InterfaceInfo {
      public Guid Guid;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst=256)] public string Description;
      public int State;
    }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    public struct AvailableNetwork {
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst=256)] public string ProfileName;
      public uint SsidLength;
      [MarshalAs(UnmanagedType.ByValArray, SizeConst=32)] public byte[] Ssid;
      public int BssType;
      public int Connectable;
      public int NotConnectableReason;
      public uint BssidCount;
      public int SecurityEnabled;
      public int Authentication;
      public int Cipher;
      public uint SignalQuality;
      public int InRegDomain;
      public uint Flags;
      public uint Reserved;
    }
    public class Network {
      public string Ssid { get; set; }
      public string ProfileName { get; set; }
      public int Signal { get; set; }
      public bool Secured { get; set; }
      public bool Connected { get; set; }
    }
    [DllImport("wlanapi.dll")] static extern int WlanOpenHandle(uint version, IntPtr reserved, out uint negotiated, out IntPtr handle);
    [DllImport("wlanapi.dll")] static extern int WlanEnumInterfaces(IntPtr handle, IntPtr reserved, out IntPtr list);
    [DllImport("wlanapi.dll")] static extern int WlanScan(IntPtr handle, ref Guid id, IntPtr ssid, IntPtr ie, IntPtr reserved);
    [DllImport("wlanapi.dll")] static extern int WlanGetAvailableNetworkList(IntPtr handle, ref Guid id, uint flags, IntPtr reserved, out IntPtr list);
    [DllImport("wlanapi.dll")] static extern void WlanFreeMemory(IntPtr memory);
    [DllImport("wlanapi.dll")] static extern int WlanCloseHandle(IntPtr handle, IntPtr reserved);
    static void Check(int code) { if (code != 0) throw new Win32Exception(code); }
    public static List<Network> Scan() {
      IntPtr handle = IntPtr.Zero, interfaces = IntPtr.Zero, networks = IntPtr.Zero;
      uint negotiated;
      var result = new List<Network>();
      try {
        Check(WlanOpenHandle(2, IntPtr.Zero, out negotiated, out handle));
        Check(WlanEnumInterfaces(handle, IntPtr.Zero, out interfaces));
        uint count = (uint)Marshal.ReadInt32(interfaces);
        int offset = 8, stride = Marshal.SizeOf(typeof(InterfaceInfo));
        for (int i = 0; i < count; i++) {
          var item = (InterfaceInfo)Marshal.PtrToStructure(IntPtr.Add(interfaces, offset + i * stride), typeof(InterfaceInfo));
          if (item.State == 0) continue;
          try { WlanScan(handle, ref item.Guid, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero); } catch {}
          System.Threading.Thread.Sleep(1800);
          Check(WlanGetAvailableNetworkList(handle, ref item.Guid, 0, IntPtr.Zero, out networks));
          uint networkCount = (uint)Marshal.ReadInt32(networks);
          int netStride = Marshal.SizeOf(typeof(AvailableNetwork));
          for (int n = 0; n < networkCount; n++) {
            var network = (AvailableNetwork)Marshal.PtrToStructure(IntPtr.Add(networks, 8 + n * netStride), typeof(AvailableNetwork));
            int len = (int)Math.Min(network.SsidLength, 32);
            string ssid = Encoding.UTF8.GetString(network.Ssid, 0, len).Trim();
            if (String.IsNullOrWhiteSpace(ssid)) continue;
            result.Add(new Network { Ssid = ssid, ProfileName = network.ProfileName, Signal = (int)network.SignalQuality, Secured = network.SecurityEnabled != 0, Connected = (network.Flags & 1) != 0 });
          }
          WlanFreeMemory(networks); networks = IntPtr.Zero;
        }
      } finally {
        if (networks != IntPtr.Zero) WlanFreeMemory(networks);
        if (interfaces != IntPtr.Zero) WlanFreeMemory(interfaces);
        if (handle != IntPtr.Zero) WlanCloseHandle(handle, IntPtr.Zero);
      }
      var unique = new Dictionary<string, Network>(StringComparer.OrdinalIgnoreCase);
      foreach (var network in result) {
        if (!unique.ContainsKey(network.Ssid) || unique[network.Ssid].Signal < network.Signal) unique[network.Ssid] = network;
      }
      return new List<Network>(unique.Values);
    }
  }
}
'@
}

if ($Action -eq 'Connect') {
    if ([string]::IsNullOrWhiteSpace($Ssid)) {
        @{ success = $false; error = 'Ağ adı boş.' } | ConvertTo-Json -Compress
        exit
    }
    $output = & netsh.exe wlan connect "name=$Ssid" "ssid=$Ssid" 2>&1 | Out-String
    Start-Sleep -Seconds 2
    $connected = (& netsh.exe wlan show interfaces 2>&1 | Out-String) -match ('(?im)^\s*SSID\s*:\s*' + [regex]::Escape($Ssid) + '\s*$')
    if ($connected) {
        @{ success = $true; ssid = $Ssid; state = 'On' } | ConvertTo-Json -Compress
    } else {
        @{ success = $false; error = 'Bu ağ için kayıtlı bir bağlantı profili bulunamadı. Windows’ta ağı bir kez kaydedip tekrar deneyin.'; detail = $output.Trim() } | ConvertTo-Json -Compress
    }
    exit
}

try {
    $networks = [TwoCode.WlanApi]::Scan()
    $connected = @($networks | Where-Object { $_.Connected } | Select-Object -First 1)
    $networkList = @($networks | ForEach-Object {
        @{ ssid = $_.Ssid; profileName = $_.ProfileName; signal = $_.Signal; secured = $_.Secured; connected = $_.Connected }
    })
    @{ success = $true; connectedSsid = if ($connected.Count) { $connected[0].Ssid } else { '' }; networks = $networkList } | ConvertTo-Json -Depth 5 -Compress
} catch {
    $message = if ($_.Exception.Message -match 'access is denied|eri.?im engellendi') {
        'WLAN_ACCESS_DENIED'
    } else {
        'WIFI_SCAN_FAILED'
    }
    @{ success = $false; connectedSsid = ''; networks = @(); error = $message } | ConvertTo-Json -Depth 5 -Compress
}
