import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Wrench,
  ShieldAlert,
  PlayCircle,
  BarChart3,
  LineChart,
  Database,
  FileText,
  Settings,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { OverviewPage } from './pages/OverviewPage';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import { FaultDiagnosisPage } from './pages/FaultDiagnosisPage';
import { PredictiveMaintenancePage } from './pages/PredictiveMaintenancePage';
import { MotorSimulationPage } from './pages/MotorSimulationPage';
import { SignalAnalysisPage } from './pages/SignalAnalysisPage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';
import { DatasetExplorerPage } from './pages/DatasetExplorerPage';
import { MaintenanceReportsPage } from './pages/MaintenanceReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);

  useEffect(() => {
    // Initial backend ping
    api
      .getHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    // Periodic heartbeat
    const interval = setInterval(() => {
      api
        .getHealth()
        .then(() => setBackendOnline(true))
        .catch(() => setBackendOnline(false));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity, desc: 'Health & Status Summary' },
    { id: 'digital-twin', label: 'Digital Twin', icon: Cpu, desc: '3D Virtual Motor Twin' },
    { id: 'diagnosis', label: 'Fault Diagnosis', icon: ShieldAlert, desc: 'Machine Learning Engine' },
    { id: 'maintenance', label: 'Predictive Maint.', icon: Wrench, desc: 'Degradation & Advisory' },
    { id: 'simulation', label: 'Motor Simulation', icon: PlayCircle, desc: 'Synthetic Physics Model' },
    { id: 'signals', label: 'Signal Analysis', icon: LineChart, desc: 'FFT & Spectrogram Lab' },
    { id: 'models', label: 'Model Performance', icon: BarChart3, desc: 'RF, SVM & KNN Benchmarks' },
    { id: 'datasets', label: 'Dataset Explorer', icon: Database, desc: 'CWRU & Upload Manager' },
    { id: 'reports', label: 'Maintenance Reports', icon: FileText, desc: 'ISO 10816 Audit Sheets' },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'API & Infrastructure' },
  ];

  const renderActivePage = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPage onNavigate={(tab) => setActiveTab(tab)} />;
      case 'digital-twin':
        return <DigitalTwinPage />;
      case 'diagnosis':
        return <FaultDiagnosisPage />;
      case 'maintenance':
        return <PredictiveMaintenancePage />;
      case 'simulation':
        return <MotorSimulationPage />;
      case 'signals':
        return <SignalAnalysisPage />;
      case 'models':
        return <ModelPerformancePage />;
      case 'datasets':
        return <DatasetExplorerPage />;
      case 'reports':
        return <MaintenanceReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-navy-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-navy-800 bg-navy-900/95 backdrop-blur-xl flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-navy-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-glow-cyan">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold tracking-wider text-sm text-white font-mono">MOTOR TWIN AI</h1>
              <p className="text-[9px] text-cyan-400 font-mono tracking-tight uppercase">PREDICTIVE DIGITAL TWIN</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                  active
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                <div className="truncate">
                  <div>{item.label}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Infrastructure Status */}
        <div className="p-3 border-t border-navy-800/80 text-[11px] font-mono space-y-1 bg-navy-950/40">
          <div className="flex items-center justify-between text-slate-400">
            <span>FastAPI Backend:</span>
            <span className={backendOnline ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {backendOnline ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            v1.0.0 &bull; Reliance Electric 2HP Testbed
          </div>
        </div>
      </aside>

      {/* Main Execution View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-navy-800 bg-navy-900/60 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-xs font-mono text-slate-400">
              Platform / <span className="text-cyan-300 font-semibold capitalize">{activeTab.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  backendOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
                }`}
              />
              <span className={backendOnline ? 'text-emerald-400' : 'text-rose-400'}>
                {backendOnline ? 'API Synced (8000)' : 'API Offline'}
              </span>
            </div>
            <a
              href="http://localhost:8000/api/docs"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-700 border border-navy-700 text-[11px] font-mono text-cyan-300 transition-all"
            >
              <span>Swagger API</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-2">
            <div className="mb-4">
              <h1 className="text-lg font-bold text-white tracking-wide font-mono">
                {navItems.find((n) => n.id === activeTab)?.label.toUpperCase()}
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Design and Development of a Predictive Digital Twin for Electrical Motor Fault Diagnosis and Maintenance
              </p>
            </div>

            {renderActivePage()}
          </div>
        </main>
      </div>
    </div>
  );
}
