param(
    [ValidateSet('Scan', 'Pair')]
    [string]$Action = 'Scan',
    [string]$DeviceId = ''
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]
function Await-WinRT($Operation, $ResultType) {
    $task = $asTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    if (-not $task.Wait(12000)) { throw 'Bluetooth discovery timed out.' }
    return $task.Result
}

try {
    $null = [Windows.Devices.Enumeration.DeviceInformation, Windows.Devices.Enumeration, ContentType = WindowsRuntime]
    $null = [Windows.Devices.Enumeration.DeviceWatcher, Windows.Devices.Enumeration, ContentType = WindowsRuntime]
    $null = [Windows.Devices.Bluetooth.BluetoothDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
    $null = [Windows.Devices.Bluetooth.BluetoothLEDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
    $null = [Windows.Devices.Enumeration.DevicePairingResult, Windows.Devices.Enumeration, ContentType = WindowsRuntime]

    if ($Action -eq 'Pair') {
        if ([string]::IsNullOrWhiteSpace($DeviceId)) { throw 'Device identifier is missing.' }
        $device = Await-WinRT ([Windows.Devices.Enumeration.DeviceInformation]::CreateFromIdAsync($DeviceId)) ([Windows.Devices.Enumeration.DeviceInformation])
        $paired = Await-WinRT ($device.Pairing.PairAsync()) ([Windows.Devices.Enumeration.DevicePairingResult])
        @{ success = ($paired.Status.ToString() -in @('Paired', 'AlreadyPaired')); status = $paired.Status.ToString(); name = $device.Name } | ConvertTo-Json -Compress
        exit
    }

    $type = [Windows.Devices.Enumeration.DeviceInformation]
    $found = [System.Collections.Concurrent.ConcurrentDictionary[string,object]]::new()
    $watchers = @()
    foreach ($selector in @(
        [Windows.Devices.Bluetooth.BluetoothDevice]::GetDeviceSelectorFromPairingState($false),
        [Windows.Devices.Bluetooth.BluetoothLEDevice]::GetDeviceSelectorFromPairingState($false)
    )) {
        $watcher = [Windows.Devices.Enumeration.DeviceInformation]::CreateWatcher($selector)
        $handler = [Windows.Foundation.TypedEventHandler[Windows.Devices.Enumeration.DeviceWatcher,Windows.Devices.Enumeration.DeviceInformation]] {
            param($sender, $info)
            if ($info.Name) {
                $found[$info.Id] = [pscustomobject]@{ id = $info.Id; name = $info.Name; paired = [bool]$info.Pairing.IsPaired }
            }
        }
        $watcher.add_Added($handler) | Out-Null
        $watchers += ,@{ watcher = $watcher; handler = $handler }
        $watcher.Start()
    }
    Start-Sleep -Seconds 7
    foreach ($entry in $watchers) {
        try { $entry.watcher.Stop() } catch {}
    }
    @{ success = $true; devices = @($found.Values | Sort-Object name) } | ConvertTo-Json -Depth 5 -Compress
} catch {
    @{ success = $false; devices = @(); error = 'Bluetooth taraması başarısız oldu: ' + $_.Exception.Message } | ConvertTo-Json -Depth 5 -Compress
}
