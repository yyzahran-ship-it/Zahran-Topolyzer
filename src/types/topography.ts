export type ParameterStatus = 'normal' | 'borderline' | 'abnormal' | 'unknown';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'very-high';
export type Eye = 'OD' | 'OS' | 'OU' | 'unknown';

export interface RawParameter {
  name: string;
  value: number;
  unit: string;
  /** Normalized 0-1 from left */
  x: number;
  /** Normalized 0-1 from top */
  y: number;
  /** Normalized 0-1 fraction of image width */
  width: number;
  /** Normalized 0-1 fraction of image height */
  height: number;
}

export interface TopographyParameter extends RawParameter {
  displayName: string;
  status: ParameterStatus;
  normalRange: string;
  interpretation: string;
}

export interface AnalysisResult {
  device: string;
  eye: Eye;
  parameters: TopographyParameter[];
  riskLevel: RiskLevel;
  keratoconusGrade: string | null;
  clinicalSummary: string;
}

export interface NormalRange {
  /** Minimum value for normal range */
  normalMin?: number;
  /** Maximum value for normal range */
  normalMax?: number;
  /** Minimum value for borderline (below normalMin) */
  borderlineLow?: number;
  /** Maximum value for borderline (above normalMax) */
  borderlineHigh?: number;
  /** Human-readable normal range string */
  displayRange: string;
  /** Unit label */
  unit: string;
  /** Human-readable parameter name */
  displayName: string;
  /** True if higher values indicate worse pathology (default: higher=worse above normalMax) */
  higherIsBetter?: boolean;
}
