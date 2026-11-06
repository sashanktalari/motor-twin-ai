import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Play,
  Database,
  Cpu,
  BarChart2,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { DatasetItem, PredictionResult } from '../types';

export const FaultDiagnosisPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('random_forest');
  const [sampleIndex, setSampleIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [diagnosing, setDiagnosing] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const list = await api.getDatasets();
      setDatasets(list);
      if (list.length > 0) {
        setSelectedDatasetId(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dataset catalogue.');
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnose = async () => {
    if (!selectedDatasetId) return;
    try {
      setDiagnosing(true);
      setError(null);
      const res = await api.predictFault({
        source_type: 'DATASET',
        dataset_id: selectedDatasetId,
        sample_index: sampleIndex,
        model_name: selectedModel,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Diagnostic inference failed.');
    } finally {
      setDiagnosing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-xl border border-cyan-500/20 bg-navy-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-cyan-400" />
            <span>REAL-TIME MOTOR FAULT DIAGNOSIS ENGINE</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Empirical multi-class classification using calibrated statistical & FFT feature vectors
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Case Western Reserve University (CWRU) Calibrated</span>
        </div>
      </div>

      {/* Control Card: Dataset Selection + Model Choice + Trigger */}
      <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md">
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-cyan-400" />
          <span>INPUT EVALUATION PARAMETERS</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Dataset Selector */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Select Motor Vibration Record</label>
            <select
              value={selectedDatasetId || ''}
              onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.fault_class}) &bull; {ds.file_type}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Diagnostic Algorithm</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
            >
              <option value="random_forest">Random Forest Classifier (100 Trees)</option>
              <option value="svm">Support Vector Machine (RBF Kernel)</option>
              <option value="knn">K-Nearest Neighbors (k=5 Distance-Weighted)</option>
            </select>
          </div>

          {/* Sample Window Offset */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Window Sample Offset: <span className="text-cyan-400 font-bold">{sampleIndex}</span>
            </label>
            <input
              type="range"
              min="0"
              max="40000"
              step="1024"
              value={sampleIndex}
              onChange={(e) => setSampleIndex(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleDiagnose}
            disabled={diagnosing || !selectedDatasetId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all shadow-glow-cyan disabled:opacity-50"
          >
            <Play className={`h-4 w-4 ${diagnosing ? 'animate-spin' : ''}`} />
            <span>{diagnosing ? 'EXTRACTING & INFERRING...' : 'RUN FAULT DIAGNOSIS'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-200 text-xs font-mono flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-cyan-500/30 bg-navy-900/80 backdrop-blur-md shadow-glow-cyan space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-navy-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  CLASSIFICATION INFERENCE RESULT
                </span>
                <h3 className="text-2xl font-bold text-white font-mono flex items-center gap-3 mt-1">
                  <span>{result.predicted_fault}</span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-sans font-semibold ${
                      result.predicted_fault === 'Normal'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {result.severity} SEVERITY
                  </span>
                </h3>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] text-slate-400 uppercase">MODEL CONFIDENCE</span>
                <p className="text-2xl font-bold text-cyan-300">{(result.confidence * 100).toFixed(1)}%</p>
              </div>
            </div>

            {/* Probability Bars */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-slate-400 font-semibold">CLASS PROBABILITY DISTRIBUTION</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {Object.entries(result.probabilities).map(([cName, prob]) => {
                  const pct = (prob * 100).toFixed(1);
                  const isTop = cName === result.predicted_fault;
                  return (
                    <div
                      key={cName}
                      className={`p-3 rounded-lg border ${
                        isTop ? 'border-cyan-500/50 bg-cyan-950/20' : 'border-navy-800 bg-navy-950/40'
                      }`}
                    >
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-slate-300 truncate">{cName}</span>
                        <span className={isTop ? 'text-cyan-300 font-bold' : 'text-slate-400'}>{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-navy-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isTop ? 'bg-cyan-400' : 'bg-slate-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Secondary Diagnostics (Health & Anomaly) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-navy-800 text-xs font-mono">
              <div className="p-3 rounded-lg bg-navy-950/50 border border-navy-800">
                <span className="text-slate-400 text-[10px]">HEALTH SCORE INDEX</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">{result.health_score}%</p>
                <span className="text-[10px] text-slate-500">ISO 10816 Mechanical Standard</span>
              </div>
              <div className="p-3 rounded-lg bg-navy-950/50 border border-navy-800">
                <span className="text-slate-400 text-[10px]">ISOLATION FOREST ANOMALY</span>
                <p
                  className={`text-lg font-bold mt-0.5 ${
                    result.anomaly_detected ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {result.anomaly_detected ? 'OUTLIER / ANOMALY' : 'INLIER (NORMAL)'}
                </p>
                <span className="text-[10px] text-slate-500">Score: {result.anomaly_score}</span>
              </div>
              <div className="p-3 rounded-lg bg-navy-950/50 border border-navy-800">
                <span className="text-slate-400 text-[10px]">EVALUATED MODEL</span>
                <p className="text-lg font-bold text-cyan-300 mt-0.5 uppercase">{result.model_used.replace('_', ' ')}</p>
                <span className="text-[10px] text-slate-500">2048 Segmented Samples</span>
              </div>
            </div>
          </div>

          {/* 16 Extracted Feature Metrics Table */}
          <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-3">
            <h4 className="text-xs font-mono font-bold text-white tracking-wider uppercase flex items-center justify-between">
              <span>EXTRACTED TIME & FREQUENCY DOMAIN VIBRATION FEATURES</span>
              <span className="text-cyan-400 font-normal">16 Canonical Descriptors</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              {result.features &&
                Object.entries(result.features).map(([featKey, val]) => (
                  <div key={featKey} className="p-2.5 rounded bg-navy-950/60 border border-navy-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      {featKey.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-100 font-bold text-sm">
                      {typeof val === 'number' ? val.toFixed(4) : String(val)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
