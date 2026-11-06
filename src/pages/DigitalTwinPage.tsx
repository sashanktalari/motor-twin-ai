import React, { useEffect, useState } from 'react';
import {
  Cpu,
  RefreshCw,
  Gauge,
  Thermometer,
  Zap,
  Activity,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Play,
  RotateCw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';
import { DigitalTwinState, DatasetItem } from '../types';
import { Motor3DViewer, ComponentInfo } from '../components/digital_twin/Motor3DViewer';

export const DigitalTwinPage: React.FC = () => {
  const [twinState, setTwinState] = useState<DigitalTwinState | null>(null);
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [diagnosing, setDiagnosing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [state, dsList] = await Promise.all([
        api.getDigitalTwinState(),
        api.getDatasets(),
      ]);
      setTwinState(state);
      setDatasets(dsList);
      if (dsList.length > 0) {
        setSelectedDatasetId(dsList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to synchronize virtual motor state with backend.');
    } finally {
      setLoading(false);
    }
  };

  const syncState = async () => {
    try {
      setLoading(true);
      setError(null);
      const state = await api.getDigitalTwinState();
      setTwinState(state);
    } catch (err: any) {
      setError(err.message || 'Sync failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunDiagnosis = async () => {
    if (!selectedDatasetId) return;
    try {
      setDiagnosing(true);
      setError(null);
      await api.predictFault({
        source_type: 'DATASET',
        dataset_id: selectedDatasetId,
        sample_index: 0,
        model_name: 'random_forest',
      });
      // Refresh digital twin state immediately after prediction
      const updatedState = await api.getDigitalTwinState();
      setTwinState(updatedState);
    } catch (err: any) {
      setError(err.message || 'Fault diagnosis synchronization failed.');
    } finally {
      setDiagnosing(false);
    }
  };

  const telemetry = twinState?.telemetry;

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Banner */}
      <div className="p-4 rounded-xl border border-cyan-500/20 bg-navy-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span>VIRTUAL INDUCTION MOTOR DIGITAL TWIN WORKSPACE</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Synchronized with <span className="text-cyan-300 font-semibold">{telemetry?.data_source || 'CWRU_BENCHMARK'}</span> &bull;{' '}
            Operating Mode: <span className="text-white font-bold">{twinState?.operating_mode || 'STANDBY'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={syncState}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-700 text-xs font-mono text-cyan-300 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Telemetry</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-200 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Dedicated Workspace Layout (70% 3D Viewport / 30% Diagnostics) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Expansive 3D Motor Viewport (Approx. 70% width = col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          <Motor3DViewer
            rpm={telemetry?.rpm || 1797}
            status={telemetry?.status || 'NORMAL'}
            faultType={telemetry?.fault_type || 'Normal'}
            healthScore={telemetry?.health_score || 98.5}
            vibrationRms={telemetry?.vibration_rms_g || 0.082}
            temperatureC={telemetry?.temperature_c || 50.2}
            dataState={
              !twinState
                ? 'UNAVAILABLE'
                : telemetry?.data_source?.toLowerCase().includes('simulat')
                ? 'SIMULATED'
                : 'REAL'
            }
            onComponentSelect={(info) => setSelectedComponent(info)}
          />

          {/* Quick Dataset Diagnosis Trigger Strip */}
          <div className="p-4 rounded-xl border border-navy-800 bg-navy-900/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <span className="text-xs font-mono text-slate-400 font-semibold whitespace-nowrap">
                Sync 3D Model with Record:
              </span>
              <select
                value={selectedDatasetId || ''}
                onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-navy-950 border border-navy-700 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
              >
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.fault_class})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunDiagnosis}
              disabled={diagnosing || !selectedDatasetId}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all shadow-glow-cyan disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 ${diagnosing ? 'animate-spin' : ''}`} />
              <span>{diagnosing ? 'EVALUATING...' : 'APPLY CONDITION TO 3D TWIN'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Telemetry & Subsystems Health Panel (col-span-4) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Real-Time Motor Telemetry Card */}
          <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center justify-between border-b border-navy-800 pb-2">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>OPERATIONAL TELEMETRY</span>
              </span>
              <span className="text-[10px] text-cyan-300 font-normal">Reliance Electric 2HP</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-navy-950/70 border border-navy-800">
                <span className="text-[10px] text-slate-400">VOLTAGE</span>
                <p className="text-base font-bold text-white mt-0.5">{telemetry?.voltage_v || 460} V</p>
                <span className="text-[10px] text-slate-500">60 Hz Balanced</span>
              </div>

              <div className="p-2.5 rounded-lg bg-navy-950/70 border border-navy-800">
                <span className="text-[10px] text-slate-400">CURRENT</span>
                <p className="text-base font-bold text-white mt-0.5">{telemetry?.current_a || 2.45} A</p>
                <span className="text-[10px] text-slate-500">PF: {telemetry?.power_factor || 0.85}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-navy-950/70 border border-navy-800">
                <span className="text-[10px] text-slate-400">WINDING TEMP</span>
                <p className="text-base font-bold text-emerald-400 mt-0.5">{telemetry?.temperature_c || 50.2} &deg;C</p>
                <span className="text-[10px] text-slate-500">Class B Limit (130&deg;C)</span>
              </div>

              <div className="p-2.5 rounded-lg bg-navy-950/70 border border-navy-800">
                <span className="text-[10px] text-slate-400">DE VIBRATION</span>
                <p className="text-base font-bold text-cyan-300 mt-0.5">{telemetry?.vibration_rms_g?.toFixed(4) || 0.082} g</p>
                <span className="text-[10px] text-slate-500">Peak: {telemetry?.peak_vibration_g?.toFixed(3) || 0.24} g</span>
              </div>
            </div>
          </div>

          {/* Subsystem Component Health Bars */}
          <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-navy-800 pb-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>SUBSYSTEM MECHANICAL INTEGRITY</span>
            </h3>

            <div className="space-y-3.5">
              {twinState?.component_health &&
                Object.entries(twinState.component_health).map(([compKey, score]) => {
                  const compTitle = compKey
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
                  const isHealthy = score >= 85;
                  const isWarning = score >= 60 && score < 85;

                  return (
                    <div key={compKey} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300 font-medium">{compTitle}</span>
                        <span
                          className={`font-bold ${
                            isHealthy ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400'
                          }`}
                        >
                          {score}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-navy-950 overflow-hidden border border-navy-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isHealthy
                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                              : isWarning
                              ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                              : 'bg-gradient-to-r from-rose-600 to-red-400 animate-pulse'
                          }`}
                          style={{ width: `${Math.max(score, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Bearing Defect Frequency Kinematics Legend */}
          <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-2 font-mono text-xs">
            <h4 className="text-white font-bold tracking-wider text-[11px] uppercase border-b border-navy-800 pb-2 flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" />
              <span>SKF 6205 DEFECT FREQUENCY KINEMATICS</span>
            </h4>
            <div className="space-y-1.5 text-slate-300 text-[11px] pt-1">
              <div className="flex justify-between">
                <span className="text-slate-400">1X Shaft Speed:</span>
                <span className="text-white font-bold">29.95 Hz (1797 RPM)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">BPFI (Inner Race):</span>
                <span className="text-cyan-300 font-bold">162.18 Hz (5.415 X)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">BPFO (Outer Race):</span>
                <span className="text-amber-300 font-bold">107.36 Hz (3.585 X)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">BSF (Ball Spin):</span>
                <span className="text-violet-300 font-bold">70.60 Hz (2.357 X)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">FTF (Cage Train):</span>
                <span className="text-slate-300">11.93 Hz (0.398 X)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
