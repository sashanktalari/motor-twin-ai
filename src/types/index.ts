export interface MotorTelemetry {
  rpm: number;
  load_hp: number;
  voltage_v: number;
  current_a: number;
  frequency_hz: number;
  power_factor: number;
  vibration_rms_g: number;
  peak_vibration_g: number;
  temperature_c: number;
  health_score: number;
  status: 'NORMAL' | 'WARNING' | 'FAULT';
  fault_type: string;
  fault_severity: 'NONE' | 'LOW' | 'MODERATE' | 'CRITICAL';
  data_source: string;
  last_updated: string;
}

export interface DigitalTwinState {
  telemetry: MotorTelemetry;
  component_health: Record<string, number>;
  operating_mode: string;
  disclaimer: string;
}

export interface VibrationFeatures {
  mean: number;
  std: number;
  variance: number;
  rms: number;
  peak_to_peak?: number;
  skewness: number;
  kurtosis: number;
  peak: number;
  crest_factor: number;
  shape_factor: number;
  impulse_factor: number;
  dominant_frequency: number;
  spectral_centroid: number;
  spectral_energy: number;
  spectral_std: number;
  spectral_skewness: number;
  spectral_kurtosis: number;
}

export interface DiagnosisRecordItem {
  id: number;
  timestamp: string;
  source_type: string;
  source_reference?: string;
  predicted_fault: string;
  confidence: number;
  health_score: number;
  rms_vibration?: number;
  peak_vibration?: number;
  dominant_frequency?: number;
  operating_load_hp: number;
  rotational_speed_rpm: number;
}

export interface DashboardSummary {
  has_data: boolean;
  overall_health_score: number | null;
  health_status_label: string;
  current_operating_condition: string;
  predicted_fault: string | null;
  fault_probability: number | null;
  vibration_rms: number | null;
  peak_vibration: number | null;
  rotational_speed_rpm: number | null;
  selected_dataset: string;
  data_source_mode: string;
  total_assessments: number;
  fault_distribution: Record<string, number>;
  recent_history: DiagnosisRecordItem[];
  status_message: string;
}

export interface DatasetItem {
  id: number;
  name: string;
  filename: string;
  file_type: string;
  sampling_rate_hz: number;
  fault_class: string;
  motor_load_hp: number;
  sample_count: number;
  duration_seconds: number;
  is_benchmark: boolean;
  created_at: string;
}

export interface DatasetDetail extends DatasetItem {
  preview_signal: number[];
  time_axis: number[];
  summary_features: VibrationFeatures;
  defect_frequencies: Record<string, number>;
}

export interface PredictionResult {
  id: number;
  predicted_fault: string;
  confidence: number;
  probabilities: Record<string, number>;
  health_score: number;
  features: VibrationFeatures;
  source_type: string;
  severity: string;
  anomaly_detected: boolean;
  anomaly_score: number;
  timestamp: string;
  model_used: string;
}

export interface SimulationResult {
  is_simulated: boolean;
  notice: string;
  simulation_category: string;
  rpm: number;
  sampling_rate_hz: number;
  sample_count: number;
  duration_seconds: number;
  rms: number;
  peak: number;
  crest_factor: number;
  kurtosis: number;
  dominant_frequency: number;
  defect_frequencies: Record<string, number>;
  summary_features: VibrationFeatures;
  time_axis: number[];
  signal_preview: number[];
  spectrum_frequencies: number[];
  spectrum_magnitudes: number[];
}

export interface MaintenanceAnalysis {
  current_health_score: number;
  anomaly_status: string;
  anomaly_score: number;
  fault_severity: string;
  estimated_degradation_pct: number;
  rul_notice: string;
  recommended_actions: string[];
  trend_history: {
    timestamp: string;
    health_index: number;
    vibration_rms: number;
    anomaly_score: number;
    operating_state: string;
  }[];
}

export interface MaintenanceLogItem {
  id: number;
  timestamp: string;
  fault_detected: string;
  severity: string;
  health_score: number;
  recommended_action: string;
  action_priority: number;
  status: string;
}

export interface ModelMetricSet {
  model_name: string;
  display_name: string;
  accuracy: number;
  precision_macro: number;
  recall_macro: number;
  f1_macro: number;
  classes: string[];
  classification_report: Record<string, { precision: number; recall: number; f1_score: number; support: number }>;
  confusion_matrix: number[][];
  train_samples: number;
  test_samples: number;
  training_duration_seconds: number;
  validation_split_methodology: string;
}

export interface ModelPerformanceResponse {
  is_trained: boolean;
  message?: string;
  models: ModelMetricSet[];
  feature_names: string[];
  best_model: string;
  dataset_summary: Record<string, any>;
  last_trained_at?: string;
}

export interface MaintenanceReport {
  id: number;
  report_reference: string;
  timestamp: string;
  title: string;
  technician_name: string;
  motor_spec: string;
  operating_condition: string;
  diagnosed_fault: string;
  fault_confidence: number;
  health_score: number;
  severity: string;
  iso_zone: string;
  vibration_rms: number;
  vibration_peak: number;
  component_assessments?: Record<string, string>;
  recommended_actions: {
    priority: 'IMMEDIATE' | 'SCHEDULED' | 'ROUTINE';
    target_component: string;
    description: string;
  }[];
  engineer_notes?: string;
  rul_statement: string;
}
