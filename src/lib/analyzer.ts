import Anthropic from '@anthropic-ai/sdk';
import type { AnalysisResult, RawParameter, TopographyParameter } from '../types/topography';
import { classifyStatus, computeRiskLevel, gradeKeratoconus, buildSummary } from './classify';

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
