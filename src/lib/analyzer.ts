import Anthropic from '@anthropic-ai/sdk';
import type { AnalysisResult, ParameterStatus, RawParameter, RiskLevel, TopographyParameter } from '../types/topography';
import { lookupNormalRange } from './normalRanges';

const ANALYSIS_PROMPT = `You are an expert ophthalmologist specialising in corneal topography and tomography interpretation, with deep knowledge of Pentacam, Sirius, Galilei, Orbscan, Atlas/Zeiss, Keratograph, and TMS devices.

YOUR TASKS:
1. Identify the device manufacturer (Pentacam/Oculus, Sirius/CSO, Galilei/Ziemer, Orbscan/Bausch&Lomb, Atlas/Zeiss, Keratograph/Oculus, TMS/Tomey, or other)
2. Identify which eye is shown (OD = right eye, OS = left eye, OU = both)
3. Extract EVERY numerical measurement visible — be exhaustive, do not skip any number

For EACH value, provide:
- name: Exact label shown (e.g. "Kmax", "CCT", "BAD-D", "ISV", "SIb", "ART-Max")
- value: Numeric value (number type, not string)
- unit: Unit string ("D", "µm", "mm", "%", "°", "SD", or "" if unitless)
- x: Center x of the number as fraction 0.0–1.0 (left→right)
- y: Center y of the number as fraction 0.0–1.0 (top→bottom)
- width: Width of the number text as fraction of image width (0.03–0.12)
- height: Height of the number text as fraction of image height (0.02–0.05)

PARAMETERS TO FIND (extract ALL visible):

Keratometry: K1, K2, Km, Kmax, SimK1, SimK2, Kf, Ks, Astigmatism/Cyl, Axis

Pachymetry: CCT, Pachy Apex, Min Pachymetry, Thinnest Point, Thinnest Location,
Apex Thickness, Thinnest Displacement, PPI-Avg, PPI-Min, PPI-Max

Elevation (specify BFS or BFTE): Anterior Elevation, Posterior Elevation,
Front Elevation, Back Elevation (both reference bodies if shown)

Pentacam Topometric Indices: ISV, IVA, KI, CKI, IHA, IHD, Rmin,
BAD-D, ART-Max, ART-Avg, PRFI

Classic Screening Indices: I-S value, KISA%, KPI, SRAX, SAI, SRI,
DSI, OSI, CSI, IAI, AA

Galilei: AAI, SDP, PPK

Sirius: SIf, SIb, KVf, KVb, BCVf, BCVb, BCV

Biomechanical (Corvis ST): CBI, TBI, SP-A1, DA Ratio

Aberrations: HOA RMS, Total HOA, Vertical Coma, Horizontal Coma,
Coma, Trefoil, Spherical Aberration, Z4(0)

Biometrics: WTW, ACD, AL, Pupil Diameter, Corneal Volume, Q value, EKR

Return ONLY valid JSON — no markdown fences, no commentary:
{
  "device": "device name or unknown",
  "eye": "OD" or "OS" or "OU" or "unknown",
  "parameters": [
    {
      "name": "parameter label",
      "value": 12.34,
      "unit": "D",
      "x": 0.75,
      "y": 0.32,
      "width": 0.06,
      "height": 0.03
    }
  ]
}`;

