[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int RegisterControlChangeNotify(IntPtr pNotify);
    int UnregisterControlChangeNotify(IntPtr pNotify);
    int GetChannelCount(out int pnChannelCount);
    int SetMasterVolumeLevel(float fLevelDB, Guid pguidEventContext);
    int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
    int GetMasterVolumeLevel(out float pfLevelDB);
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int SetChannelVolumeLevel(uint nChannel, float fLevelDB, Guid pguidEventContext);
    int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, Guid pguidEventContext);
    int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
    int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
    int GetMute(out bool pbMute);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject { }

public class WinAudioHelper {
    public static int GetVolume(out bool muted) {
        muted = false;
        try {
            var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
            IMMDevice dev = null;
            enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
            if (dev == null) return -1;
            Guid epvId = typeof(IAudioEndpointVolume).GUID;
            IAudioEndpointVolume epv = null;
            dev.Activate(ref epvId, 23, 0, out epv);
            if (epv == null) return -1;
            float v = 0;
            epv.GetMasterVolumeLevelScalar(out v);
            epv.GetMute(out muted);
            return (int)Math.Round(v * 100);
        } catch {
            return -1;
        }
    }
}
'@

# Load WinRT UserNotificationListener
$notifSupported = $false
$listener = $null
$asTaskGeneric = $null
$asStreamMethod = $null
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.UI.Notifications.NotificationKinds, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.UI.Notifications.UserNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]
    $asStreamMethod = [System.IO.WindowsRuntimeStreamExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsStreamForRead' -and $_.GetParameters().Count -eq 1
    } | Select-Object -First 1
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
    if ($listener.GetAccessStatus().ToString() -eq 'Allowed') {
        $notifSupported = $true
    }
} catch {}

function Await-Op($WinRtTask, $ResultType) {
    $netTask = $asTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($WinRtTask))
    $netTask.Wait(1500) | Out-Null
    return $netTask.Result
}

$lastVol = -1
$lastMuted = $false
$lastBrightness = -1
$seenNotifIds = @{}
$watcherStartedAt = [DateTimeOffset]::Now
$notificationsInitialized = $false
$initialized = $false

while ($true) {
    try {
        # 1. Check Volume & Mute
        $muted = $false
        $vol = [WinAudioHelper]::GetVolume([ref]$muted)
        if ($vol -ge 0) {
            if (-not $initialized) {
                $lastVol = $vol
                $lastMuted = $muted
                $initObj = @{ event = 'init-audio'; volume = $vol; muted = [bool]$muted }
                Write-Output ($initObj | ConvertTo-Json -Compress)
            } elseif ($vol -ne $lastVol -or $muted -ne $lastMuted) {
                $lastVol = $vol
                $lastMuted = $muted
                $evObj = @{ event = 'volume'; value = $vol; muted = [bool]$muted }
                Write-Output ($evObj | ConvertTo-Json -Compress)
            }
        }

        # 2. Check Screen Brightness
        $bObj = Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $bObj -and $null -ne $bObj.CurrentBrightness) {
            $bri = [int]$bObj.CurrentBrightness
            if (-not $initialized) {
                $lastBrightness = $bri
            } elseif ($bri -ne $lastBrightness) {
                $lastBrightness = $bri
                $bEv = @{ event = 'brightness'; value = $bri }
                Write-Output ($bEv | ConvertTo-Json -Compress)
            }
        }

        # 3. Check Windows Toast Notifications
        if ($notifSupported -and $null -ne $listener) {
            $listType = [System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]]
            $notifs = Await-Op ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) $listType
            if ($null -ne $notifs) {
                foreach ($n in $notifs) {
                    $nid = [string]$n.Id
                    if (-not $seenNotifIds.ContainsKey($nid)) {
                        $seenNotifIds[$nid] = $true

                        # The first successful snapshot is a baseline. Existing toasts
                        # must not replay as fresh alerts when TwoCode starts.
                        $isNewSinceWatcherStart = $false
                        try { $isNewSinceWatcherStart = $n.CreationTime -ge $watcherStartedAt } catch {}
                        if ($notificationsInitialized -or $isNewSinceWatcherStart) {
                            $appName = 'Windows'
                            $appId = ''
                            $logoBase64 = ''
                            try { $appName = [string]$n.AppInfo.DisplayInfo.DisplayName } catch {}
                            try { $appId = [string]$n.AppInfo.AppUserModelId } catch {}
                            try {
                                $size = New-Object Windows.Foundation.Size(64, 64)
                                $logoRef = $n.AppInfo.DisplayInfo.GetLogo($size)
                                if ($null -ne $logoRef -and $null -ne $asStreamMethod) {
                                    $stream = Await-Op ($logoRef.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
                                    if ($null -ne $stream) {
                                        $netStream = $asStreamMethod.Invoke($null, @($stream))
                                        $ms = New-Object System.IO.MemoryStream
                                        $netStream.CopyTo($ms)
                                        $bytes = $ms.ToArray()
                                        if ($bytes.Length -gt 0) {
                                            $mime = if ($stream.ContentType) { $stream.ContentType } else { 'image/png' }
                                            $logoBase64 = 'data:' + $mime + ';base64,' + [Convert]::ToBase64String($bytes)
                                        }
                                        $ms.Dispose()
                                        $netStream.Dispose()
                                    }
                                }
                            } catch {}

                            $titleTxt = ''
                            $bodyTxt = ''
                            try {
                                $binding = $n.Notification.Visual.GetBinding('ToastGeneric')
                                if ($null -ne $binding) {
                                    $els = @($binding.GetTextElements())
                                    if ($els.Length -ge 1) { $titleTxt = [string]$els[0].Text }
                                    if ($els.Length -ge 2) {
                                        $bodyTxt = ($els | Select-Object -Skip 1 | ForEach-Object { [string]$_.Text }) -join "`n"
                                    }
                                }
                            } catch {}

                            if ($titleTxt -or $bodyTxt) {
                                $nEv = @{
                                    event = 'notification'
                                    id = $nid
                                    app = $appName
                                    appId = $appId
                                    logo = $logoBase64
                                    title = if ($titleTxt) { $titleTxt } else { $appName }
                                    body = $bodyTxt
                                }
                                Write-Output ($nEv | ConvertTo-Json -Compress)
                            }
                        }
                    }
                }
                $notificationsInitialized = $true
            }
        }

        $initialized = $true
    } catch {}

    Start-Sleep -Milliseconds 350
}
