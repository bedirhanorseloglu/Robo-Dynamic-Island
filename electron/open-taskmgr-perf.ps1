param([string]$Section = 'cpu')

$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Name Taskmgr -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc) {
    Start-Process 'taskmgr.exe'
} else {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class TaskMgrWin {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
'@
    if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
        [TaskMgrWin]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null
        [TaskMgrWin]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
    } else {
        Start-Process 'taskmgr.exe'
    }
}

$root = $null
for ($i = 0; $i -lt 25; $i++) {
    $p = Get-Process -Name Taskmgr -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
    if ($p) {
        $root = [System.Windows.Automation.AutomationElement]::FromHandle($p.MainWindowHandle)
        if ($root) { break }
    }
    Start-Sleep -Milliseconds 150
}
if (-not $root) { exit 0 }

function Select-AutomationByPattern($patterns) {
    $all = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    foreach ($el in $all) {
        $name = [string]$el.Current.Name
        if (-not $name) { continue }
        foreach ($pat in $patterns) {
            if ($name -match $pat) {
                $selPat = $null
                if ($el.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$selPat)) {
                    $selPat.Select()
                    return $true
                }
                $invPat = $null
                if ($el.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invPat)) {
                    $invPat.Invoke()
                    return $true
                }
            }
        }
    }
    return $false
}

# 1. Switch to Performance tab (TR: Performans, EN: Performance)
Select-AutomationByPattern @('^Performans$', '^Performance$') | Out-Null
Start-Sleep -Milliseconds 180

# 2. Select target item
$targetPatterns = switch ($Section.ToLowerInvariant()) {
    'ram'  { @('^Bellek', '^Memory') }
    'igpu' { @('^GPU 0', '^GPU$') }
    'dgpu' { @('^GPU 1', 'NVIDIA', '^GPU 0') }
    default { @('^CPU') }
}
Select-AutomationByPattern $targetPatterns | Out-Null

