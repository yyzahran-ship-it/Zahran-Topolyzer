import { createWorker, PSM } from 'tesseract.js';
import { buildResult } from './classify';
import type { AnalysisResult } from '../types/topography';

const PARAM_PATTERNS: { regex: RegExp; name: string; unit: string }[] = [
  { regex: /k\s*-?\s*max|kmax/i,                             name: 'Kmax',                unit: 'D'   },
  { regex: /\bk\s*f\b|\bk\s*1\b|flat\s*k/i,                 name: 'K1',                  unit: 'D'   },
  { regex: /\bk\s*s\b|\bk\s*2\b|steep\s*k/i,                name: 'K2',                  unit: 'D'   },
  { regex: /\bk\s*m\b|mean\s*k/i,                            name: 'Km',                  unit: 'D'   },
  { regex: /sim\.?\s*k\s*1|simk1/i,                          name: 'SimK1',               unit: 'D'   },
  { regex: /sim\.?\s*k\s*2|simk2/i,                          name: 'SimK2',               unit: 'D'   },
  { regex: /\bc\.?\s*c\.?\s*t\b|central\s*corneal\s*thick/i, name: 'CCT',                 unit: 'µm'  },
  { regex: /thinn?e?s?t?\s*p?o?i?n?t?|min\.?\s*pachy/i,      name: 'Thinnest Point',      unit: 'µm'  },
  { regex: /ant\.?\s*el?ev|front\s*el?ev/i,                  name: 'Anterior Elevation',  unit: 'µm'  },
  { regex: /post\.?\s*el?ev|back\s*el?ev/i,                  name: 'Posterior Elevation', unit: 'µm'  },
  { regex: /b\.?\s*a\.?\s*d\.?\s*-?\s*d\b|bad\s*d/i,        name: 'BAD-D',               unit: ''    },
  { regex: /\bt\.?\s*b\.?\s*i\b/i,                           name: 'TBI',                 unit: ''    },
  { regex: /\bc\.?\s*b\.?\s*i\b/i,                           name: 'CBI',                 unit: ''    },
  { regex: /\bi\.?\s*s\.?\s*v\b/i,                           name: 'ISV',                 unit: ''    },
  { regex: /\bi\.?\s*v\.?\s*a\b/i,                           name: 'IVA',                 unit: ''    },
  { regex: /\bk\.?\s*i\b(?!s)/i,                             name: 'KI',                  unit: ''    },
  { regex: /\bc\.?\s*k\.?\s*i\b/i,                           name: 'CKI',                 unit: ''    },
  { regex: /\bi\.?\s*h\.?\s*a\b/i,                           name: 'IHA',                 unit: '°'   },
  { regex: /\bi\.?\s*h\.?\s*d\b/i,                           name: 'IHD',                 unit: ''    },
  { regex: /\br\.?\s*m\.?\s*i\.?\s*n\b|r\s*min/i,           name: 'Rmin',                unit: 'mm'  },
  { regex: /a\.?\s*r\.?\s*t\.?\s*-?\s*max|artmax/i,         name: 'ART-Max',             unit: ''    },
  { regex: /\bp\.?\s*r\.?\s*f\.?\s*i\b/i,                   name: 'PRFI',                unit: ''    },
  { regex: /i\s*[\/\-]\s*s\s*(val|value)?/i,                 name: 'I-S value',           unit: 'D'   },
  { regex: /\bkisa\s*%?/i,                                   name: 'KISA%',               unit: '%'   },
  { regex: /\bs\.?\s*r\.?\s*a\.?\s*x\b/i,                   name: 'SRAX',                unit: '°'   },
  { regex: /\bs\.?\s*a\.?\s*i\b/i,                           name: 'SAI',                 unit: ''    },
  { regex: /\bs\.?\s*r\.?\s*i\b/i,                           name: 'SRI',                 unit: ''    },
  { regex: /\bw\.?\s*t\.?\s*w\b|white.to.white/i,           name: 'WTW',                 unit: 'mm'  },
  { regex: /\ba\.?\s*c\.?\s*d\b/i,                           name: 'ACD',                 unit: 'mm'  },
  { regex: /corneal\s*vol/i,                                  name: 'Corneal Volume',      unit: 'mm³' },
  { regex: /q[.\s]?val|aspherici?ty/i,                       name: 'Q value',             unit: ''    },
  { regex: /hoa\s*rms|total\s*hoa/i,                         name: 'HOA RMS',             unit: 'µm'  },
  { regex: /\bs\.?\s*i\.?\s*f\b|si\s*-?\s*f\b/i,            name: 'SIf',                 unit: ''    },
  { regex: /\bs\.?\s*i\.?\s*b\b|si\s*-?\s*b\b/i,            name: 'SIb',                 unit: ''    },
  { regex: /\bd\.?\s*s\.?\s*i\b/i,                           name: 'DSI',                 unit: ''    },
  { regex: /\bo\.?\s*s\.?\s*i\b/i,                           name: 'OSI',                 unit: ''    },
  { regex: /\bc\.?\s*s\.?\s*i\b/i,                           name: 'CSI',                 unit: ''    },
  { regex: /\bi\.?\s*a\.?\s*i\b/i,                           name: 'IAI',                 unit: ''    },
  { regex: /\ba\.?\s*a\.?\s*i\b/i,                           name: 'AAI',                 unit: ''    },
  { regex: /\bs\.?\s*d\.?\s*p\b/i,                           name: 'SDP',                 unit: ''    },
  { regex: /astigmati?sm|\bcyl\b/i,                          name: 'Astigmatism',         unit: 'D'   },
  { regex: /ppi\s*-?\s*avg/i,                                name: 'PPI-Avg',             unit: ''    },
  { regex: /ppi\s*-?\s*min/i,                                name: 'PPI-Min',             unit: ''    },
  { regex: /pachy\s*min|min\s*pachy/i,                       name: 'Pachymetry Min',      unit: 'µm'  },
  { regex: /\bflat\b(?!\s*k)/i,                              name: 'Flat K',              unit: 'D'   },
  { regex: /\bsteep\b(?!\s*k)/i,                             name: 'Steep K',             unit: 'D'   },
];