function classifyStatus(param: RawParameter): {
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
    // Higher value = better (CCT, ARTmax, Rmin)
    if (range.borderlineLow !== undefined && v < range.borderlineLow) {
      status = 'abnormal';
    } else if (range.normalMin !== undefined && v < range.normalMin) {
      status = 'borderline';
    }
  } else {
    // Lower value = better (Kmax, BAD-D, ISV, etc.)
    const hasUpperAbnormal =
      range.borderlineHigh !== undefined && v > range.borderlineHigh;
    const hasUpperBorderline =
      range.normalMax !== undefined && v > range.normalMax;
    const hasLowerAbnormal =
      range.borderlineLow !== undefined && v < range.borderlineLow;
    const hasLowerBorderline =
      range.normalMin !== undefined && v < range.normalMin;

    if (hasUpperAbnormal || hasLowerAbnormal) {
      status = 'abnormal';
    } else if (hasUpperBorderline || hasLowerBorderline) {
      status = 'borderline';
    }
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

function computeRiskLevel(params: TopographyParameter[]): RiskLevel {
  const abnormal = params.filter((p) => p.status === 'abnormal').length;
  const borderline = params.filter((p) => p.status === 'borderline').length;

  const find = (needles: string[]) =>
    params.find((p) => needles.some((n) => p.name.toLowerCase().includes(n)));

  const kmax  = find(['kmax']);
  const badD  = find(['bad-d', 'badd']);
  const tbi   = find(['tbi']);
  const cbi   = find(['cbi']);
  const prfi  = find(['prfi']);
  const thinnest = find(['thinnest', 'min pachy']);
  const postEl   = find(['posterior elev', 'back elev']);

  // Very high: composite AI index red, or multiple critical parameters
  if (
    badD?.status  === 'abnormal' ||
    tbi?.status   === 'abnormal' ||
    abnormal >= 4
  ) return 'very-high';

  // High: flagged composite index or 2+ critical parameters abnormal
  if (
    kmax?.status    === 'abnormal' ||
    cbi?.status     === 'abnormal' ||
    prfi?.status    === 'abnormal' ||
    postEl?.status  === 'abnormal' ||
    thinnest?.status === 'abnormal' ||
    abnormal >= 2
  ) return 'high';

  // Moderate: 1 abnormal OR composite index borderline OR 3+ borderline
  if (
    abnormal >= 1 ||
    badD?.status  === 'borderline' ||
    tbi?.status   === 'borderline' ||
    borderline >= 3
  ) return 'moderate';

  return 'low';
}

/**
 * Amsler-Krumeich staging (1938/1998).
 * Uses Kmax (most available), confirmed by thinnest pachymetry.
 * Ref: Belin et al. 2020, Table in Section 12.1.
 */
function gradeKeratoconus(params: TopographyParameter[]): string | null {
  const kmax = params.find((p) => p.name.toLowerCase().includes('kmax'));
  const km   = params.find((p) => ['km', 'mean k', 'simk'].includes(p.name.toLowerCase()));
  const thinnest = params.find((p) =>
    p.name.toLowerCase().includes('thinnest') || p.name.toLowerCase() === 'cct'
  );

  const k = kmax?.value ?? km?.value;
  if (k === undefined || typeof k !== 'number') return null;
  const c = thinnest?.value;

  // Stage 4: Kmax > 55 D or CCT < 200 µm
  if (k > 55 || (c !== undefined && c < 200))
    return 'Amsler-Krumeich Stage IV — advanced keratoconus (central scarring expected)';
  // Stage 3: Kmax 53–55 D, CCT 200–400 µm
  if (k > 53 || (c !== undefined && c < 400))
    return 'Amsler-Krumeich Stage III — moderate-to-severe keratoconus';
  // Stage 2: Kmax 48–53 D, CCT 400–500 µm
  if (k > 48 || (c !== undefined && c < 500))
    return 'Amsler-Krumeich Stage II — moderate keratoconus';
  // Stage 1: Kmax < 48 D, CCT > 500 µm, eccentric steepening
  if (k > 47.2 || (c !== undefined && c < 500))
    return 'Amsler-Krumeich Stage I — early keratoconus / forme fruste';

  return null;
}

function buildSummary(
  riskLevel: RiskLevel,
  grade: string | null,
  abnormalCount: number,
  borderlineCount: number
): string {
  if (riskLevel === 'low') {
    return 'All extracted parameters are within normal limits. No signs of ectasia detected.';
  }
  if (riskLevel === 'moderate') {
    return `${borderlineCount} borderline parameter${borderlineCount !== 1 ? 's' : ''} detected. Forme fruste keratoconus or early ectasia cannot be excluded — repeat topography and clinical correlation recommended.`;
  }
  if (riskLevel === 'high') {
    const g = grade ? ` ${grade}.` : '';
    return `${abnormalCount} abnormal parameter${abnormalCount !== 1 ? 's' : ''} detected.${g} Strong suspicion for keratoconus or corneal ectasia. Slit-lamp evaluation, serial topography, and specialist referral are recommended. LASER refractive surgery should be deferred pending further evaluation.`;
  }
  // very-high
  const g = grade ? ` ${grade}.` : '';
  return `Multiple critical parameters abnormal.${g} Findings are highly consistent with keratoconus or advanced ectatic disease. Urgent cornea specialist referral is required. LASER refractive surgery (LASIK / PRK / SMILE) is CONTRAINDICATED. Consider corneal cross-linking assessment.`;
}

export async function analyzeTopographyImage(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
  apiKey: string
): Promise<AnalysisResult> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: ANALYSIS_PROMPT,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('');

  // Strip possible markdown fences
  const jsonText = text
    .replace(/^```(?:json)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();

  let parsed: { device: string; eye: string; parameters: RawParameter[] };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(
      `Could not parse Claude response as JSON. Raw response:\n${text}`
    );
  }

  const raw: RawParameter[] = (parsed.parameters ?? []).filter(
    (p) => typeof p.value === 'number' && !isNaN(p.value)
  );

  const parameters: TopographyParameter[] = raw.map((p) => ({
    ...p,
    ...classifyStatus(p),
  }));

  const riskLevel = computeRiskLevel(parameters);
  const keratoconusGrade = gradeKeratoconus(parameters);
  const abnormalCount = parameters.filter((p) => p.status === 'abnormal').length;
  const borderlineCount = parameters.filter((p) => p.status === 'borderline').length;
  const clinicalSummary = buildSummary(
    riskLevel,
    keratoconusGrade,
    abnormalCount,
    borderlineCount
  );

  const eye = (['OD', 'OS', 'OU', 'unknown'] as const).includes(
    parsed.eye as 'OD' | 'OS' | 'OU' | 'unknown'
  )
    ? (parsed.eye as 'OD' | 'OS' | 'OU' | 'unknown')
    : 'unknown';

  return {
    device: parsed.device ?? 'Unknown device',
    eye,
    parameters,
    riskLevel,
    keratoconusGrade,
    clinicalSummary,
  };
}
