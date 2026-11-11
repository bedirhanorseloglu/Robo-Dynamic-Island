$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class GHelperWindowHook {
  public delegate void WinEventDelegate(IntPtr hook, uint eventType, IntPtr hwnd, int objectId, int childId, uint threadId, uint time);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr SetWinEventHook(uint eventMin, uint eventMax, IntPtr module, WinEventDelegate callback, uint processId, uint threadId, uint flags);
  [DllImport("user32.dll")] public static extern bool UnhookWinEvent(IntPtr hook);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, System.Text.StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, System.Text.StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
}
'@

$script:seen = @{}
$script:hook = [IntPtr]::Zero
$script:hookCallback = $null
$script:uiaHandler = $null
$script:lastNotificationAt = @{}

function ConvertTo-GHelperAccent($value) {
  if ($null -eq $value) { return $null }
  $rawColor = [string]$value
  if ($rawColor -match '^#?([0-9a-fA-F]{6})$') {
    $hex = '#' + $Matches[1].ToUpperInvariant()
    $red = [Convert]::ToInt32($Matches[1].Substring(0, 2), 16)
    $green = [Convert]::ToInt32($Matches[1].Substring(2, 2), 16)
    $blue = [Convert]::ToInt32($Matches[1].Substring(4, 2), 16)
  } else {
    $argb = [int64]$value
    $red = ($argb -shr 16) -band 255
    $green = ($argb -shr 8) -band 255
    $blue = $argb -band 255
    $hex = '#{0:X2}{1:X2}{2:X2}' -f $red, $green, $blue
  }
  return @{ hex = $hex; rgb = "$red, $green, $blue" }
}

function Get-GHelperAccent {
  $configPaths = @(
    (Join-Path $env:APPDATA 'GHelper\config.json'),
    (Join-Path $env:PROGRAMDATA 'GHelper\config.json')
  )
  foreach ($configPath in $configPaths) {
    try {
      if (-not (Test-Path -LiteralPath $configPath)) { continue }
      $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
      $primary = ConvertTo-GHelperAccent $config.aura_color
      if (-not $primary) { continue }
      $secondary = ConvertTo-GHelperAccent $config.aura_color2
      if (-not $secondary) { $secondary = $primary }
      return @{
        hex = $primary.hex; rgb = $primary.rgb
        secondaryHex = $secondary.hex; secondaryRgb = $secondary.rgb
      }
    } catch {}
  }
  return $null
}

function Write-Notification($processId, $displayString, $activityId) {
  $text = ([string]$displayString).Trim()
  if ([string]::IsNullOrWhiteSpace($text)) { return }
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $script:lastNotificationAt[[int]$processId] = $now
  foreach ($key in @($script:seen.Keys)) {
    if ($now - [long]$script:seen[$key] -gt 1800) { $script:seen.Remove($key) }
  }
  $textKey = "${processId}:$text"
  $activityKey = if (-not [string]::IsNullOrWhiteSpace([string]$activityId)) { "activity:$activityId" } else { $null }
  if ($script:seen.ContainsKey($textKey) -or ($activityKey -and $script:seen.ContainsKey($activityKey))) { return }
  $script:seen[$textKey] = $now
  if ($activityKey) { $script:seen[$activityKey] = $now }
  $accent = Get-GHelperAccent
  $payload = [ordered]@{
    event = 'ghelper-notification'
    id = "ghelper-$processId-$now"
    app = 'GHelper'
    appId = 'ghelper'
    title = $text
    body = ''
  }
  if ($accent) {
    $payload.accentHex = $accent.hex
    $payload.accentRgb = $accent.rgb
    $payload.accentSecondaryHex = $accent.secondaryHex
    $payload.accentSecondaryRgb = $accent.secondaryRgb
  }
  [Console]::Out.WriteLine(($payload | ConvertTo-Json -Compress))
}

function Get-GHelperToastText($hwnd, $caption) {
  try {
    $root = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)
    if ($null -eq $root) { return '' }
    $texts = New-Object System.Collections.Generic.List[string]
    $captionText = ([string]$caption).Trim()
    if ($captionText -match '[\p{L}\p{N}]' -and $captionText.Length -le 180 -and $captionText -notmatch '^(g-?helper(?:\s+toast)?|toast(?:form)?|notification|floatingnativewindow)$') { $texts.Add($captionText) }
    $rootName = ([string]$root.Current.Name).Trim()
    if ($rootName -match '[\p{L}\p{N}]' -and $rootName.Length -le 180 -and $rootName -notmatch '^(g-?helper(?:\s+toast)?|toast(?:form)?|notification|floatingnativewindow)$' -and -not $texts.Contains($rootName)) { $texts.Add($rootName) }
    $children = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    foreach ($child in $children) {
      try {
        $name = ([string]$child.Current.Name).Trim()
        if ($name -match '[\p{L}\p{N}]' -and $name.Length -le 180 -and $name -notmatch '^(g-?helper(?:\s+toast)?|toast(?:form)?|notification|floatingnativewindow)$' -and -not $texts.Contains($name)) { $texts.Add($name) }
      } catch {}
    }
    if ($texts.Count -eq 0) { return '' }
    return ($texts | Sort-Object Length -Descending | Select-Object -First 3) -join ' · '
  } catch { return '' }
}

