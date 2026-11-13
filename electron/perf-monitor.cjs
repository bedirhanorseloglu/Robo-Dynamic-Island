const os = require('os');
const { spawn } = require('child_process');

let prevCpuInfo = null;

function sampleNodeCpuAndRam() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  let speedSum = 0;
  for (const cpu of cpus) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.irq + t.idle;
    speedSum += cpu.speed || 0;
  }

  let cpuPct = 0;
  if (prevCpuInfo && total > prevCpuInfo.total) {
    const idleDiff = idle - prevCpuInfo.idle;
    const totalDiff = total - prevCpuInfo.total;
    cpuPct = Math.max(0, Math.min(100, Math.round(((totalDiff - idleDiff) / totalDiff) * 100)));
  }
  prevCpuInfo = { idle, total };

  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const usedBytes = totalBytes - freeBytes;

  return {
    cpuPct,
    cpuBaseGHz: cpus.length ? Math.round((speedSum / cpus.length / 1000) * 100) / 100 : 0,
    ramUsedGB: Math.round((usedBytes / 1024 ** 3) * 10) / 10,
    ramTotalGB: Math.round((totalBytes / 1024 ** 3) * 10) / 10,
    ramPct: Math.round((usedBytes / totalBytes) * 100),
    uptimeSec: Math.floor(os.uptime()),
  };
}

const PS_PERF_LOOP = `
$ErrorActionPreference = 'SilentlyContinue'
$nvSmi = 'C:\\Windows\\System32\\nvidia-smi.exe'
if (-not (Test-Path $nvSmi)) { $nvSmi = 'nvidia-smi' }

while ($true) {
    $cpuPerf = Get-CimInstance Win32_PerfFormattedData_Counters_ProcessorInformation | Where-Object { $_.Name -eq '_Total' } | Select-Object -First 1
    $gpuEng = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine | Measure-Object UtilizationPercentage -Sum
    $therm = Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation | Select-Object -First 1
    $hasNvidia = [bool](Get-CimInstance Win32_VideoController | Where-Object { $_.Name -match 'NVIDIA' -and $_.Status -eq 'OK' })

    $ghz = 0
    if ($cpuPerf) {
        $ghz = [math]::Round(($cpuPerf.ProcessorFrequency * ($cpuPerf.PercentProcessorPerformance / 100)) / 1000, 2)
    }
    $igpuPct = if ($gpuEng -and $gpuEng.Sum -ne $null) { [math]::Min(100, [math]::Round($gpuEng.Sum, 0)) } else { 0 }
    $tempC = if ($therm -and $therm.Temperature -gt 200) { [int]($therm.Temperature - 273) } else { $null }

    $dgpuActive = $false
    $dgpuPct = 0
    $dgpuTemp = $null
    $dgpuVram = ''
    if ($hasNvidia) {
        $nvOut = & $nvSmi --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>$null
        if ($LASTEXITCODE -eq 0 -and $nvOut) {
            $parts = ($nvOut -split ',') | ForEach-Object { $_.Trim() }
            if ($parts.Length -ge 4) {
                $dgpuActive = $true
                $dgpuPct = [math]::Min(100, [int]$parts[0])
                $dgpuTemp = [int]$parts[1]
                $usedG = [math]::Round(([double]$parts[2]) / 1024, 1)
                $totG = [math]::Round(([double]$parts[3]) / 1024, 1)
                $dgpuVram = "$usedG/$totG GB"
            }
        }
    }

    @{
        ghz = $ghz
        igpuPct = $igpuPct
        tempC = $tempC
        dgpuActive = $dgpuActive
        dgpuPct = $dgpuPct
        dgpuTemp = $dgpuTemp
        dgpuVram = $dgpuVram
    } | ConvertTo-Json -Compress
    Start-Sleep -Milliseconds 1200
}
`;

function createPerfMonitor() {
  let psProc = null;
  let idleKillTimer = null;
  let lastExtended = {
    ghz: 0,
    igpuPct: 0,
    tempC: null,
    dgpuActive: false,
    dgpuPct: 0,
    dgpuTemp: null,
    dgpuVram: '',
  };

  const stopHelper = () => {
    clearTimeout(idleKillTimer);
    idleKillTimer = null;
    if (psProc) {
      try { psProc.kill(); } catch {}
      psProc = null;
    }
  };

  const ensureHelper = () => {
    clearTimeout(idleKillTimer);
    // Auto-stop 10 seconds after user leaves the Perf tab so idle RAM stays 0 MB
    idleKillTimer = setTimeout(stopHelper, 10000);

    if (psProc && !psProc.killed) return;
    try {
      psProc = spawn(
        'powershell.exe',
        ['-WindowStyle', 'Hidden', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', PS_PERF_LOOP],
        { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
      );
      let buf = '';
      psProc.stdout.on('data', (chunk) => {
        buf += chunk.toString('utf8');
        const lines = buf.split(/\r?\n/);
        buf = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('{')) continue;
          try {
            const parsed = JSON.parse(trimmed);
            lastExtended = { ...lastExtended, ...parsed };
          } catch {}
        }
      });
      psProc.on('exit', () => { psProc = null; });
      psProc.on('error', () => { psProc = null; });
    } catch {
      psProc = null;
    }
  };

  const getSnapshot = () => {
    ensureHelper();
    const base = sampleNodeCpuAndRam();
    return {
      ...base,
      cpuGHz: lastExtended.ghz > 0 ? lastExtended.ghz : base.cpuBaseGHz,
      igpuPct: lastExtended.igpuPct,
      tempC: lastExtended.tempC,
      dgpuActive: lastExtended.dgpuActive,
      dgpuPct: lastExtended.dgpuPct,
      dgpuTemp: lastExtended.dgpuTemp,
      dgpuVram: lastExtended.dgpuVram,
    };
  };

  return { getSnapshot, stop: stopHelper };
}

module.exports = { createPerfMonitor };

