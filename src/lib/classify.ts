import { lookupNormalRange } from './normalRanges';
import type {
  AnalysisResult,
  ParameterStatus,
  RawParameter,
  RiskLevel,
  TopographyParameter,
} from '../types/topography';

export function classifyStatus(param: RawParameter): {
  status: ParameterStatus;
  normalRange: string;
  displayName: string;
  interpretation: string;
} {
  const range = lookupNormalRange(param.name);

  if (!range) {
    return {
      status: 'unknown',
      normalRange: 'Not in database',
      displayName: param.name,
      interpretation: 'No reference range available',
    };
  }

  const v = param.value;
  let status: ParameterStatus = 'normal';

  if (range.higherIsBetter) {
    if (range.borderlineLow !== undefined && v < range.borderlineLow) status = 'abnormal';
    else if (range.normalMin !== undefined && v < range.normalMin) status = 'borderline';
  } else {
    const hasUpperAbnormal = range.borderlineHigh !== undefined && v > range.borderlineHigh;
    const hasUpperBorderline = range.normalMax !== undefined && v > range.normalMax;
    const hasLowerAbnormal = range.borderlineLow !== undefined && v < range.borderlineLow;
    const hasLowerBorderline = range.normalMin !== undefined && v < range.normalMin;

    if (hasUpperAbnormal || hasLowerAbnormal) status = 'abnormal';
    else if (hasUpperBorderline || hasLowerBorderline) status = 'borderline';
  }

  const interp =
    status === 'normal'
      ? 'Within normal limits'
      : status === 'borderline'
        ? 'Borderline — monitor closely'
        : 'Abnormal — clinical attention required';

  return {
    status,
    normalRange: range.displayRange,
    displayName: range.displayName ?? param.name,
    interpretation: interp,
  };
}

export function computeRiskLevel(params: TopographyParameter[]): RiskLevel {
  const abnormal = params.filter((p) => p.status === 'abnormal').length;
  const borderline = params.filter((p) => p.status === 'borderline').length;

  const find = (needles: string[]) =>
    params.find((p) => needles.some((n) => p.name.toLowerCase().includes(n)));

  const kmax     = find(['kmax']);
  const badD     = find(['bad-d', 'badd']);
  const tbi      = find(['tbi']);
  const cbi      = find(['cbi']);
  const prfi     = find(['prfi']);
  const thinnest = find(['thinnest', 'min pachy']);
  const postEl   = find(['posterior elev', 'back elev']);

  if (badD?.status === 'abnormal' || tbi?.status === 'abnormal' || abnormal >= 4)
    return 'very-high';

  if (
    kmax?.status === 'abnormal' ||
    cbi?.status === 'abnormal' ||
    prfi?.status === 'abnormal' ||
    postEl?.status === 'abnormal' ||
    thinnest?.status === 'abnormal' ||
    abnormal >= 2
  ) return 'high';

  if (
    abnormal >= 1 ||
    badD?.status === 'borderline' ||
    tbi?.status === 'borderline' ||
    borderline >= 3
  ) return 'moderate';

  return 'low';
}

export function gradeKeratoconus(params: TopographyParameter[]): string | null {
  const kmax = params.find((p) => p.name.toLowerCase().includes('kmax'));
  const km   = params.find((p) => ['km', 'mean k', 'simk'].includes(p.name.toLowerCase()));
  const thinnest = params.find(
    (p) => p.name.toLowerCase().includes('thinnest') || p.name.toLowerCase() === 'cct'
  );

  const k = kmax?.value ?? km?.value;
  if (k === undefined || typeof k !== 'number') return null;
  const c = thinnest?.value;

  if (k > 55 || (c !== undefined && c < 200))
    return 'Amsler-Krumeich Stage IV — advanced keratoconus (central scarring expected)';
  if (k > 53 || (c !== undefined && c < 400))
    return 'Amsler-Krumeich Stage III — moderate-to-severe keratoconus';
  if (k > 48 || (c !== undefined && c < 500))
    return 'Amsler-Krumeich Stage II — moderate keratoconus';
  if (k > 47.2 || (c !== undefined && c < 500))
    return 'Amsler-Krumeich Stage I — early keratoconus / forme fruste';

  return null;
}

export function buildSummary(
  riskLevel: RiskLevel,
  grade: string | null,
  abnormalCount: number,
  borderlineCount: number
): string {
  if (riskLevel === 'low')
    return 'All parameters are within normal limits. No signs of ectasia detected.';
  if (riskLevel === 'moderate')
    return `${borderlineCount} borderline parameter${borderlineCount !== 1 ? 's' : ''} detected. Forme fruste keratoconus or early ectasia cannot be excluded — repeat topography and clinical correlation recommended.`;
  if (riskLevel === 'high') {
    const g = grade ? ` ${grade}.` : '';
    return `${abnormalCount} abnormal parameter${abnormalCount !== 1 ? 's' : ''} detected.${g} Strong suspicion for keratoconus or corneal ectasia. Slit-lamp evaluation, serial topography, and specialist referral are recommended. LASER refractive surgery should be deferred pending further evaluation.`;
  }
  const g = grade ? ` ${grade}.` : '';
  return `Multiple critical parameters abnormal.${g} Findings are highly consistent with keratoconus or advanced ectatic disease. Urgent cornea specialist referral is required. LASER refractive surgery (LASIK / PRK / SMILE) is CONTRAINDICATED. Consider corneal cross-linking assessment.`;
}

export function buildResult(
  rawParams: { name: string; value: number; unit: string }[],
  device: string,
  eye: AnalysisResult['eye']
): AnalysisResult {
  const parameters: TopographyParameter[] = rawParams
    .filter((p) => typeof p.value === 'number' && !isNaN(p.value))
    .map((p) => ({
      name: p.name,
      value: p.value,
      unit: p.unit,
      x: 0, y: 0, width: 0, height: 0,
      ...classifyStatus(p as RawParameter),
    }));

  const riskLevel      = computeRiskLevel(parameters);
  const keratoconusGrade = gradeKeratoconus(parameters);
  const abnormalCount  = parameters.filter((p) => p.status === 'abnormal').length;
  const borderlineCount = parameters.filter((p) => p.status === 'borderline').length;
  const clinicalSummary = buildSummary(riskLevel, keratoconusGrade, abnormalCount, borderlineCount);

  return { device, eye, parameters, riskLevel, keratoconusGrade, clinicalSummary };
}
