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
    private static IAudioEndpointVolume endpoint;

    public static int GetVolume(out bool muted) {
        muted = false;
        try {
            if (endpoint == null) {
                var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
                IMMDevice dev = null;
                enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
                if (dev == null) return -1;
                Guid epvId = typeof(IAudioEndpointVolume).GUID;
                dev.Activate(ref epvId, 23, 0, out endpoint);
                if (endpoint == null) return -1;
            }
            float v = 0;
            endpoint.GetMasterVolumeLevelScalar(out v);
            endpoint.GetMute(out muted);
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

function Start-AsyncOp($WinRtOperation, $ResultType) {
    return $asTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($WinRtOperation))
}

$lastVol = -1
$lastMuted = $false
$lastBrightness = -1
$seenNotifIds = @{}
$watcherStartedAt = [DateTimeOffset]::Now
$notificationsInitialized = $false
$initialized = $false
$lastVolumePoll = [DateTimeOffset]::MinValue
$lastBrightnessPoll = [DateTimeOffset]::MinValue
$notificationTask = $null
$notificationListType = [System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]]
$brightnessEventSubscription = $null
try {
    # WMI brightness events arrive as the display changes; no repeated CIM scans.
    $brightnessEventSubscription = Register-WmiEvent -Namespace 'root\wmi' -Query 'SELECT * FROM WmiMonitorBrightnessEvent' -SourceIdentifier 'TwoCodeBrightness' -ErrorAction Stop
} catch {}

while ($true) {
    try {
        $now = [DateTimeOffset]::Now

        # Reuse the audio endpoint and sample at 10 Hz for responsive HUD updates.
        if (($now - $lastVolumePoll).TotalMilliseconds -ge 100) {
            $lastVolumePoll = $now
            $muted = $false
            $vol = [WinAudioHelper]::GetVolume([ref]$muted)
            if ($vol -ge 0) {
                if ($lastVol -lt 0) {
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
        }

        # Sample brightness at a low rate as a fallback: some Windows display drivers
        # expose the value but never deliver WmiMonitorBrightnessEvent notifications.
        if ($lastBrightness -lt 0 -or ($now - $lastBrightnessPoll).TotalMilliseconds -ge 700) {
            $lastBrightnessPoll = $now
            $bObj = Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($null -ne $bObj -and $null -ne $bObj.CurrentBrightness) {
                $bri = [int]$bObj.CurrentBrightness
                if ($lastBrightness -ge 0 -and $bri -ne $lastBrightness) {
                    $bEv = @{ event = 'brightness'; value = $bri }
                    Write-Output ($bEv | ConvertTo-Json -Compress)
                }
                $lastBrightness = $bri
            }
        }
        if ($null -ne $brightnessEventSubscription) {
            $bEvent = Receive-Job -Job $brightnessEventSubscription -ErrorAction SilentlyContinue | Select-Object -Last 1
            if ($null -ne $bEvent) {
                $bri = -1
                try { $bri = [int]$bEvent.SourceEventArgs.NewEvent.Brightness } catch {}
                if ($bri -ge 0 -and $bri -ne $lastBrightness) {
                    $lastBrightness = $bri
                    $bEv = @{ event = 'brightness'; value = $bri }
                    Write-Output ($bEv | ConvertTo-Json -Compress)
                }
            }
        }

        # Keep the toast query asynchronous so its wait cannot delay brightness events.
        if ($notifSupported -and $null -ne $listener) {
            $notifs = $null
            if ($null -eq $notificationTask) {
                $notificationTask = Start-AsyncOp ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) $notificationListType
            } elseif ($notificationTask.IsCompleted) {
                try { $notifs = $notificationTask.Result } catch {}
                $notificationTask = Start-AsyncOp ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) $notificationListType
            }
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
                            try { $appName = [string]$n.AppInfo.DisplayInfo.DisplayName } catch {}
                            try { $appId = [string]$n.AppInfo.AppUserModelId } catch {}

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

    Start-Sleep -Milliseconds 100
}