interface Word {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

// Extract numeric value from OCR'd text — tolerates units attached to digits
function parseNum(raw: string): number | null {
  // Replace comma decimal separator, strip non-numeric chars from edges
  const s = raw.replace(',', '.').replace(/[°µDmm%³]+$/i, '').replace(/^[^\d\-]+/, '');
  if (!s || !/\d/.test(s)) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Preprocess: upscale + grayscale + contrast boost → better Tesseract accuracy
// on small or coloured medical device screenshots
async function preprocessForOCR(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth  || img.width  || 1;
      const H = img.naturalHeight || img.height || 1;
      const scale = Math.min(3, Math.max(1, 2000 / Math.max(W, H)));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(W * scale);
      canvas.height = Math.round(H * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d  = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // Contrast ×1.8 centred on 128
        const c = Math.round(Math.max(0, Math.min(255, (g - 128) * 1.8 + 128)));
        d[i] = d[i + 1] = d[i + 2] = c;
      }
      ctx.putImageData(id, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function analyzeWithOCR(
  imageDataUrl: string,
  onProgress: (msg: string) => void
): Promise<AnalysisResult> {
  onProgress('Loading OCR engine…');

  const href = window.location.href;
  const base = href.substring(0, href.lastIndexOf('/') + 1);

  const [workerBlob, coreBlob] = await Promise.all([
    fetch(base + 'tesseract/worker.min.js').then((r) => r.blob()),
    fetch(base + 'tesseract/tesseract-core.wasm.js').then((r) => r.blob()),
  ]);
  const workerBlobUrl = URL.createObjectURL(workerBlob);
  const coreBlobUrl   = URL.createObjectURL(coreBlob);

  const worker = await createWorker('eng', 1, {
    workerPath:  workerBlobUrl,
    corePath:    coreBlobUrl,
    langPath:    base + 'tesseract/',
    cacheMethod: 'none' as const,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress(`Scanning image… ${Math.round(m.progress * 100)}%`);
      } else if (m.status === 'loading language traineddata') {
        onProgress('Loading OCR model…');
      }
    },
  });

  // PSM 11 = Sparse text: best for medical device printouts where
  // numbers and labels are scattered in multiple columns/areas.
  await worker.setParameters({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tessedit_pageseg_mode: PSM.SPARSE_TEXT as any,
    preserve_interword_spaces: '1',
  });

  onProgress('Preprocessing image…');
  const processedUrl = await preprocessForOCR(imageDataUrl);

  onProgress('Running OCR…');

  let words: Word[] = [];
  let imgWidth  = 1;
  let imgHeight = 1;

  try {
    const { data } = await worker.recognize(processedUrl);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = data as any;
    words = ((page.words ?? []) as Word[]).filter((w) => w.confidence > 10);
    if (words.length > 0) {
      imgWidth  = Math.max(...words.map((w) => w.bbox.x1), 1);
      imgHeight = Math.max(...words.map((w) => w.bbox.y1), 1);
    }
  } finally {
    await worker.terminate();
    URL.revokeObjectURL(workerBlobUrl);
    URL.revokeObjectURL(coreBlobUrl);
  }

  onProgress('Parsing parameters…');

  // Group words into lines by Y proximity (1.5% of image height)
  const lineThreshold = imgHeight * 0.015;
  const lines: Word[][] = [];
  for (const word of words) {
    const cy = (word.bbox.y0 + word.bbox.y1) / 2;
    const existing = lines.find(
      (l) => Math.abs((l[0].bbox.y0 + l[0].bbox.y1) / 2 - cy) < lineThreshold
    );
    if (existing) existing.push(word);
    else lines.push([word]);
  }
  for (const line of lines) line.sort((a, b) => a.bbox.x0 - b.bbox.x0);

  const found = new Map<string, { value: number; unit: string; x: number; y: number; w: number; h: number }>();

  function recordHit(pat: { name: string; unit: string }, numWord: Word) {
    if (found.has(pat.name)) return;
    const value = parseNum(numWord.text);
    if (value === null) return;
    found.set(pat.name, {
      value, unit: pat.unit,
      x: ((numWord.bbox.x0 + numWord.bbox.x1) / 2) / imgWidth,
      y: ((numWord.bbox.y0 + numWord.bbox.y1) / 2) / imgHeight,
      w: (numWord.bbox.x1 - numWord.bbox.x0) / imgWidth,
      h: (numWord.bbox.y1 - numWord.bbox.y0) / imgHeight,
    });
  }

  // Pass 1: full-line text — label and value on same line
  for (const line of lines) {
    const lineText = line.map((w) => w.text).join(' ');
    for (const pat of PARAM_PATTERNS) {
      if (found.has(pat.name) || !pat.regex.test(lineText)) continue;
      // Find the first numeric-looking word on the line
      const numWord = line.find((w) => parseNum(w.text) !== null);
      if (numWord) recordHit(pat, numWord);
    }
  }

  // Pass 2: word-level lookahead — search up to 6 words ahead and 2 lines below
  for (const pat of PARAM_PATTERNS) {
    if (found.has(pat.name)) continue;
    outer: for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      for (let wi = 0; wi < line.length; wi++) {
        // Test individual word, or joined with next word (handles "K max" split)
        const joined = line.slice(wi, wi + 2).map((w) => w.text).join(' ');
        if (!pat.regex.test(line[wi].text) && !pat.regex.test(joined)) continue;
        const candidates = [
          ...line.slice(wi + 1, wi + 7),
          ...(lines[li + 1] ?? []).slice(0, 6),
          ...(lines[li + 2] ?? []).slice(0, 4),
        ];
        const numWord = candidates.find((w) => parseNum(w.text) !== null);
        if (numWord) { recordHit(pat, numWord); break outer; }
      }
    }
  }

  // Pass 3: reverse scan — value might appear BEFORE the label (some devices)
  for (const pat of PARAM_PATTERNS) {
    if (found.has(pat.name)) continue;
    outer: for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      for (let wi = 0; wi < line.length; wi++) {
        const joined = line.slice(wi, wi + 2).map((w) => w.text).join(' ');
        if (!pat.regex.test(line[wi].text) && !pat.regex.test(joined)) continue;
        // Look BEFORE the label word
        const candidates = line.slice(Math.max(0, wi - 5), wi);
        const numWord = [...candidates].reverse().find((w) => parseNum(w.text) !== null);
        if (numWord) { recordHit(pat, numWord); break outer; }
      }
    }
  }

