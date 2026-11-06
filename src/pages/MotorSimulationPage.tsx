
import React, { useState } from 'react';
import {
  PlayCircle,
  Sliders,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { api } from '../services/api';
import { SimulationResult } from '../types';

interface ChartPoint {
  x: number;
  y: number;
  label: string;
}

interface SignalChartProps {
  data: ChartPoint[];
  color: string;
  yLabel: string;
  emptyMessage: string;
}

// SVG chart: avoids the Recharts CartesianGrid/axis rendering crash.
const SignalChart: React.FC<SignalChartProps> = ({
  data,
  color,
  yLabel,
  emptyMessage,
}) => {
  const width = 900;
  const height = 260;
  const left = 65;
  const right = 20;
  const top = 20;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400 font-mono">
        {emptyMessage}
      </div>
    );
  }

  // Limit SVG points for smooth browser performance.
  const step = Math.max(1, Math.ceil(data.length / 700));
  const sampled = data.filter((_, index) => index % step === 0);

  const values = sampled.map((point) => point.y);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const padding = range * 0.08;

  const lower = minValue - padding;
  const upper = maxValue + padding;

  const coordinates = sampled.map((point, index) => {
    const x =
      left +
      (index / Math.max(1, sampled.length - 1)) * plotWidth;

    const y =
      top +
      (1 - (point.y - lower) / (upper - lower)) * plotHeight;

    return { x, y, label: point.label, value: point.y };
  });

  const path = coordinates
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    )
    .join(' ');

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const y = top + (index / 4) * plotHeight;
    const value = upper - (index / 4) * (upper - lower);

    return { y, value };
  });

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-64"
        role="img"
        aria-label={`Signal chart showing ${yLabel}`}
      >
        {gridLines.map((line, index) => (
          <g key={index}>
            <line
              x1={left}
              y1={line.y}
              x2={width - right}
              y2={line.y}
              stroke="#1e293b"
              strokeDasharray="4 4"
            />
            <text
              x={left - 10}
              y={line.y + 4}
              fill="#94a3b8"
              fontSize="10"
              textAnchor="end"
            >
              {line.value.toFixed(2)}
            </text>
          </g>
        ))}

        <line
          x1={left}
          y1={top}
          x2={left}
          y2={height - bottom}
          stroke="#475569"
        />

        <line
          x1={left}
          y1={height - bottom}
          x2={width - right}
          y2={height - bottom}
          stroke="#475569"
        />

        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <text
          x={left + plotWidth / 2}
          y={height - 8}
          fill="#94a3b8"
          fontSize="11"
          textAnchor="middle"
        >
          Sample index
        </text>

        <text
          x="15"
          y={height / 2}
          fill="#94a3b8"
          fontSize="11"
          textAnchor="middle"
          transform={`rotate(-90 15 ${height / 2})`}
        >
          {yLabel}
        </text>
      </svg>

      <div className="text-[10px] text-slate-500 font-mono text-right">
        {data.length.toLocaleString()} data points
      </div>
    </div>
  );
};

