import React, { useEffect, useState } from 'react';
import { Cpu, Flame, MemoryStick, Monitor } from 'lucide-react';

const MAX_POINTS = 22;

function Sparkline({ data, color, id }) {
  const width = 120;
  const height = 28;
  const points = data.length > 1 ? data : [0, data[0] ?? 0];
  const step = width / (points.length - 1);

  const coords = points.map((v, i) => {
    const x = Math.round(i * step * 10) / 10;
    const clamped = Math.max(0, Math.min(100, v));
    const y = Math.round((height - 2 - (clamped / 100) * (height - 5)) * 10) / 10;
    return `${x},${y}`;
  });

  const polyline = coords.join(' ');
  const area = `0,${height} ${polyline} ${width},${height}`;

  return (
    <svg className="perf-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyline}
      />
    </svg>
  );
}

export default function PerfMonitorTab() {
  const [stats, setStats] = useState({
    cpuPct: 0,
    cpuGHz: 0,
    ramUsedGB: 0,
    ramTotalGB: 0,
    ramPct: 0,
    igpuPct: 0,
    tempC: null,
    dgpuActive: false,
    dgpuPct: 0,
    dgpuTemp: null,
    dgpuVram: '',
  });

  const [history, setHistory] = useState({
    cpu: [0, 0],
    ram: [0, 0],
    igpu: [0, 0],
    dgpu: [0, 0],
  });

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const next = await window.twocode?.getPerfMetrics?.();
        if (!alive || !next) return;
        setStats(next);
        setHistory((prev) => ({
          cpu: [...prev.cpu.slice(-(MAX_POINTS - 1)), next.cpuPct ?? 0],
          ram: [...prev.ram.slice(-(MAX_POINTS - 1)), next.ramPct ?? 0],
          igpu: [...prev.igpu.slice(-(MAX_POINTS - 1)), next.igpuPct ?? 0],
          dgpu: [...prev.dgpu.slice(-(MAX_POINTS - 1)), next.dgpuActive ? (next.dgpuPct ?? 0) : 0],
        }));
      } catch {}
    };
    pull();
    const timer = setInterval(pull, 1200);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const openSection = (section) => {
    window.twocode?.openTaskMgrPerf?.(section);
  };

  return (
    <div className="perf-tab-view">
      <div className="perf-grid">
        <div
          className="perf-card perf-cpu is-clickable"
          onClick={() => openSection('cpu')}
          title="Görev Yöneticisi → CPU aç"
        >
          <div className="perf-card-head">
            <span className="perf-label"><Cpu size={12} /> CPU</span>
            <span className="perf-sub mono">
              {stats.cpuGHz ? `${stats.cpuGHz.toFixed(2)} GHz` : '—'}
              {stats.tempC != null ? ` • ${stats.tempC}°C` : ''}
            </span>
          </div>
          <div className="perf-value mono">{stats.cpuPct}%</div>
          <Sparkline data={history.cpu} color="#38bdf8" id="perfGradCpu" />
        </div>

        <div
          className="perf-card perf-ram is-clickable"
          onClick={() => openSection('ram')}
          title="Görev Yöneticisi → Bellek aç"
        >
          <div className="perf-card-head">
            <span className="perf-label"><MemoryStick size={12} /> RAM</span>
            <span className="perf-sub mono">{stats.ramUsedGB}/{stats.ramTotalGB} GB</span>
          </div>
          <div className="perf-value mono">{stats.ramPct}%</div>
          <Sparkline data={history.ram} color="#a78bfa" id="perfGradRam" />
        </div>

        <div
          className="perf-card perf-gpu is-clickable"
          onClick={() => openSection('igpu')}
          title="Görev Yöneticisi → iGPU aç"
        >
          <div className="perf-card-head">
            <span className="perf-label"><Monitor size={12} /> iGPU</span>
            <span className="perf-sub mono">{stats.tempC != null ? `610M • ${stats.tempC}°C` : '610M'}</span>
          </div>
          <div className="perf-value mono">{stats.igpuPct}%</div>
          <Sparkline data={history.igpu} color="#f472b6" id="perfGradGpu" />
        </div>

        <div
          className={`perf-card perf-dgpu is-clickable ${stats.dgpuActive ? 'is-active' : 'is-eco'}`}
          onClick={() => openSection('dgpu')}
          title="Görev Yöneticisi → dGPU aç"
        >
          <div className="perf-card-head">
            <span className="perf-label"><Flame size={12} /> dGPU</span>
            <span className="perf-sub mono">
              {stats.dgpuActive
                ? `${stats.dgpuTemp != null ? `${stats.dgpuTemp}°C` : ''}${stats.dgpuVram ? ` • ${stats.dgpuVram}` : ''}`
                : 'Eco'}
            </span>
          </div>
          <div className="perf-value mono">
            {stats.dgpuActive ? `${stats.dgpuPct}%` : 'Kapalı'}
          </div>
          <Sparkline
            data={history.dgpu}
            color={stats.dgpuActive ? '#fb923c' : '#52525b'}
            id="perfGradDgpu"
          />
        </div>
      </div>
    </div>
  );
}
