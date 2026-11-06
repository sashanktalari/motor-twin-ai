import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { ModelPerformanceResponse, ModelMetricSet } from '../types';

export const ModelPerformancePage: React.FC = () => {
  const [perfData, setPerfData] = useState<ModelPerformanceResponse | null>(null);
  const [selectedModelName, setSelectedModelName] = useState<string>('random_forest');
  const [training, setTraining] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPerformance();
  }, []);

  const loadPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getModelsPerformance();
      setPerfData(data);
      if (data.models?.length > 0) {
        setSelectedModelName(data.best_model || data.models[0].model_name);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve model performance benchmarks.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    try {
      setTraining(true);
      setError(null);
      const res = await api.triggerTraining();
      setPerfData(res.performance);
    } catch (err: any) {
      setError(err.message || 'Model training pipeline failed.');
    } finally {
      setTraining(false);
    }
  };

  const activeModel: ModelMetricSet | undefined = perfData?.models?.find(
    (m) => m.model_name === selectedModelName
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl border border-cyan-500/20 bg-navy-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            <span>MACHINE LEARNING BENCHMARK EVALUATION & COMPARISON</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Empirical validation results on completely unseen CWRU test splits (strictly leak-free)
          </p>
        </div>
        <button
          onClick={handleRetrain}
          disabled={training}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-mono text-cyan-300 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${training ? 'animate-spin' : ''}`} />
          <span>{training ? 'TRAINING PIPELINE RUNNING...' : 'RETRAIN & EVALUATE'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-200 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Untrained Empty State */}
      {perfData && !perfData.is_trained && (
        <div className="p-8 rounded-xl border border-navy-800 bg-navy-900/60 text-center space-y-4">
          <Info className="h-10 w-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white font-mono">MODEL NOT TRAINED YET</h3>
          <p className="text-xs text-slate-400 font-mono max-w-md mx-auto">
            {perfData.message || 'Model artifacts are not currently present on disk. Trigger the training pipeline to generate empirical validation benchmarks.'}
          </p>
          <button
            onClick={handleRetrain}
            disabled={training}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold font-mono text-xs transition-all shadow-glow-cyan"
          >
            {training ? 'Training...' : 'Train Models Now'}
          </button>
        </div>
      )}

      {/* Trained Benchmark Results View */}
      {perfData && perfData.is_trained && (
        <div className="space-y-6">
          {/* Model Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {perfData.models.map((m) => {
              const isSelected = m.model_name === selectedModelName;
              const isBest = m.model_name === perfData.best_model;
              return (
                <div
                  key={m.model_name}
                  onClick={() => setSelectedModelName(m.model_name)}
                  className={`p-5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-cyan-400 bg-navy-900/90 shadow-glow-cyan'
                      : 'border-navy-800 bg-navy-900/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                        <span>{m.display_name}</span>
                        {isBest && (
                          <span className="flex items-center gap-1 text-[10px] font-sans px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <Award className="h-3 w-3" />
                            <span>BEST PERFORMER</span>
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Train Time: {m.training_duration_seconds}s &bull; Test Set: {m.test_samples} Windows
                      </p>
                    </div>
                    <span className="text-xl font-bold font-mono text-cyan-300">
                      {(m.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-3 border-t border-navy-800">
                    <div className="p-2 rounded bg-navy-950/60">
                      <span className="text-[10px] text-slate-400 block">PRECISION</span>
                      <span className="font-bold text-white">{(m.precision_macro * 100).toFixed(1)}%</span>
                    </div>
                    <div className="p-2 rounded bg-navy-950/60">
                      <span className="text-[10px] text-slate-400 block">RECALL</span>
                      <span className="font-bold text-white">{(m.recall_macro * 100).toFixed(1)}%</span>
                    </div>
                    <div className="p-2 rounded bg-navy-950/60">
                      <span className="text-[10px] text-slate-400 block">F1-SCORE</span>
                      <span className="font-bold text-emerald-400">{(m.f1_macro * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Validation Methodology Badge */}
          <div className="p-4 rounded-xl border border-navy-800 bg-navy-900/40 text-xs font-mono space-y-1">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
              VALIDATION METHODOLOGY & DATA LEAKAGE PREVENTION
            </span>
            <p className="text-slate-300 text-[11px]">
              {activeModel?.validation_split_methodology}
            </p>
            <p className="text-slate-400 text-[10px]">
              * Unlike unscientific approaches that randomly split overlapping window slices, each original CWRU continuous time recording was split chronologically before feature extraction. Zero test data was observed during model training.
            </p>
          </div>

          {/* Detailed Classification Report Table */}
          {activeModel && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Classification Report per Class */}
              <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-3">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  CLASS-WISE CLASSIFICATION REPORT: {activeModel.display_name}
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-navy-800 text-slate-400">
                        <th className="pb-2 font-semibold">Fault Class</th>
                        <th className="pb-2 font-semibold">Precision</th>
                        <th className="pb-2 font-semibold">Recall</th>
                        <th className="pb-2 font-semibold">F1-Score</th>
                        <th className="pb-2 font-semibold">Support</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-800/60 text-slate-300">
                      {Object.entries(activeModel.classification_report).map(([cName, metrics]) => (
                        <tr key={cName}>
                          <td className="py-2.5 font-bold text-white">{cName}</td>
                          <td className="py-2.5 text-cyan-300">{(metrics.precision * 100).toFixed(1)}%</td>
                          <td className="py-2.5 text-cyan-300">{(metrics.recall * 100).toFixed(1)}%</td>
                          <td className="py-2.5 text-emerald-400 font-bold">{(metrics.f1_score * 100).toFixed(1)}%</td>
                          <td className="py-2.5 text-slate-400">{metrics.support}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Confusion Matrix Visual Heatmap */}
              <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-3">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  CONFUSION MATRIX (UNSEEN TEST SAMPLES)
                </h4>

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-center text-xs font-mono">
                    <thead>
                      <tr>
                        <th className="pb-2 text-left text-[10px] text-slate-400">Actual \ Predicted</th>
                        {activeModel.classes.map((c) => (
                          <th key={c} className="pb-2 text-[10px] text-cyan-300 font-semibold truncate max-w-[80px]">
                            {c.replace(' Fault', '')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeModel.confusion_matrix.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="py-2 text-left text-[11px] text-slate-300 font-bold">
                            {activeModel.classes[rIdx].replace(' Fault', '')}
                          </td>
                          {row.map((val, cIdx) => {
                            const isDiagonal = rIdx === cIdx;
                            return (
                              <td key={cIdx} className="p-1.5">
                                <div
                                  className={`py-2 px-3 rounded font-bold transition-all ${
                                    isDiagonal && val > 0
                                      ? 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-300'
                                      : val > 0
                                      ? 'bg-rose-500/25 border border-rose-500/50 text-rose-300'
                                      : 'bg-navy-950/60 text-slate-600'
                                  }`}
                                >
                                  {val}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
