import { buildResult } from './classify';
import type { AnalysisResult } from '../types/topography';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

interface VisionParam {
  name: string;
  value: number;
  unit: string;
}

interface VisionResponse {
  device: string;
  eye: string;
  parameters: VisionParam[];
}

const VISION_PROMPT = `You are a corneal topography expert. Carefully examine this topography report image and extract ALL visible numerical parameters.

Return ONLY valid JSON (no markdown fences, no explanation) in exactly this format:
{"device":"...","eye":"...","parameters":[{"name":"...","value":0,"unit":"..."}]}

Rules:
- device: one of "Pentacam", "Sirius", "Galilei", "Orbscan", "Atlas", "Unknown"
- eye: one of "OD", "OS", "OU", "unknown"
- Extract every measurement visible: K readings (K1, K2, Kmax, Km, SimK1, SimK2), pachymetry (CCT, Thinnest Point), elevation (Anterior Elevation, Posterior Elevation), KC indices (BAD-D, TBI, CBI, ISV, IVA, KI, IHA, IHD, ART-Max, PRFI), biometry (ACD, WTW, AXL, TCRP, AC Volume, AC Angle), aberrations (HOA RMS, Coma, Trefoil, Spherical Aberration), Q value, Corneal Volume, Astigmatism, and any other numerical measurement.
- value must be a JSON number (not a string)
- unit: D for diopters, µm for microns, mm for millimeters, ° for degrees, % for percentage, empty string if unitless
- If a parameter appears multiple times, include only the primary/main measurement`;

export async function analyzeWithVision(
  dataUrl: string,
  apiKey: string,
  onProgress: (msg: string) => void,
): Promise<AnalysisResult> {
  onProgress('Sending image to Claude Vision…');

  const commaIdx = dataUrl.indexOf(',');
  const header   = dataUrl.slice(0, commaIdx);
  const base64   = dataUrl.slice(commaIdx + 1);
  const mediaType = (header.match(/data:([^;]+);/) ?? [])[1] ?? 'image/jpeg';

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        { type: 'text', text: VISION_PROMPT },
      ],
    }],
  });

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-calls': 'true',
        'content-type': 'application/json',
      },
      body,
    });
  } catch (e) {
    throw new Error(`Network error contacting Anthropic API: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      msg = err?.error?.message ?? msg;
    } catch { /* ignore */ }
    throw new Error(
      response.status === 401
        ? 'Invalid API key. Please check your Anthropic API key and try again.'
        : `Claude API error ${response.status}: ${msg}`,
    );
  }

  onProgress('Parsing Claude response…');

  const json = await response.json();
  const text: string = json?.content?.[0]?.text ?? '';

  // Strip optional markdown fences
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude did not return extractable JSON. Please try again.');
  }

  let parsed: VisionResponse;
  try {
    parsed = JSON.parse(jsonMatch[0]) as VisionResponse;
  } catch {
    throw new Error('Claude response was malformed JSON. Please try again.');
  }

  const device     = parsed.device ?? 'Unknown';
  const rawEye     = parsed.eye    ?? 'unknown';
  const eyeValue   = (['OD', 'OS', 'OU'] as const).includes(rawEye as 'OD' | 'OS' | 'OU')
    ? rawEye as AnalysisResult['eye']
    : 'unknown';

  const rawParams = (parsed.parameters ?? [])
    .filter(p => typeof p.value === 'number' && !isNaN(p.value))
    .map(p => ({ name: p.name, value: p.value, unit: p.unit ?? '' }));

  onProgress(`Found ${rawParams.length} parameters — classifying…`);

  return buildResult(rawParams, device, eyeValue);
}
