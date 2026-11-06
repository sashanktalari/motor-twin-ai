import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Database,
  Cpu,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<any | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const start = performance.now();
      const res = await api.getHealth();
      const end = performance.now();
      setLatency(Math.round(end - start));
      setHealth(res);
    } catch (err: any) {
      setError(err.message || 'Cannot reach FastAPI backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="p-4 rounded-xl border border-cyan-500/20 bg-navy-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-cyan-400" />
            <span>PLATFORM SETTINGS & SYSTEM INFRASTRUCTURE</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Backend API connectivity, database persistence, and motor nameplate configuration
          </p>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-700 text-xs font-mono text-cyan-300 transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Test Connection</span>
        </button>
      </div>

      {/* Backend API Health Status Card */}
      <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-4 font-mono text-xs">
        <h3 className="font-bold text-white tracking-wider uppercase flex items-center gap-2">
          <Server className="h-4 w-4 text-cyan-400" />
          <span>FASTAPI BACKEND CONNECTION</span>
        </h3>

        {error ? (
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
              <span className="text-[10px] text-slate-400 block">SERVER STATUS</span>
              <span className="text-emerald-400 font-bold text-sm flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {health?.status?.toUpperCase() || 'OPERATIONAL'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
              <span className="text-[10px] text-slate-400 block">API LATENCY</span>
              <span className="text-white font-bold text-sm mt-0.5">{latency !== null ? `${latency} ms` : '—'}</span>
            </div>

            <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
              <span className="text-[10px] text-slate-400 block">ML MODELS</span>
              <span className="text-cyan-300 font-bold text-sm mt-0.5">
                {health?.models_loaded ? 'LOADED & ACTIVE' : 'PENDING'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
              <span className="text-[10px] text-slate-400 block">DATABASE</span>
              <span className="text-emerald-400 font-bold text-sm mt-0.5">
                {health?.database_connected ? 'SQLITE ATTACHED' : 'DISCONNECTED'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Project Metadata Card */}
      <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-3 font-mono text-xs">
        <h3 className="font-bold text-white tracking-wider uppercase flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span>PROJECT METADATA & ACADEMIC ATTRIBUTION</span>
        </h3>

        <div className="space-y-2 text-slate-300">
          <div className="flex justify-between border-b border-navy-800 pb-1.5">
            <span className="text-slate-400">Project Brand:</span>
            <span className="text-white font-bold">MOTOR TWIN AI</span>
          </div>
          <div className="flex justify-between border-b border-navy-800 pb-1.5">
            <span className="text-slate-400">Official Title:</span>
            <span className="text-cyan-300 text-right max-w-lg">
              Design and Development of a Predictive Digital Twin for Electrical Motor Fault Diagnosis and Maintenance
            </span>
          </div>
          <div className="flex justify-between border-b border-navy-800 pb-1.5">
            <span className="text-slate-400">Target Domain:</span>
            <span className="text-white">Electrical & Electronic Engineering (EEE) + AI/ML</span>
          </div>
          <div className="flex justify-between border-b border-navy-800 pb-1.5">
            <span className="text-slate-400">Benchmark Dataset:</span>
            <span className="text-white">Case Western Reserve University (CWRU) Bearing Data Center</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">FastAPI Swagger Docs:</span>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>http://localhost:8000/docs</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
