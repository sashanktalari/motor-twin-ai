import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { MaintenanceReport } from '../types';
import {
  FileText,
  Printer,
  PlusCircle,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Calendar,
  User,
  Cpu,
  Activity,
  Layers,
  Wrench,
  Clock,
  RefreshCw,
  Award
} from 'lucide-react';

export const MaintenanceReportsPage: React.FC = () => {
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<MaintenanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for generating custom report
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('Routine Motor Vibration & Condition Inspection Report');
  const [technicianName, setTechnicianName] = useState('Staff Reliability Engineer');
  const [engineerNotes, setEngineerNotes] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getReports();
      setReports(data);
      if (data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
      } else if (data.length === 0) {
        setSelectedReport(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch maintenance reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const newRep = await api.generateReport({
        title: reportTitle,
        technician_name: technicianName,
        engineer_notes: engineerNotes.trim() ? engineerNotes : undefined,
      });
      setReports([newRep, ...reports]);
      setSelectedReport(newRep);
      setShowGenerateModal(false);
      setEngineerNotes('');
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async (id: number, refCode: string) => {
    if (!window.confirm(`Are you sure you want to delete report ${refCode}?`)) return;
    try {
      await api.deleteReport(id);
      const updated = reports.filter(r => r.id !== id);
      setReports(updated);
      if (selectedReport?.id === id) {
        setSelectedReport(updated.length > 0 ? updated[0] : null);
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">CRITICAL</span>;
      case 'MODERATE':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">MODERATE</span>;
      case 'LOW':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40">LOW</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">NORMAL</span>;
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'IMMEDIATE':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">Immediate</span>;
      case 'SCHEDULED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">Scheduled</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-700 text-slate-300 border border-slate-600 uppercase">Routine</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-cyan-400" />
            Maintenance Reports & ISO 10816 Audit Logs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Engineering compliance sheets, vibration severity classifications, and component remediation work orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            disabled={!selectedReport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            Print Report
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-md transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Generate Audit Report
          </button>
        </div>
      </div>

      {/* Main Grid: Report View & Archive List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Report Sheet */}
        <div className="lg:col-span-8 space-y-6">
          {loading ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Loading maintenance archive...</p>
            </div>
          ) : selectedReport ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl print:bg-white print:text-black print:border-none print:shadow-none">
              {/* Report Header Band */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 border-b border-slate-800 print:bg-none print:border-b-2 print:border-black">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400 print:text-blue-600">
                        {selectedReport.report_reference}
                      </span>
                      <span className="text-xs text-slate-500">|</span>
                      <span className="text-xs text-slate-400 print:text-slate-600 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(selectedReport.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-100 print:text-black">
                      {selectedReport.title}
                    </h2>
                    <p className="text-xs text-slate-400 print:text-slate-600 mt-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Audited by: <span className="text-slate-200 font-medium print:text-black">{selectedReport.technician_name}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="inline-block p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-right print:border print:border-black">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Health Score</div>
                      <div className={`text-2xl font-bold ${
                        selectedReport.health_score >= 80 ? 'text-emerald-400 print:text-emerald-700' :
                        selectedReport.health_score >= 50 ? 'text-amber-400 print:text-amber-700' : 'text-rose-400 print:text-rose-700'
                      }`}>
                        {selectedReport.health_score}%
                      </div>
                      <div className="mt-1">{getSeverityBadge(selectedReport.severity)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specification & Testbed Overview */}
              <div className="p-6 border-b border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 print:bg-none">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-cyan-400" /> Motor Specification
                  </div>
                  <div className="text-sm font-medium text-slate-200 print:text-black">{selectedReport.motor_spec}</div>
                  <div className="text-xs text-slate-400">Class F Insulation, NEMA Design B, Continuous Duty</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-cyan-400" /> Operating Condition
                  </div>
                  <div className="text-sm font-medium text-slate-200 print:text-black">{selectedReport.operating_condition}</div>
                  <div className="text-xs text-slate-400">Baseline Synchronous Speed: 1800 RPM</div>
                </div>
              </div>

              {/* Vibration Severity & ISO 10816 Zone */}
              <div className="p-6 border-b border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2 print:text-black">
                    <Award className="w-4 h-4 text-amber-400" />
                    ISO 10816-1 Vibration Severity Classification
                  </h3>
                </div>

                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 print:bg-none print:border-black space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Evaluated Zone:</span>
                    <span className="text-xs font-bold text-amber-300 print:text-amber-900">{selectedReport.iso_zone}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800 print:border-black">
                      <div className="text-[10px] text-slate-500 uppercase">RMS Vibration</div>
                      <div className="text-sm font-mono font-bold text-slate-200 print:text-black">{selectedReport.vibration_rms.toFixed(4)} g</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800 print:border-black">
                      <div className="text-[10px] text-slate-500 uppercase">Peak Amplitude</div>
                      <div className="text-sm font-mono font-bold text-slate-200 print:text-black">{selectedReport.vibration_peak.toFixed(4)} g</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800 print:border-black">
                      <div className="text-[10px] text-slate-500 uppercase">Diagnosed Fault</div>
                      <div className="text-sm font-bold text-cyan-400 print:text-blue-700">{selectedReport.diagnosed_fault}</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800 print:border-black">
                      <div className="text-[10px] text-slate-500 uppercase">Model Confidence</div>
                      <div className="text-sm font-mono font-bold text-slate-200 print:text-black">{(selectedReport.fault_confidence * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Component Condition Assessment */}
              {selectedReport.component_assessments && (
                <div className="p-6 border-b border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2 print:text-black">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Subsystem Condition Matrix
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(selectedReport.component_assessments).map(([comp, status]) => (
                      <div key={comp} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between print:border-black">
                        <span className="text-xs text-slate-300 font-medium capitalize print:text-black">
                          {comp.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          status === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          status === 'MONITORED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remediation Work Orders / Action Checklist */}
              <div className="p-6 border-b border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2 print:text-black">
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  Prescriptive Action Items & Work Orders
                </h3>
                <div className="space-y-2.5">
                  {selectedReport.recommended_actions.map((act, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-start gap-3 print:border-black">
                      <div className="mt-0.5">{getPriorityBadge(act.priority)}</div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-slate-200 print:text-black">
                          {act.target_component}
                        </div>
                        <div className="text-xs text-slate-400 print:text-slate-700 mt-0.5">
                          {act.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engineer Notes */}
              {selectedReport.engineer_notes && (
                <div className="p-6 border-b border-slate-800 space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Reliability Engineer Evaluation Remarks
                  </h3>
                  <p className="text-xs text-slate-300 italic bg-slate-950 p-3 rounded border border-slate-800 print:bg-none print:text-black print:border-black">
                    "{selectedReport.engineer_notes}"
                  </p>
                </div>
              )}

              {/* RUL & Academic Disclaimer Footer */}
              <div className="p-6 bg-slate-950/80 text-[11px] text-slate-500 space-y-1.5 print:bg-none print:text-slate-600">
                <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  Academic Validation & Standards Compliance Notice:
                </div>
                <p>
                  {selectedReport.rul_statement}
                </p>
                <p className="text-[10px] text-slate-600 print:text-slate-500">
                  Certification conforms to IEEE & ISO vibration velocity parameters for Class II rigid-mount induction machines. MOTOR TWIN AI platform.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-4">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-medium text-slate-200">No Reports Archived</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No maintenance audit reports have been compiled yet. Click the button below to generate an official ISO 10816 assessment report from the current telemetry.
              </p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
              >
                Generate First Report
              </button>
            </div>
          )}
        </div>

        {/* Sidebar: Historical Reports Archive */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Audit Archive ({reports.length})
              </h3>
              <button
                onClick={loadReports}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors p-1"
                title="Refresh List"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {reports.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Archive empty</p>
            ) : (
              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {reports.map((rep) => {
                  const isSelected = selectedReport?.id === rep.id;
                  return (
                    <div
                      key={rep.id}
                      onClick={() => setSelectedReport(rep)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono font-bold text-cyan-400">
                          {rep.report_reference}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReport(rep.id, rep.report_reference);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                          title="Delete report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-xs font-semibold text-slate-200 line-clamp-1">
                        {rep.title}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                        <span>{rep.diagnosed_fault}</span>
                        <span className={`font-bold ${
                          rep.health_score >= 80 ? 'text-emerald-400' :
                          rep.health_score >= 50 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {rep.health_score}% Health
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 mt-1">
                        {new Date(rep.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Generate Maintenance Audit Report
              </h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Report Document Title
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Auditor / Technician Name
                </label>
                <input
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Field Observations & Diagnostic Remarks
                </label>
                <textarea
                  rows={3}
                  value={engineerNotes}
                  onChange={(e) => setEngineerNotes(e.target.value)}
                  placeholder="Optional field notes: e.g., Ambient temperature 24°C, slight radial vibration audible on drive end..."
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400">
                The report will automatically synthesize recent telemetry, FFT vibration peaks, ISO 10816 velocity severity, and ML bearing fault classification into a numbered engineering document.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white transition-all disabled:opacity-50"
                >
                  {generating ? 'Compiling Report...' : 'Compile & Archive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
