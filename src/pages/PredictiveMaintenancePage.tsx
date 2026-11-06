import React, { useEffect, useState } from 'react';
import {
  Wrench,
  AlertOctagon,
  Clock,
  CheckCircle2,
  TrendingDown,
  Info,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../services/api';
import { MaintenanceAnalysis, MaintenanceLogItem } from '../types';

export const PredictiveMaintenancePage: React.FC = () => {
  const [analysis, setAnalysis] = useState<MaintenanceAnalysis | null>(null);
  const [history, setHistory] = useState<MaintenanceLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMaintenanceData();
  }, []);

  const loadMaintenanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [analysisData, historyData] = await Promise.all([
        api.analyzeMaintenance(),
        api.getMaintenanceHistory(),
      ]);
      setAnalysis(analysisData);
      setHistory(historyData);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve predictive maintenance telemetry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl border border-cyan-500/20 bg-navy-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Wrench className="h-4 w-4 text-cyan-400" />
            <span>PREDICTIVE MAINTENANCE & DEGRADATION ANALYTICS</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Unsupervised anomaly scoring via Isolation Forest & ISO 10816 mechanical degradation tracking
          </p>
        </div>
        <button
          onClick={loadMaintenanceData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-700 text-xs font-mono text-cyan-300 transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-evaluate Advisory</span>
        </button>
      </div>

      {/* Mandatory Scientific Distinction Notice (RUL vs Degradation) */}
      <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-950/20 backdrop-blur-md text-xs font-mono space-y-2">
        <div className="flex items-center gap-2 text-violet-300 font-bold">
          <Info className="h-4 w-4 text-violet-400" />
          <span>SCIENTIFIC PRINCIPLES: FAULT DIAGNOSIS VS. REMAINING USEFUL LIFE (RUL)</span>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          The CWRU dataset provides discrete seeded bearing fault severity classes. Under rigorous engineering standards,
          Remaining Useful Life (RUL) modeling requires continuous run-to-failure fatigue degradation telemetry (e.g. PRONOSTIA / NASA IMS run-to-failure data).
        </p>
        <div className="p-2 rounded bg-navy-950/80 border border-violet-500/20 text-cyan-300 font-bold text-[11px]">
          STATUS: {analysis?.rul_notice || 'RUL estimation unavailable — suitable degradation data required.'}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-navy-800 bg-navy-900/60 font-mono">
          <span className="text-[10px] text-slate-400 uppercase">HEALTH DEGRADATION</span>
          <p className="text-2xl font-bold text-white mt-1">
            {analysis?.estimated_degradation_pct !== undefined ? `${analysis.estimated_degradation_pct}%` : '0%'}
          </p>
          <span className="text-[10px] text-cyan-400">Relative to baseline</span>
        </div>

        <div className="p-4 rounded-xl border border-navy-800 bg-navy-900/60 font-mono">
          <span className="text-[10px] text-slate-400 uppercase">ANOMALY STATUS</span>
          <p
            className={`text-xl font-bold mt-1 ${
              analysis?.anomaly_status === 'NORMAL' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {analysis?.anomaly_status || 'NOMINAL'}
          </p>
          <span className="text-[10px] text-slate-400">Isolation Forest Score: {analysis?.anomaly_score || 0}</span>
        </div>

        <div className="p-4 rounded-xl border border-navy-800 bg-navy-900/60 font-mono">
          <span className="text-[10px] text-slate-400 uppercase">FAULT SEVERITY</span>
          <p
            className={`text-xl font-bold mt-1 ${
              analysis?.fault_severity === 'CRITICAL'
                ? 'text-rose-400'
                : analysis?.fault_severity === 'MODERATE'
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {analysis?.fault_severity || 'NORMAL'}
          </p>
          <span className="text-[10px] text-slate-400">Mechanical Risk Level</span>
        </div>

        <div className="p-4 rounded-xl border border-navy-800 bg-navy-900/60 font-mono">
          <span className="text-[10px] text-slate-400 uppercase">INSPECTION PRIORITY</span>
          <p
            className={`text-xl font-bold mt-1 ${
              analysis?.fault_severity === 'CRITICAL'
                ? 'text-rose-400'
                : analysis?.fault_severity === 'MODERATE'
                ? 'text-amber-400'
                : 'text-cyan-400'
            }`}
          >
            {analysis?.fault_severity === 'CRITICAL'
              ? 'PRIORITY 1 (IMMEDIATE)'
              : analysis?.fault_severity === 'MODERATE'
              ? 'PRIORITY 2 (SCHEDULED)'
              : 'ROUTINE LOG'}
          </p>
          <span className="text-[10px] text-slate-400">Maintenance Dispatch</span>
        </div>
      </div>

      {/* Degradation Trend Curve */}
      <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">ESTIMATED COMPONENT DEGRADATION CURVE</h3>
            <p className="text-[11px] text-slate-400 font-mono">Statistical entropy degradation index across assessment checkpoints</p>
          </div>
          <TrendingDown className="h-4 w-4 text-cyan-400" />
        </div>

        <div className="h-64 w-full">
          {analysis?.trend_history?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analysis.trend_history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070d1a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="health_index"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  name="Health Index (%)"
                />
                <Line
                  type="monotone"
                  dataKey="vibration_rms"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  name="Vibration RMS (g)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
              No continuous degradation assessments recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Recommended Actions + Maintenance History Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommended Actions */}
        <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-3">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>ACTIONABLE MAINTENANCE PROTOCOLS</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-mono">Engineering procedures derived from current vibration signatures</p>

          <ul className="space-y-2.5 pt-2">
            {analysis?.recommended_actions?.map((act, idx) => (
              <li
                key={idx}
                className="p-3 rounded-lg bg-navy-950/70 border border-navy-800/80 text-xs text-slate-200 font-mono flex items-start gap-3"
              >
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold">
                  {idx + 1}
                </span>
                <span>{act}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Maintenance Event Log */}
        <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-3">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span>MAINTENANCE EVENT LOGS</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-mono">Logged maintenance flags and work orders</p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {history.length ? (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-navy-950/60 border border-navy-800 text-xs font-mono space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{item.fault_detected}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-semibold ${
                        item.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{item.recommended_action}</p>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-navy-800/60">
                    <span>Priority {item.action_priority}</span>
                    <span>{item.timestamp.replace('T', ' ').substring(0, 19)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                No active maintenance logs. All systems nominal.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