function Try-HideGHelperToast($hwnd, $ownerPid) {
  try {
    if ($hwnd -eq [IntPtr]::Zero) { return }
    $caption = New-Object System.Text.StringBuilder 256
    [void][GHelperWindowHook]::GetWindowText($hwnd, $caption, $caption.Capacity)
    $className = New-Object System.Text.StringBuilder 256
    [void][GHelperWindowHook]::GetClassName($hwnd, $className, $className.Capacity)
    $isGHelperToastClass = $className.ToString() -eq 'FloatingNativeWindow'
    if (-not $isGHelperToastClass) { return }
    $rect = New-Object GHelperWindowHook+RECT
    if (-not [GHelperWindowHook]::GetWindowRect($hwnd, [ref]$rect)) { return }
    $width = $rect.Right - $rect.Left
    $height = $rect.Bottom - $rect.Top
    $monitorBounds = [System.Windows.Forms.Screen]::FromHandle($hwnd).Bounds
    $centerX = $rect.Left + ($width / 2)
    $bottomOffset = $monitorBounds.Bottom - $rect.Bottom
    if ($width -lt 220 -or $width -gt 720 -or $height -lt 42 -or $height -gt 220) { return }
    if (-not $isGHelperToastClass) {
      if ([Math]::Abs($centerX - ($monitorBounds.Left + $monitorBounds.Width / 2)) -gt ($monitorBounds.Width * 0.16)) { return }
      if ($bottomOffset -lt 150 -or $bottomOffset -gt 500) { return }
    }
    $owner = [System.Diagnostics.Process]::GetProcessById([int]$ownerPid)
    if ($owner.ProcessName -notin @('GHelper', 'G-Helper')) { return }
    $toastText = Get-GHelperToastText $hwnd $caption.ToString()
    if (-not [string]::IsNullOrWhiteSpace($toastText)) {
      Write-Notification $ownerPid $toastText ''
    } elseif (-not $script:lastNotificationAt.ContainsKey([int]$ownerPid) -or ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - [long]$script:lastNotificationAt[[int]$ownerPid]) -gt 1000) {
      return
    }
    [void][GHelperWindowHook]::ShowWindow($hwnd, 0)
  } catch {}
}

function Start-GHelperNotificationBridge {
  try {
  $script:uiaHandler = [System.Windows.Automation.AutomationEventHandler]{
    param($sender, $eventArgs)
    try {
      $processId = [int]$sender.Current.ProcessId
      $proc = [System.Diagnostics.Process]::GetProcessById($processId)
      if ($proc.ProcessName -notin @('GHelper', 'G-Helper')) { return }
      $notification = [System.Windows.Automation.NotificationEventArgs]$eventArgs
      Write-Notification $processId $notification.DisplayString $notification.ActivityId
    } catch {}
  }
  [System.Windows.Automation.Automation]::AddAutomationEventHandler(
    [System.Windows.Automation.AutomationElement]::NotificationEvent,
    [System.Windows.Automation.AutomationElement]::RootElement,
    [System.Windows.Automation.TreeScope]::Descendants,
    $script:uiaHandler
  )

  $script:hookCallback = [GHelperWindowHook+WinEventDelegate]{
    param($hook, $eventType, $hwnd, $objectId, $childId, $threadId, $time)
    try {
      if ($hwnd -eq [IntPtr]::Zero -or $objectId -ne 0) { return }
      [uint32]$ownerPid = 0
      [void][GHelperWindowHook]::GetWindowThreadProcessId($hwnd, [ref]$ownerPid)
      Try-HideGHelperToast $hwnd $ownerPid
    } catch {}
  }
  $script:hook = [GHelperWindowHook]::SetWinEventHook(0x8002, 0x8002, [IntPtr]::Zero, $script:hookCallback, 0, 0, 0)
  return $true
  } catch {
    return $false
  }
}

function Invoke-GHelperNotificationMessagePump {
  try { [System.Windows.Forms.Application]::DoEvents() } catch {}
}

function Stop-GHelperNotificationBridge {
  try {
    [System.Windows.Automation.Automation]::RemoveAutomationEventHandler(
      [System.Windows.Automation.AutomationElement]::NotificationEvent,
      [System.Windows.Automation.AutomationElement]::RootElement,
      $script:uiaHandler
    )
  } catch {}
  if ($script:hook -ne [IntPtr]::Zero) { [void][GHelperWindowHook]::UnhookWinEvent($script:hook) }
}

Export-ModuleMember -Function Start-GHelperNotificationBridge, Invoke-GHelperNotificationMessagePump, Stop-GHelperNotificationBridge