  if (found.size === 0) {
    throw new Error(
      'No parameters found in this image.\n\n' +
      'Tips:\n' +
      '• Screenshot the numbers panel — not only the colour map\n' +
      '• Use a clear, unrotated, well-lit capture\n' +
      '• Pentacam, Sirius, Galilei, Orbscan and Atlas are supported'
    );
  }

  const entries = Array.from(found.entries()).map(([name, d]) => ({
    name, value: d.value, unit: d.unit,
    x: d.x, y: d.y, width: Math.max(d.w, 0.04), height: Math.max(d.h, 0.02),
  }));

  const fullText = words.map((w) => w.text).join(' ').toLowerCase();
  let device = 'Unknown';
  if (/pentacam|oculus/i.test(fullText))  device = 'Pentacam';
  else if (/sirius|cso/i.test(fullText))  device = 'Sirius';
  else if (/galilei|ziemer/i.test(fullText)) device = 'Galilei';
  else if (/orbscan|bausch/i.test(fullText)) device = 'Orbscan';
  else if (/atlas|zeiss/i.test(fullText)) device = 'Atlas';

  let eye: AnalysisResult['eye'] = 'unknown';
  if (/\bod\b|right\s+eye/i.test(fullText)) eye = 'OD';
  else if (/\bos\b|left\s+eye/i.test(fullText)) eye = 'OS';
  else if (/\bou\b/i.test(fullText)) eye = 'OU';

  const base_result = buildResult(entries, device, eye);
  return {
    ...base_result,
    parameters: base_result.parameters.map((p, i) => ({
      ...p,
      x: entries[i]?.x ?? 0,
      y: entries[i]?.y ?? 0,
      width:  entries[i]?.width ?? 0,
      height: entries[i]?.height ?? 0,
    })),
  };
}
