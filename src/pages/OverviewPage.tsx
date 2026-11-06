import React, { useEffect, useState } from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Gauge,
  Zap,
  RotateCw,
  Layers,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import { StatCard } from '../components/common/StatCard';

interface OverviewPageProps {
  onNavigate: (tabId: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard telemetry.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span className="font-mono text-xs text-slate-400">Loading Telemetry & Diagnostic Streams...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-500/30 bg-red-950/20 text-red-200">
        <div className="flex items-center gap-3 mb-2 font-bold">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <span>Dashboard Synchronization Error</span>
        </div>
        <p className="text-xs text-red-300/80 mb-4">{error}</p>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-xs text-white hover:bg-red-500/30 transition-all font-mono"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const faultDistData = summary?.fault_distribution
    ? Object.entries(summary.fault_distribution).map(([name, count]) => ({
        name,
        count,
      }))
    : [];

  const historyTrendData = summary?.recent_history?.length
    ? [...summary.recent_history].reverse().map((item, idx) => ({
        index: `#${idx + 1}`,
        time: item.timestamp.split('T')[1]?.substring(0, 8) || '',
        health: item.health_score,
        rms: item.rms_vibration || 0,
        condition: item.predicted_fault,
      }))
    : [];

  const COLORS = ['#22d3ee', '#f59e0b', '#ec4899', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Top Banner Status */}
      <div className="p-4 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-navy-900/90 via-navy-850/80 to-navy-900/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              SYSTEM STATUS: {summary?.has_data ? summary.health_status_label : 'READY FOR ASSESSMENT'}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Source: <span className="text-cyan-300">{summary?.selected_dataset || 'No Dataset Active'}</span> &bull;{' '}
              {summary?.status_message}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('diagnosis')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-xs font-medium text-cyan-300 hover:bg-cyan-500/30 transition-all"
          >
            <span>Run Diagnosis</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onNavigate('digital-twin')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-800 border border-navy-700 text-xs font-medium text-slate-300 hover:text-white transition-all"
          >
            <span>Open 3D Twin</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Health Score"
          value={summary?.overall_health_score !== null ? `${summary?.overall_health_score}%` : null}
          icon={Gauge}
          badge={summary?.health_status_label || 'AWAITING'}
          badgeColor={
            summary?.overall_health_score && summary.overall_health_score >= 85
              ? 'emerald'
              : summary?.overall_health_score && summary.overall_health_score >= 60
              ? 'amber'
              : 'rose'
          }
          subtitle="Calibrated ISO 10816 Index"
          glow={Boolean(summary?.overall_health_score && summary.overall_health_score >= 85)}
        />

        <StatCard
          title="Operating Condition"
          value={summary?.current_operating_condition || 'Standby'}
          icon={ShieldCheck}
          badge={summary?.predicted_fault ? 'DIAGNOSED' : 'STANDBY'}
          badgeColor={summary?.predicted_fault === 'Normal' ? 'emerald' : 'amber'}
          subtitle={`Probability: ${
            summary?.fault_probability ? (summary.fault_probability * 100).toFixed(1) + '%' : '—'
          }`}
        />

        <StatCard
          title="Vibration RMS"
          value={summary?.vibration_rms !== null ? summary?.vibration_rms.toFixed(4) : null}
          unit="g"
          icon={TrendingUp}
          badge={summary?.vibration_rms && summary.vibration_rms > 0.3 ? 'ELEVATED' : 'NOMINAL'}
          badgeColor={summary?.vibration_rms && summary.vibration_rms > 0.3 ? 'rose' : 'cyan'}
          subtitle={`Peak: ${summary?.peak_vibration ? summary.peak_vibration.toFixed(4) + ' g' : '—'}`}
        />

        <StatCard
          title="Shaft Rotational Speed"
          value={summary?.rotational_speed_rpm !== null ? summary?.rotational_speed_rpm : null}
          unit="RPM"
          icon={RotateCw}
          badge="1X SYNC"
          badgeColor="cyan"
          subtitle="Reliance Electric 2HP Testbed"
        />
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historical Health Trend Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">HEALTH & VIBRATION TREND</h3>
              <p className="text-[11px] text-slate-400 font-mono">Sequential diagnostic telemetry points</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {historyTrendData.length} ASSESSMENTS
            </span>
          </div>

          <div className="h-64 w-full">
            {historyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="index" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#070d1a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="health"
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    dot={{ fill: '#00e5ff', r: 3 }}
                    name="Health Score (%)"
                  />
                  <Line
                    type="monotone"
                    dataKey="rms"
                    stroke="#a855f7"
                    strokeWidth={1.5}
                    dot={false}
                    name="RMS (g x100)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 font-mono text-xs">
                <Clock className="h-6 w-6 text-slate-600" />
                <span>No diagnostic sessions executed yet. Run an analysis in Fault Diagnosis.</span>
              </div>
            )}
          </div>
        </div>

        {/* Fault Distribution Chart */}
        <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">FAULT DISTRIBUTION</h3>
              <p className="text-[11px] text-slate-400 font-mono">Classification tally</p>
            </div>
            <Layers className="h-4 w-4 text-cyan-400" />
          </div>

          <div className="h-64 w-full flex-1">
            {summary?.total_assessments ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={faultDistData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#070d1a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {faultDistData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 font-mono text-xs">
                <span>0 Classifications Logged</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent History Table */}
      <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">RECENT DIAGNOSIS ASSESSMENTS</h3>
            <p className="text-[11px] text-slate-400 font-mono">Logged assessments stored in persistent SQLite repository</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Total Records: {summary?.total_assessments || 0}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-navy-800 text-slate-400">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Source</th>
                <th className="pb-3 font-semibold">Classification</th>
                <th className="pb-3 font-semibold">Confidence</th>
                <th className="pb-3 font-semibold">Health Score</th>
                <th className="pb-3 font-semibold">Vibration RMS</th>
                <th className="pb-3 font-semibold">Speed (RPM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 text-slate-300">
              {summary?.recent_history?.length ? (
                summary.recent_history.map((row) => (
                  <tr key={row.id} className="hover:bg-navy-800/30 transition-colors">
                    <td className="py-2.5 text-slate-400">{row.timestamp.replace('T', ' ').substring(0, 19)}</td>
                    <td className="py-2.5 text-cyan-300 font-medium">{row.source_type}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.predicted_fault === 'Normal'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {row.predicted_fault}
                      </span>
                    </td>
                    <td className="py-2.5">{(row.confidence * 100).toFixed(1)}%</td>
                    <td className="py-2.5 font-bold text-white">{row.health_score}%</td>
                    <td className="py-2.5 text-slate-300">{row.rms_vibration ? row.rms_vibration.toFixed(4) : '—'} g</td>
                    <td className="py-2.5">{row.rotational_speed_rpm || 1797}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 font-mono">
                    No diagnosis records found. Run an evaluation from Fault Diagnosis or Motor Simulation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
