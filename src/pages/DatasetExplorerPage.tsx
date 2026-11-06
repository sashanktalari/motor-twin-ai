import React, { useEffect, useState, useRef } from 'react';
import {
  Database,
  Upload,
  Download,
  FileCode,
  CheckCircle,
  AlertTriangle,
  Play,
  Layers,
  Search,
  Trash2,
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
import { DatasetItem, DatasetDetail } from '../types';

export const DatasetExplorerPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DatasetDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await api.getDatasets();
      setDatasets(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
        fetchDetail(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dataset catalogue.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: number) => {
    try {
      setError(null);
      const res = await api.getDatasetDetail(id);
      setDetail(res);
    } catch (err: any) {
      setError(err.message || 'Failed to inspect dataset details.');
    }
  };

  const handleSelect = (id: number) => {
    setSelectedId(id);
    fetchDetail(id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'mat' && ext !== 'csv') {
      setError('Unsupported file type. Only MATLAB (.mat) and CSV (.csv) files are permitted.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadSuccess(null);
      const res = await api.uploadDataset(file);
      setUploadSuccess(res.message);
      await loadDatasets();
    } catch (err: any) {
      setError(err.message || 'File ingestion failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDataset = async (id: number, name: string) => {
    if (!window.confirm(`Delete custom dataset "${name}"?`)) return;
    try {
      setError(null);
      await api.deleteDataset(id);
      const updated = datasets.filter((d) => d.id !== id);
      setDatasets(updated);
      if (selectedId === id) {
        if (updated.length > 0) {
          setSelectedId(updated[0].id);
          fetchDetail(updated[0].id);
        } else {
          setSelectedId(null);
          setDetail(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete dataset.');
    }
  };

  const downloadFeaturesJSON = () => {
    if (!detail) return;
    const blob = new Blob([JSON.stringify(detail, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${detail.filename.replace(/\.[^/.]+$/, '')}_features.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewData =
    detail?.preview_signal?.map((val, idx) => ({
      time: detail.time_axis[idx] ? `${(detail.time_axis[idx] * 1000).toFixed(1)} ms` : `${idx}`,
      amplitude: val,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl border border-cyan-500/20 bg-navy-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <span>DATASET REPOSITORY & SIGNAL EXPLORER</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Standard Case Western Reserve University (CWRU) benchmarks & uploaded custom accelerometer files
          </p>
        </div>

        {/* Upload Trigger */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".mat,.csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-mono text-cyan-300 transition-all shadow-glow-cyan disabled:opacity-50"
          >
            <Upload className={`h-3.5 w-3.5 ${uploading ? 'animate-bounce' : ''}`} />
            <span>{uploading ? 'INGESTING FILE...' : 'UPLOAD .MAT / .CSV'}</span>
          </button>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-200 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Dataset List and Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dataset Catalog Table */}
        <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-3">
          <h3 className="text-xs font-mono font-bold text-white tracking-wider uppercase">
            REGISTERED MOTOR RECORDS
          </h3>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {datasets.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`p-3 rounded-lg border cursor-pointer font-mono text-xs transition-all ${
                    isSelected
                      ? 'border-cyan-400 bg-navy-800/80 shadow-glow-cyan'
                      : 'border-navy-800 bg-navy-950/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-white truncate max-w-[170px]">{item.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-900 text-cyan-300 border border-navy-700">
                        {item.file_type}
                      </span>
                      {!item.is_benchmark && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDataset(item.id, item.name);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                          title="Delete custom dataset"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{item.fault_class}</span>
                    <span>{item.sample_count?.toLocaleString()} pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Dataset Inspection */}
        <div className="lg:col-span-2 space-y-5">
          {detail ? (
            <>
              {/* Metadata Banner */}
              <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-mono">{detail.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Filename: {detail.filename} &bull; Condition: <span className="text-cyan-300 font-semibold">{detail.fault_class}</span>
                    </p>
                  </div>
                  <button
                    onClick={downloadFeaturesJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-navy-800 hover:bg-navy-700 border border-navy-700 text-xs font-mono text-slate-200 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download JSON</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-navy-950/60 border border-navy-800">
                    <span className="text-[10px] text-slate-400">SAMPLING FREQ</span>
                    <p className="text-white font-bold mt-0.5">{detail.sampling_rate_hz?.toLocaleString()} Hz</p>
                  </div>
                  <div className="p-2.5 rounded bg-navy-950/60 border border-navy-800">
                    <span className="text-[10px] text-slate-400">DURATION</span>
                    <p className="text-white font-bold mt-0.5">{detail.duration_seconds} sec</p>
                  </div>
                  <div className="p-2.5 rounded bg-navy-950/60 border border-navy-800">
                    <span className="text-[10px] text-slate-400">TOTAL SAMPLES</span>
                    <p className="text-white font-bold mt-0.5">{detail.sample_count?.toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 rounded bg-navy-950/60 border border-navy-800">
                    <span className="text-[10px] text-slate-400">MOTOR LOAD</span>
                    <p className="text-cyan-400 font-bold mt-0.5">{detail.motor_load_hp} HP</p>
                  </div>
                </div>
              </div>

              {/* Signal Waveform Slice Preview */}
              <div className="p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md space-y-3">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  SIGNAL SLICE PREVIEW (FIRST 1,000 SAMPLES)
                </h4>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={previewData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} interval={previewData.length / 8} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
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
                        dataKey="amplitude"
                        stroke="#22d3ee"
                        strokeWidth={1.2}
                        dot={false}
                        name="Acceleration (g)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              Select a dataset to view signal telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
