import {
  DashboardSummary,
  DigitalTwinState,
  DatasetItem,
  DatasetDetail,
  PredictionResult,
  SimulationResult,
  MaintenanceAnalysis,
  MaintenanceLogItem,
  ModelPerformanceResponse,
  MaintenanceReport,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
    });

    if (!res.ok) {
      let errorDetail = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) errorDetail = errorJson.detail;
      } catch (_) {}
      throw new Error(errorDetail);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // System Health
  getHealth: () => fetchJSON<{ status: string; version: string; project: string; models_loaded: boolean }>('/health'),

  // Dashboard
  getDashboardSummary: () => fetchJSON<DashboardSummary>('/dashboard/summary'),

  // Digital Twin
  getDigitalTwinState: () => fetchJSON<DigitalTwinState>('/digital-twin/state'),

  // Datasets
  getDatasets: () => fetchJSON<DatasetItem[]>('/datasets'),
  getDatasetDetail: (id: number) => fetchJSON<DatasetDetail>(`/datasets/${id}`),
  deleteDataset: (id: number) =>
    fetchJSON<{ status: string; message: string }>(`/datasets/${id}`, {
      method: 'DELETE',
    }),
  uploadDataset: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchJSON<{ success: boolean; message: string; dataset_id: number }>('/datasets/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Diagnosis
  predictFault: (req: {
    source_type: string;
    dataset_id?: number;
    sample_index?: number;
    signal_data?: number[];
    sampling_rate_hz?: number;
    load_hp?: number;
    model_name?: string;
  }) =>
    fetchJSON<PredictionResult>('/diagnosis/predict', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  analyzeSignal: (req: { signal: number[]; sampling_rate_hz?: number; include_spectrogram?: boolean }) =>
    fetchJSON<any>('/diagnosis/analyze-signal', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  getDiagnosisHistory: (limit: number = 30) =>
    fetchJSON<any[]>(`/diagnosis/history?limit=${limit}`),

  // Simulation
  startSimulation: (config: {
    fault_type: string;
    rpm: number;
    load_hp: number;
    duration_seconds: number;
    sampling_rate_hz: number;
    noise_level: number;
    amplitude_scaling: number;
  }) =>
    fetchJSON<SimulationResult>('/simulation/start', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  getSimulationStatus: () => fetchJSON<any>('/simulation/status'),

  // Maintenance
  analyzeMaintenance: () =>
    fetchJSON<MaintenanceAnalysis>('/maintenance/analyze', {
      method: 'POST',
    }),

  getMaintenanceHistory: () => fetchJSON<MaintenanceLogItem[]>('/maintenance/history'),

  // Models
  getModelsPerformance: () => fetchJSON<ModelPerformanceResponse>('/models/performance'),
  triggerTraining: () =>
    fetchJSON<{ success: boolean; message: string; performance: ModelPerformanceResponse }>('/models/train', {
      method: 'POST',
    }),

  // Maintenance Reports
  getReports: () => fetchJSON<MaintenanceReport[]>('/reports'),
  getReportById: (id: number) => fetchJSON<MaintenanceReport>(`/reports/${id}`),
  generateReport: (req: {
    title?: string;
    technician_name?: string;
    engineer_notes?: string;
    diagnosis_id?: number;
  }) =>
    fetchJSON<MaintenanceReport>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  deleteReport: (id: number) =>
    fetchJSON<{ status: string; message: string }>(`/reports/${id}`, {
      method: 'DELETE',
    }),
};
