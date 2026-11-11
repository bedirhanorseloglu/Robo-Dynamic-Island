param(
    [string]$Action = "status",
    [string]$LastTitle = "",
    [double]$Position = -1
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

try {
    Add-Type -TypeDefinition @'
    using System;
    using System.Runtime.InteropServices;
    public static class WinMediaKey {
        [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);
        public static void SendNext() {
            keybd_event(0xB0, 0, 0, 0);
            keybd_event(0xB0, 0, 2, 0);
        }
        public static void SendPrev() {
            keybd_event(0xB1, 0, 0, 0);
            keybd_event(0xB1, 0, 2, 0);
        }
        public static void SendPlayPause() {
            keybd_event(0xB3, 0, 0, 0);
            keybd_event(0xB3, 0, 2, 0);
        }
    }
'@
} catch {}

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and
    $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await-WinRT($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IInputStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]

try {
    $manager = Await-WinRT ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    $session = $manager.GetCurrentSession()
    $sessions = $manager.GetSessions()

    if ($sessions -and $sessions.Count -gt 0) {
        foreach ($s in $sessions) {
            try {
                $pb = $s.GetPlaybackInfo()
                if ($pb.PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing) {
                    $session = $s
                    break
                }
            } catch {}
        }
        if ($null -eq $session) {
            $session = $sessions[0]
        }
    }

    if ($null -eq $session) {
        Write-Output '{"hasSession":false}'
        exit 0
    }

    if ($Action -eq "playpause") {
        $null = Await-WinRT ($session.TryTogglePlayPauseAsync()) ([bool])
        Start-Sleep -Milliseconds 120
    } elseif ($Action -eq "next") {
        $res = Await-WinRT ($session.TrySkipNextAsync()) ([bool])
        if (-not $res) {
            try { [WinMediaKey]::SendNext() } catch {}
        }
        Start-Sleep -Milliseconds 180
    } elseif ($Action -eq "prev") {
        $res = Await-WinRT ($session.TrySkipPreviousAsync()) ([bool])
        if (-not $res) {
            try { [WinMediaKey]::SendPrev() } catch {}
        }
        Start-Sleep -Milliseconds 180
    } elseif ($Action -eq "seek" -and $Position -ge 0) {
        $ticks = [long]($Position * 10000000)
        $null = Await-WinRT ($session.TryChangePlaybackPositionAsync($ticks)) ([bool])
        Start-Sleep -Milliseconds 80
    }

    $props = Await-WinRT ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $playbackInfo = $session.GetPlaybackInfo()
    $timeline = $session.GetTimelineProperties()

    $isPlaying = ($playbackInfo.PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing)

    $posSec = [math]::Round($timeline.Position.TotalSeconds, 1)
    $endSec = [math]::Round($timeline.EndTime.TotalSeconds, 1)
    if ($timeline.LastUpdatedTime -and $isPlaying) {
        $elapsed = ([DateTimeOffset]::UtcNow - $timeline.LastUpdatedTime).TotalSeconds
        if ($elapsed -gt 0 -and $elapsed -lt 3600) {
            if ($endSec -gt 0) {
                $posSec = [math]::Min($endSec, [math]::Round($posSec + $elapsed, 1))
            } else {
                $posSec = [math]::Round($posSec + $elapsed, 1)
            }
        }
    }

    $titleStr = [string]$props.Title
    $thumbBase64 = ""
    if ($null -ne $props.Thumbnail) {
        try {
            $stream = Await-WinRT ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
            $asStreamMethod = [System.IO.WindowsRuntimeStreamExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsStreamForRead' -and $_.GetParameters().Count -eq 1 } | Select-Object -First 1
            $netStream = $asStreamMethod.Invoke($null, @($stream))
            $ms = New-Object System.IO.MemoryStream
            $netStream.CopyTo($ms)
            $bytes = $ms.ToArray()
            if ($bytes.Length -gt 0) {
                $mime = if ($stream.ContentType) { $stream.ContentType } else { "image/jpeg" }
                $thumbBase64 = "data:" + $mime + ";base64," + [Convert]::ToBase64String($bytes)
            }
            $ms.Dispose()
            $netStream.Dispose()
        } catch {
            $thumbBase64 = ""
        }
    }

    $result = @{
        hasSession = $true
        title = $titleStr
        artist = [string]$props.Artist
        album = [string]$props.AlbumTitle
        isPlaying = [bool]$isPlaying
        position = $posSec
        duration = $endSec
        sourceApp = [string]$session.SourceAppUserModelId
        thumbnail = $thumbBase64
    }

    Write-Output ($result | ConvertTo-Json -Compress)
} catch {
    Write-Output ('{"hasSession":false,"error":' + ($_.Exception.Message | ConvertTo-Json -Compress) + '}')
}
