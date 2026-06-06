import Anthropic from '@anthropic-ai/sdk';
import type { AnalysisResult, ParameterStatus, RawParameter, RiskLevel, TopographyParameter } from '../types/topography';
import { lookupNormalRange } from './normalRanges';

const ANALYSIS_PROMPT = `You are an expert ophthalmologist and corneal topography specialist. Analyze this corneal topography screenshot.

YOUR TASKS:
1. Identify the device manufacturer (Pentacam, Sirius, Galilei, Orbscan, Atlas, Keratograph, TMS, Magellan, or other)
2. Identify which eye is shown (OD = right eye, OS = left eye, OU = both)
3. Extract EVERY numerical measurement visible in the image

For EACH numerical value found, provide:
- name: The parameter label exactly as shown (e.g. "Kmax", "CCT", "BAD-D", "ISV")
- value: The numerical value as a number (not a string)
- unit: The measurement unit (e.g. "D", "µm", "mm", "%", "°")
- x: Center horizontal position of this number in the image, as a fraction from 0.0 (left) to 1.0 (right)
- y: Center vertical position of this number in the image, as a fraction from 0.0 (top) to 1.0 (bottom)
- width: Width of the number text as a fraction of image width (typically 0.03–0.10)
- height: Height of the number text as a fraction of image height (typically 0.02–0.04)

COMMON PARAMETERS TO LOOK FOR (extract ALL you can see):
• Keratometry: K1, K2, Km, Kmax, SimK1, SimK2, Kf, Ks, Astigmatism/Cyl, Axis
• Pachymetry: CCT, Min Pachymetry, Thinnest Point, Apex Thickness, Pachymetric Minimum
• Elevation: Anterior Elevation, Posterior Elevation, Front Elevation, Back Elevation (from BFS or BFTE)
• Pentacam Indices: ISV, IVA, KI, CKI, IHD, IVP, ARTmax, BAD-D, Rmin
• Screening Indices: I-S value, KISA%, KPI, SRAX, SAI, SRI, DSI, OSI, CSI, AA
• Aberrations: HOA RMS, Coma, Trefoil, Spherical Aberration (SA), Total RMS
• Biometrics: WTW, ACD, AL, Pupil Diameter, Corneal Volume, Q value

Return ONLY this exact JSON structure (no markdown fences, no extra text):
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

  // Check critical parameters
  const kmax = params.find((p) =>
    p.name.toLowerCase().includes('kmax')
  );
  const badD = params.find((p) =>
    p.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes('badd') ||
    p.name.toLowerCase().includes('bad-d')
  );
  const cct = params.find((p) =>
    p.name.toLowerCase() === 'cct' ||
    p.name.toLowerCase().includes('central corneal')
  );

  const kmaxAbnormal = kmax?.status === 'abnormal';
  const badDAbnormal = badD?.status === 'abnormal';
  const cctAbnormal = cct?.status === 'abnormal';

  if (abnormal >= 3 || (kmaxAbnormal && badDAbnormal) || cctAbnormal) {
    return 'very-high';
  }
  if (abnormal >= 2 || (kmaxAbnormal || badDAbnormal)) {
    return 'high';
  }
  if (abnormal >= 1 || borderline >= 3) {
    return 'moderate';
  }
  return 'low';
}

function gradeKeratoconus(params: TopographyParameter[]): string | null {
  const kmax = params.find((p) => p.name.toLowerCase().includes('kmax'));
  const cct = params.find(
    (p) =>
      p.name.toLowerCase() === 'cct' ||
      p.name.toLowerCase().includes('thinnest')
  );

  if (!kmax) return null;
  const k = kmax.value;
  const c = cct?.value;

  // Amsler-Krumeich grading
  if (k > 55) return 'Keratoconus Stage IV (Amsler-Krumeich) — severe';
  if (k > 53) return 'Keratoconus Stage III (Amsler-Krumeich)';
  if (k > 48) return 'Keratoconus Stage II (Amsler-Krumeich)';
  if (k > 47.2 || (c !== undefined && c < 480))
    return 'Keratoconus Stage I / Forme Fruste — early ectasia suspected';

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
    return `${abnormalCount} abnormal parameter${abnormalCount !== 1 ? 's' : ''} detected.${g} Strong suspicion for keratoconus or corneal ectasia. Clinical evaluation and referral recommended.`;
  }
  // very-high
  const g = grade ? ` ${grade}.` : '';
  return `Multiple critical parameters abnormal.${g} Findings are highly consistent with keratoconus or advanced ectatic disease. Urgent clinical evaluation required. LASER refractive surgery is contraindicated.`;
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
