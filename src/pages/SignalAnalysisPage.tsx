import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Activity,
  BarChart3,
  Search,
  AlertTriangle,
  Zap,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
  Maximize2,
  Sliders,
  Play,
  RotateCw,
  Clock,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { api } from '../services/api';
import { DatasetItem, DatasetDetail, SimulationResult } from '../types';

export const SignalAnalysisPage: React.FC = () => {
  // Source selection: 'DATASET' or 'SIMULATION'
  const [sourceMode, setSourceMode] = useState<'DATASET' | 'SIMULATION'>('DATASET');
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [datasetDetail, setDatasetDetail] = useState<DatasetDetail | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  
  // Waveform processing view: 'raw' or 'centered'
  const [waveformView, setWaveformView] = useState<'raw' | 'centered'>('raw');
  const [simFaultType, setSimFaultType] = useState<string>('Ball Fault');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Spectrogram canvas ref
  const spectrogramCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Initial Load of Datasets
  useEffect(() => {
    loadDatasetList();
  }, []);

  const loadDatasetList = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await api.getDatasets();
      setDatasets(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
        await fetchSignalDetail(list[0].id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dataset catalogue from backend.');
      setLoading(false);
    }
  };

  const fetchSignalDetail = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const detail = await api.getDatasetDetail(id);
      setDatasetDetail(detail);

      if (detail.preview_signal && detail.preview_signal.length >= 64) {
        const analysis = await api.analyzeSignal({
          signal: detail.preview_signal,
          sampling_rate_hz: detail.sampling_rate_hz || 12000.0,
          include_spectrogram: true,
        });
        setAnalysisResult(analysis);
      } else {
        setError('Selected dataset recording contains insufficient sample count for spectral analysis.');
      }
    } catch (err: any) {
      setError(err.message || 'Signal extraction and spectral decomposition failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDatasetSelect = (id: number) => {
    setSelectedId(id);
    fetchSignalDetail(id);
  };

  const handleRunSimulationSignal = async () => {
    try {
      setLoading(true);
      setError(null);
      const sim = await api.startSimulation({
        fault_type: simFaultType,
        rpm: 1797.0,
        load_hp: 1.0,
        duration_seconds: 0.25,
        sampling_rate_hz: 12000.0,
        noise_level: 0.08,
        amplitude_scaling: 1.0,
      });
      setSimulationResult(sim);

      // Perform spectral analysis on simulated signal
      const analysis = await api.analyzeSignal({
        signal: sim.signal_preview,
        sampling_rate_hz: sim.sampling_rate_hz,
        include_spectrogram: true,
      });
      setAnalysisResult(analysis);
    } catch (err: any) {
      setError(err.message || 'Synthetic vibration simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Switch between Real Dataset and Simulation
  const handleSwitchSource = (mode: 'DATASET' | 'SIMULATION') => {
    setSourceMode(mode);
    if (mode === 'DATASET') {
      if (selectedId) {
        fetchSignalDetail(selectedId);
      } else if (datasets.length > 0) {
        handleDatasetSelect(datasets[0].id);
      }
    } else {
      handleRunSimulationSignal();
    }
  };

  // 2. Prepare Safe Chart Data (Guarantees non-empty and integer interval to prevent Recharts crashes)
  const currentSamplingRate =
    sourceMode === 'DATASET'
      ? datasetDetail?.sampling_rate_hz || 12000
      : simulationResult?.sampling_rate_hz || 12000;

  const rawSignalPoints = analysisResult?.time_series_preview || [];
  const meanSignal = useMemo(() => {
    if (!rawSignalPoints.length) return 0;
    return rawSignalPoints.reduce((acc: number, v: number) => acc + v, 0) / rawSignalPoints.length;
  }, [rawSignalPoints]);

  const waveformChartData = useMemo(() => {
    if (!analysisResult?.time_series_preview || !analysisResult.time_series_preview.length) {
      return [];
    }
    const tAxis = analysisResult.time_axis || [];
    return analysisResult.time_series_preview.map((val: number, idx: number) => {
      const tVal = tAxis[idx] !== undefined ? tAxis[idx] * 1000 : (idx / currentSamplingRate) * 1000;
      return {
        index: idx,
        timeMs: Number(tVal.toFixed(2)),
        timeLabel: `${tVal.toFixed(2)} ms`,
        rawAmplitude: Number(val.toFixed(5)),
        centeredAmplitude: Number((val - meanSignal).toFixed(5)),
      };
    });
  }, [analysisResult, currentSamplingRate, meanSignal]);

  const fftChartData = useMemo(() => {
    if (!analysisResult?.frequencies || !analysisResult.fft_magnitudes) {
      return [];
    }
    const freqs = analysisResult.frequencies;
    const mags = analysisResult.fft_magnitudes;
    return freqs.map((f: number, idx: number) => ({
      freqHz: f,
      freqLabel: `${f.toFixed(0)} Hz`,
      magnitude: Number((mags[idx] || 0).toFixed(6)),
    }));
  }, [analysisResult]);

  const defectFreqs = useMemo(() => {
    return (
      analysisResult?.defect_frequencies ||
      datasetDetail?.defect_frequencies || {
        shaft_frequency_hz: 29.95,
        bpfo_hz: 107.36,
        bpfi_hz: 162.19,
        bsf_hz: 70.58,
        ftf_hz: 11.93,
      }
    );
  }, [analysisResult, datasetDetail]);

  // 3. Render STFT 2D Spectrogram Canvas with Turbo/Heat Colormap
  useEffect(() => {
    const canvas = spectrogramCanvasRef.current;
    if (!canvas || !analysisResult?.spectrogram) return;

    const spec = analysisResult.spectrogram;
    const matrix: number[][] = spec.matrix; // [frequencies][times]
    if (!matrix || !matrix.length || !matrix[0].length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numFreqs = matrix.length;
    const numTimes = matrix[0].length;
    const canvasW = canvas.width;
    const canvasH = canvas.height;

    // Find min and max for dB normalization
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let r = 0; r < numFreqs; r++) {
      for (let c = 0; c < numTimes; c++) {
        const v = matrix[r][c];
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
    const range = maxVal - minVal || 1;

    // Helper: Turbo / Heatmap color mapper
    const getHeatColor = (norm: number): [number, number, number] => {
      // 0.0 -> Deep Navy, 0.35 -> Cyan, 0.65 -> Yellow/Amber, 1.0 -> Bright Crimson/White
      let r = 0, g = 0, b = 0;
      if (norm < 0.25) {
        // Navy to Cyan
        const t = norm / 0.25;
        r = Math.floor(10 + t * 20);
        g = Math.floor(20 + t * 180);
        b = Math.floor(80 + t * 175);
      } else if (norm < 0.6) {
        // Cyan to Green-Amber
        const t = (norm - 0.25) / 0.35;
        r = Math.floor(30 + t * 210);
        g = Math.floor(200 + t * 40);
        b = Math.floor(255 - t * 200);
      } else {
        // Amber to Red-Orange
        const t = (norm - 0.6) / 0.4;
        r = Math.floor(240 + t * 15);
        g = Math.floor(180 - t * 140);
        b = Math.floor(55 - t * 50);
      }
      return [r, g, b];
    };

    // Draw grid of cells on canvas (Y inverted so 0 Hz is at bottom)
    const cellW = canvasW / numTimes;
    const cellH = canvasH / numFreqs;

    for (let r = 0; r < numFreqs; r++) {
      const y = canvasH - (r + 1) * cellH;
      for (let c = 0; c < numTimes; c++) {
        const val = matrix[r][c];
        const norm = Math.max(0, Math.min(1, (val - minVal) / range));
        const [red, green, blue] = getHeatColor(norm);
        ctx.fillStyle = `rgb(${red},${green},${blue})`;
        ctx.fillRect(c * cellW, y, Math.ceil(cellW), Math.ceil(cellH));
      }
    }
  }, [analysisResult]);

  return (
    <div className="space-y-6">
      {/* Top Header & Signal Source Navigation */}
      <div className="p-4 rounded-xl border border-cyan-500/20 bg-navy-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span>SIGNAL PROCESSING & SPECTRAL ANALYSIS LABORATORY</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Empirical accelerometer waveforms, FFT frequency decomposition, and STFT spectrograms
          </p>
        </div>

        {/* Source Mode Switcher: Real Dataset vs. Synthetic Simulation */}
        <div className="flex items-center gap-2 bg-navy-950 p-1 rounded-xl border border-navy-800 font-mono text-xs">
          <button
            onClick={() => handleSwitchSource('DATASET')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              sourceMode === 'DATASET'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Real CWRU Dataset
          </button>
          <button
            onClick={() => handleSwitchSource('SIMULATION')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              sourceMode === 'SIMULATION'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Synthetic Simulation
          </button>
        </div>
      </div>

      {/* Dataset / Simulation Controls Banner */}
      <div className="p-4 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        {sourceMode === 'DATASET' ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-mono text-slate-400">Select Motor Recording:</label>
            <select
              value={selectedId || ''}
              onChange={(e) => handleDatasetSelect(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg bg-navy-950 border border-navy-700 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} &bull; {ds.fault_class} ({ds.file_type})
                </option>
              ))}
            </select>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-md">
              Fs: {datasetDetail?.sampling_rate_hz || 12000} Hz &bull; {datasetDetail?.sample_count?.toLocaleString() || 60000} Samples
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              SIMULATED MOTOR WAVEFORM:
            </span>
            <select
              value={simFaultType}
              onChange={(e) => setSimFaultType(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-navy-950 border border-navy-700 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
            >
              <option value="Normal">Normal Baseline Operation</option>
              <option value="Inner Race Fault">Inner Race Defect (BPFI Impulses)</option>
              <option value="Ball Fault">Ball Element Defect (BSF Impulses)</option>
              <option value="Outer Race Fault">Outer Race Defect (BPFO Impulses)</option>
            </select>
            <button
              onClick={handleRunSimulationSignal}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold transition-all"
            >
              Regenerate Synthetic Signal
            </button>
            <span className="text-[10px] font-mono text-amber-300/80 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-md">
              SIMULATED DATA — NOT ACTUAL SENSOR SAMPLES
            </span>
          </div>
        )}

        <button
          onClick={() => (sourceMode === 'DATASET' ? selectedId && fetchSignalDetail(selectedId) : handleRunSimulationSignal())}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-700 text-xs font-mono text-slate-200 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-200 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Kinematic Defect Frequencies Banner */}
      <div className="p-4 rounded-xl border border-navy-800 bg-navy-900/70 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">
            THEORETICAL BEARING DEFECT HARMONICS (SKF 6205 @ 1797 RPM)
          </span>
          <span className="text-[10px] text-slate-500">Contact Angle α = 0° &bull; 9 Rolling Elements</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2.5">
          <div className="p-2.5 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-[10px] text-slate-400 block">SHAFT SPEED (1X)</span>
            <p className="text-white font-bold text-sm mt-0.5">{defectFreqs.shaft_frequency_hz || 29.95} Hz</p>
          </div>
          <div className="p-2.5 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-[10px] text-slate-400 block">BPFO (OUTER RACE)</span>
            <p className="text-amber-300 font-bold text-sm mt-0.5">{defectFreqs.bpfo_hz || 107.36} Hz</p>
          </div>
          <div className="p-2.5 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-[10px] text-slate-400 block">BPFI (INNER RACE)</span>
            <p className="text-cyan-300 font-bold text-sm mt-0.5">{defectFreqs.bpfi_hz || 162.19} Hz</p>
          </div>
          <div className="p-2.5 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-[10px] text-slate-400 block">BSF (BALL SPIN)</span>
            <p className="text-violet-300 font-bold text-sm mt-0.5">{defectFreqs.bsf_hz || 70.58} Hz</p>
          </div>
          <div className="p-2.5 rounded-lg bg-navy-950/60 border border-navy-800">
            <span className="text-[10px] text-slate-400 block">FTF (CAGE TRAIN)</span>
            <p className="text-emerald-300 font-bold text-sm mt-0.5">{defectFreqs.ftf_hz || 11.93} Hz</p>
          </div>
        </div>
      </div>

      {/* Card 1: Time-Series Vibration Waveform (Raw & Centered) */}
      <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              TIME-SERIES VIBRATION ACCELERATION WAVEFORM
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Sensor: Drive-End 12 kHz Piezoelectric Accelerometer &bull; Units: Gravitational Acceleration (g)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-navy-950 p-0.5 rounded-lg border border-navy-800 text-[11px] font-mono">
              <button
                onClick={() => setWaveformView('raw')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  waveformView === 'raw'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Raw Waveform
              </button>
              <button
                onClick={() => setWaveformView('centered')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  waveformView === 'centered'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                DC Centered (x - μ)
              </button>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {waveformChartData.length} POINTS DISPLAYED
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              Extracting time-series sample buffer...
            </div>
          ) : waveformChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waveformChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="timeMs"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  label={{ value: 'Time (ms)', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(val) => `${val.toFixed(0)}`}
                  interval={Math.max(1, Math.floor(waveformChartData.length / 8))}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  label={{ value: 'Acceleration (g)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070d1a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val: any) => [`${val} g`, waveformView === 'raw' ? 'Raw Accel' : 'Centered Accel']}
                  labelFormatter={(lbl) => `Time: ${lbl} ms`}
                />
                <Line
                  type="monotone"
                  dataKey={waveformView === 'raw' ? 'rawAmplitude' : 'centeredAmplitude'}
                  stroke="#22d3ee"
                  strokeWidth={1.2}
                  dot={false}
                  isAnimationActive={false}
                  name="Vibration Acceleration"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
              No time-series samples available. Select a valid motor recording.
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Fast Fourier Transform (FFT) Magnitude Spectrum */}
      <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide font-mono flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              FAST FOURIER TRANSFORM (FFT) AMPLITUDE SPECTRUM
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Frequency bandwidth: 0 to {(currentSamplingRate / 2).toLocaleString()} Hz (Nyquist Limit) &bull; Harmonics annotated
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
              DOMINANT PEAK: {analysisResult?.features?.dominant_frequency || '—'} Hz
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
              Computing Fast Fourier Transform (FFT) magnitude vectors...
            </div>
          ) : fftChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fftChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="freqHz"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(val) => `${val.toFixed(0)}`}
                  interval={Math.max(1, Math.floor(fftChartData.length / 8))}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  label={{ value: 'Magnitude |X(f)| (g)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070d1a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val: any) => [`${val} g`, 'FFT Magnitude']}
                  labelFormatter={(lbl) => `Frequency: ${lbl} Hz`}
                />
                {/* Defect Frequency Reference Lines */}
                {defectFreqs.bpfo_hz && (
                  <ReferenceLine x={defectFreqs.bpfo_hz} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'BPFO', fill: '#f59e0b', fontSize: 9 }} />
                )}
                {defectFreqs.bpfi_hz && (
                  <ReferenceLine x={defectFreqs.bpfi_hz} stroke="#06b6d4" strokeDasharray="3 3" label={{ value: 'BPFI', fill: '#06b6d4', fontSize: 9 }} />
                )}
                <Line
                  type="monotone"
                  dataKey="magnitude"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  name="Spectral Magnitude"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
              No FFT magnitude spectrum available.
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Short-Time Fourier Transform (STFT) Spectrogram */}
      <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              SHORT-TIME FOURIER TRANSFORM (STFT) TIME-FREQUENCY SPECTROGRAM
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Energy Density (dB) across Time & Frequency bins &bull; Window Size N = 256 samples with 50% overlap
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span>Color Scale:</span>
            <span className="px-2 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-800">Low dB</span>
            <span>&rarr;</span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">Peak dB</span>
          </div>
        </div>

        <div className="relative rounded-lg overflow-hidden border border-navy-800 bg-navy-950 p-2">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-xs font-mono text-slate-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              Synthesizing 2D STFT spectrogram matrix...
            </div>
          ) : analysisResult?.spectrogram ? (
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pb-1">
                <span>Nyquist Limit (6000 Hz)</span>
                <span>Time Span (0 to {((analysisResult.spectrogram.times?.slice(-1)[0] || 0.1) * 1000).toFixed(1)} ms)</span>
              </div>
              <canvas
                ref={spectrogramCanvasRef}
                width={800}
                height={220}
                className="w-full h-48 rounded bg-black block"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                <span>0 Hz (DC Baseline)</span>
                <span>STFT Spectrogram Matrix Resolution: {analysisResult.spectrogram.frequencies?.length || 40} &times; {analysisResult.spectrogram.times?.length || 40}</span>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs font-mono text-slate-500">
              Spectrogram matrix currently unavailable. Select a dataset recording to compute STFT.
            </div>
          )}
        </div>
      </div>

      {/* Card 4: 17 Statistical & Frequency-Domain Feature Matrix */}
      {analysisResult?.features && (
        <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <h4 className="text-xs font-mono font-bold text-white tracking-wider uppercase flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              STANDARDIZED 17-FEATURE ENGINEERING VECTOR
            </h4>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              Input to Random Forest, SVM & KNN Classifiers
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
                1. Time-Domain Statistical Moments (11 Features)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs font-mono">
                {[
                  { key: 'mean', label: 'Mean (μ)', unit: 'g' },
                  { key: 'std', label: 'Std Dev (σ)', unit: 'g' },
                  { key: 'variance', label: 'Variance (σ²)', unit: 'g²' },
                  { key: 'rms', label: 'RMS (x_rms)', unit: 'g' },
                  { key: 'peak_to_peak', label: 'Peak-to-Peak', unit: 'g' },
                  { key: 'skewness', label: 'Skewness (S)', unit: '' },
                  { key: 'kurtosis', label: 'Kurtosis (K)', unit: '' },
                  { key: 'peak', label: 'Peak (|x|max)', unit: 'g' },
                  { key: 'crest_factor', label: 'Crest Factor', unit: '' },
                  { key: 'shape_factor', label: 'Shape Factor', unit: '' },
                  { key: 'impulse_factor', label: 'Impulse Factor', unit: '' },
                ].map((item) => (
                  <div key={item.key} className="p-2.5 rounded-lg bg-navy-950/70 border border-navy-800/80">
                    <span className="text-[10px] text-slate-400 block truncate">{item.label}</span>
                    <span className="text-cyan-300 font-bold text-sm block mt-0.5">
                      {analysisResult.features[item.key] !== undefined
                        ? Number(analysisResult.features[item.key]).toFixed(4)
                        : '—'}
                      {item.unit ? ` ${item.unit}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
                2. Frequency-Domain Spectral Descriptors (6 Features)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
                {[
                  { key: 'dominant_frequency', label: 'Dominant Freq', unit: 'Hz' },
                  { key: 'spectral_centroid', label: 'Spectral Centroid', unit: 'Hz' },
                  { key: 'spectral_energy', label: 'Spectral Energy', unit: '' },
                  { key: 'spectral_std', label: 'Spectral Std', unit: 'Hz' },
                  { key: 'spectral_skewness', label: 'Spectral Skew', unit: '' },
                  { key: 'spectral_kurtosis', label: 'Spectral Kurtosis', unit: '' },
                ].map((item) => (
                  <div key={item.key} className="p-2.5 rounded-lg bg-navy-950/70 border border-navy-800/80">
                    <span className="text-[10px] text-slate-400 block truncate">{item.label}</span>
                    <span className="text-violet-300 font-bold text-sm block mt-0.5">
                      {analysisResult.features[item.key] !== undefined
                        ? Number(analysisResult.features[item.key]).toFixed(4)
                        : '—'}
                      {item.unit ? ` ${item.unit}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
