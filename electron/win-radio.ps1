param(
    [ValidateSet('Status', 'Toggle')]
    [string]$Action = 'Status',
    [ValidateSet('Wifi', 'Bluetooth')]
    [string]$Kind = 'Wifi'
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and
    $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await-WinRT($Operation, $ResultType) {
    $task = $asTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    if (-not $task.Wait(6000)) { throw 'Windows radio operation timed out.' }
    return $task.Result
}

try {
    $null = [Windows.Devices.Radios.Radio, Windows.Devices.Radios, ContentType = WindowsRuntime]
    $null = [Windows.Devices.Radios.RadioKind, Windows.Devices.Radios, ContentType = WindowsRuntime]
    $null = [Windows.Devices.Radios.RadioState, Windows.Devices.Radios, ContentType = WindowsRuntime]
    $null = [Windows.Devices.Radios.RadioAccessStatus, Windows.Devices.Radios, ContentType = WindowsRuntime]

    $radioListType = [System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]]
    $radios = Await-WinRT ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) $radioListType
    $targetKind = if ($Kind -eq 'Bluetooth') {
        [Windows.Devices.Radios.RadioKind]::Bluetooth
    } else {
        [Windows.Devices.Radios.RadioKind]::WiFi
    }
    $radio = @($radios | Where-Object { $_.Kind -eq $targetKind } | Select-Object -First 1)[0]
    if (-not $radio) { throw "$Kind radio not found." }

    if ($Action -eq 'Toggle') {
        $access = Await-WinRT ([Windows.Devices.Radios.Radio]::RequestAccessAsync()) ([Windows.Devices.Radios.RadioAccessStatus])
        if ($access -ne [Windows.Devices.Radios.RadioAccessStatus]::Allowed) {
            throw "Windows denied radio control access ($access)."
        }
        $desired = if ($radio.State -eq [Windows.Devices.Radios.RadioState]::On) {
            [Windows.Devices.Radios.RadioState]::Off
        } else {
            [Windows.Devices.Radios.RadioState]::On
        }
        $result = Await-WinRT ($radio.SetStateAsync($desired)) ([Windows.Devices.Radios.RadioAccessStatus])
        if ($result -ne [Windows.Devices.Radios.RadioAccessStatus]::Allowed) {
            throw "Windows could not change radio state ($result)."
        }
        Start-Sleep -Milliseconds 250
        $radios = Await-WinRT ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) $radioListType
        $radio = @($radios | Where-Object { $_.Kind -eq $targetKind } | Select-Object -First 1)[0]
    }

    $state = if ($radio.State -eq [Windows.Devices.Radios.RadioState]::On) { 'On' } else { 'Off' }
    @{ success = $true; kind = $Kind; state = $state } | ConvertTo-Json -Compress
} catch {
    @{ success = $false; kind = $Kind; error = $_.Exception.Message } | ConvertTo-Json -Compress
}