export const MotorSimulationPage: React.FC = () => {
  const [faultType, setFaultType] = useState<string>('Inner Race Fault');
  const [rpm, setRpm] = useState<number>(1797);
  const [loadHp, setLoadHp] = useState<number>(1.0);
  const [duration, setDuration] = useState<number>(0.5);
  const [amplitude, setAmplitude] = useState<number>(1.0);
  const [noise, setNoise] = useState<number>(0.05);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await api.startSimulation({
        fault_type: faultType,
        rpm,
        load_hp: loadHp,
        duration_seconds: duration,
        sampling_rate_hz: 12000,
        noise_level: noise,
        amplitude_scaling: amplitude,
      });

      if (!response) {
        throw new Error('The backend returned an empty simulation response.');
      }

      setResult(response);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Simulation generation failed.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const waveformData: ChartPoint[] = result
    ? (result.signal_preview ?? []).map((value, index) => ({
        x: index,
        y: Number(value),
        label: `${(
          Number(result.time_axis?.[index] ?? index / 12000) * 1000
        ).toFixed(2)} ms`,
      })).filter((point) => Number.isFinite(point.y))
    : [];

  const spectrumData: ChartPoint[] = result
    ? (result.spectrum_frequencies ?? []).map((frequency, index) => ({
        x: index,
        y: Number(result.spectrum_magnitudes?.[index] ?? 0),
        label: `${Number(frequency).toFixed(1)} Hz`,
      })).filter((point) => Number.isFinite(point.y))
    : [];

  const formatValue = (value: number | undefined, digits = 2) =>
    Number.isFinite(value) ? Number(value).toFixed(digits) : 'N/A';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="p-4 rounded-xl border border-cyan-500/20 bg-navy-900/60 backdrop-blur-md">
        <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-cyan-400" />
          SOFTWARE-ONLY MOTOR VIBRATION SIMULATION MODULE
        </h2>

        <p className="text-xs text-slate-400 font-mono mt-2">
          Parametric mathematical synthesis using harmonic resonance
          and bearing-impact models.
        </p>
      </div>

      {/* Simulation disclaimer */}
      <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 text-amber-200 text-xs font-mono flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />

        <div>
          <span className="font-bold tracking-wider">
            SIMULATED DATA — NOT PHYSICAL SENSOR SAMPLES
          </span>

          <p className="text-[11px] text-amber-300/80 mt-1">
            These signals are mathematically generated for educational
            purposes and software testing. They are not actual motor
            measurements.
          </p>
        </div>
      </div>

      {/* Simulation controls */}
      <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 space-y-4">

        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-cyan-400" />
          SIMULATION PARAMETERS
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2">
              Fault Category
            </label>

            <select
              value={faultType}
              onChange={(e) => setFaultType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-xs text-white font-mono"
            >
              <option value="Normal">Normal Operation</option>
              <option value="Inner Race Fault">Inner Race Fault</option>
              <option value="Outer Race Fault">Outer Race Fault</option>
              <option value="Ball Fault">Ball Fault</option>
              <option value="Abnormal Vibration">Mechanical Looseness</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
              <span>Rotational Speed</span>
              <span className="text-cyan-400 font-bold">{rpm} RPM</span>
            </div>

            <input
              type="range"
              min="600"
              max="3600"
              step="30"
              value={rpm}
              onChange={(e) => setRpm(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
              <span>Operating Load</span>
              <span className="text-cyan-400 font-bold">{loadHp} HP</span>
            </div>

            <input
              type="range"
              min="0"
              max="3"
              step="0.5"
              value={loadHp}
              onChange={(e) => setLoadHp(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
              <span>Defect Amplitude</span>
              <span className="text-cyan-400 font-bold">
                {amplitude.toFixed(1)}x
              </span>
            </div>

            <input
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              value={amplitude}
              onChange={(e) => setAmplitude(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
              <span>Noise Level</span>
              <span className="text-cyan-400 font-bold">
                {noise.toFixed(2)}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="0.4"
              step="0.02"
              value={noise}
              onChange={(e) => setNoise(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
              <span>Duration</span>
              <span className="text-cyan-400 font-bold">
                {duration.toFixed(1)} sec
              </span>
            </div>

            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.1"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSimulate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-50"
          >
            <PlayCircle
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            {loading ? 'GENERATING SIMULATION...' : 'GENERATE SIMULATED SIGNAL'}
          </button>
        </div>
      </div>

      {/* Loading message */}
      {loading && (
        <div className="p-5 rounded-xl border border-cyan-500/30 bg-navy-900/60 text-center text-cyan-300 font-mono text-xs">
          Generating vibration signal. Please wait...
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-200 text-xs font-mono">
          <strong>Simulation error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">

          <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/20 text-amber-300 text-xs font-mono">
            <Activity className="inline h-4 w-4 mr-2" />
            SIMULATED RESULT — This is generated data, not a physical
            motor measurement.
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">

            <div className="p-3 rounded-lg border border-navy-800 bg-navy-950/70">
              <span className="text-[10px] text-slate-400">VIBRATION RMS</span>
              <p className="text-lg font-bold text-cyan-300 mt-1">
                {formatValue(result.rms, 4)} g
              </p>
            </div>

            <div className="p-3 rounded-lg border border-navy-800 bg-navy-950/70">
              <span className="text-[10px] text-slate-400">PEAK AMPLITUDE</span>
              <p className="text-lg font-bold text-white mt-1">
                {formatValue(result.peak, 4)} g
              </p>
            </div>

            <div className="p-3 rounded-lg border border-navy-800 bg-navy-950/70">
              <span className="text-[10px] text-slate-400">CREST FACTOR</span>
              <p className="text-lg font-bold text-white mt-1">
                {formatValue(result.crest_factor)}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-navy-800 bg-navy-950/70">
              <span className="text-[10px] text-slate-400">KURTOSIS</span>
              <p className="text-lg font-bold text-white mt-1">
                {formatValue(result.kurtosis)}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-navy-800 bg-navy-950/70">
              <span className="text-[10px] text-slate-400">DOMINANT FREQ</span>
              <p className="text-lg font-bold text-cyan-300 mt-1">
                {formatValue(result.dominant_frequency, 1)} Hz
              </p>
            </div>

          </div>

          {/* Waveform */}
          <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 space-y-3">

            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                SYNTHETIC TIME-DOMAIN WAVEFORM
              </h4>

              <p className="text-[10px] text-slate-400 font-mono mt-1">
                Sampling frequency: 12,000 Hz • Duration:{' '}
                {result.duration_seconds} seconds
              </p>
            </div>

            <SignalChart
              data={waveformData}
              color="#22d3ee"
              yLabel="Acceleration (g)"
              emptyMessage="No waveform samples were returned by the backend."
            />

          </div>

          {/* FFT */}
          <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 space-y-3">

            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                FFT FREQUENCY SPECTRUM
              </h4>

              <p className="text-[10px] text-slate-400 font-mono mt-1">
                BPFO:{' '}
                {formatValue(result.defect_frequencies?.bpfo_hz, 2)} Hz
                {' • '}
                BPFI:{' '}
                {formatValue(result.defect_frequencies?.bpfi_hz, 2)} Hz
              </p>
            </div>

            <SignalChart
              data={spectrumData}
              color="#a855f7"
              yLabel="FFT magnitude"
              emptyMessage="No frequency spectrum samples were returned by the backend."
            />

          </div>

        </div>
      )}

    </div>
  );
};
