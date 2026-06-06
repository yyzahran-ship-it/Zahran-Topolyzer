import { createWorker } from 'tesseract.js';
import { buildResult } from './classify';
import type { AnalysisResult } from '../types/topography';

const PARAM_PATTERNS: { regex: RegExp; name: string; unit: string }[] = [
  { regex: /\bkmax\b/i,                            name: 'Kmax',                unit: 'D'   },
  { regex: /\bk1\b|\bkf\b|flat\s+k\b/i,            name: 'K1',                  unit: 'D'   },
  { regex: /\bk2\b|\bks\b|steep\s+k\b/i,           name: 'K2',                  unit: 'D'   },
  { regex: /\bkm\b|mean\s+k\b/i,                   name: 'Km',                  unit: 'D'   },
  { regex: /simk1|sim\.?k1/i,                       name: 'SimK1',               unit: 'D'   },
  { regex: /simk2|sim\.?k2/i,                       name: 'SimK2',               unit: 'D'   },
  { regex: /\bcct\b|central\s+corneal/i,            name: 'CCT',                 unit: 'µm'  },
  { regex: /thinnest\s+point|min\.?\s*pachy/i,      name: 'Thinnest Point',      unit: 'µm'  },
  { regex: /ant\.?\s*elev|front\s+elev/i,           name: 'Anterior Elevation',  unit: 'µm'  },
  { regex: /post\.?\s*elev|back\s+elev/i,           name: 'Posterior Elevation', unit: 'µm'  },
  { regex: /\bbad-?d\b/i,                           name: 'BAD-D',               unit: ''    },
  { regex: /\btbi\b/i,                              name: 'TBI',                 unit: ''    },
  { regex: /\bcbi\b/i,                              name: 'CBI',                 unit: ''    },
  { regex: /\bisv\b/i,                              name: 'ISV',                 unit: ''    },
  { regex: /\biva\b/i,                              name: 'IVA',                 unit: ''    },
  { regex: /\bki\b(?!s)/i,                          name: 'KI',                  unit: ''    },
  { regex: /\bcki\b/i,                              name: 'CKI',                 unit: ''    },
  { regex: /\biha\b/i,                              name: 'IHA',                 unit: '°'   },
  { regex: /\bihd\b/i,                              name: 'IHD',                 unit: ''    },
  { regex: /\brmin\b/i,                             name: 'Rmin',                unit: 'mm'  },
  { regex: /\bart-?max\b|artmax\b/i,                name: 'ART-Max',             unit: ''    },
  { regex: /\bprfi\b/i,                             name: 'PRFI',                unit: ''    },
  { regex: /i-?s\s+val|i\/s\s+val/i,               name: 'I-S value',           unit: 'D'   },
  { regex: /\bkisa\b/i,                             name: 'KISA%',               unit: '%'   },
  { regex: /\bsrax\b/i,                             name: 'SRAX',                unit: '°'   },
  { regex: /\bsai\b/i,                              name: 'SAI',                 unit: ''    },
  { regex: /\bsri\b/i,                              name: 'SRI',                 unit: ''    },
  { regex: /\bwtw\b|white.to.white/i,               name: 'WTW',                 unit: 'mm'  },
  { regex: /\bacd\b/i,                              name: 'ACD',                 unit: 'mm'  },
  { regex: /corneal\s+vol/i,                        name: 'Corneal Volume',      unit: 'mm³' },
  { regex: /q.?value|asphericity/i,                 name: 'Q value',             unit: ''    },
  { regex: /hoa\s+rms|total\s+hoa/i,               name: 'HOA RMS',             unit: 'µm'  },
  { regex: /\bsif\b|si-?f\b/i,                     name: 'SIf',                 unit: ''    },
  { regex: /\bsib\b|si-?b\b/i,                     name: 'SIb',                 unit: ''    },
  { regex: /\bdsi\b/i,                              name: 'DSI',                 unit: ''    },
  { regex: /\bosi\b/i,                              name: 'OSI',                 unit: ''    },
  { regex: /\bcsi\b/i,                              name: 'CSI',                 unit: ''    },
  { regex: /\biai\b/i,                              name: 'IAI',                 unit: ''    },
  { regex: /\baai\b/i,                              name: 'AAI',                 unit: ''    },
  { regex: /\bsdp\b/i,                              name: 'SDP',                 unit: ''    },
  { regex: /\bastigmatism\b|\bcyl\b/i,              name: 'Astigmatism',         unit: 'D'   },
  { regex: /ppi-?avg\b/i,                           name: 'PPI-Avg',             unit: ''    },
  { regex: /ppi-?min\b/i,                           name: 'PPI-Min',             unit: ''    },
];

const NUM_RE = /^-?\d+\.?\d*$/;

interface Word {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export async function analyzeWithOCR(
  imageDataUrl: string,
  onProgress: (msg: string) => void
): Promise<AnalysisResult> {
  onProgress('Loading OCR engine…');

  // Use http://localhost/ paths — served by our WebViewClient asset interceptor.
  // This is required because Web Workers cannot be created from file:// URLs on Android.
  const base = window.location.origin + '/';

  const worker = await createWorker('eng', 1, {
    workerPath:  base + 'tesseract/worker.min.js',
    corePath:    base + 'tesseract/tesseract-core.wasm.js',
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

  onProgress('Running OCR…');

  let words: Word[] = [];
  let imgWidth = 1;
  let imgHeight = 1;

  try {
    const { data } = await worker.recognize(imageDataUrl);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = data as any;
    words = (page.words ?? []) as Word[];
    if (words.length > 0) {
      imgWidth  = Math.max(...words.map((w: Word) => w.bbox.x1), 1);
      imgHeight = Math.max(...words.map((w: Word) => w.bbox.y1), 1);
    }
  } finally {
    await worker.terminate();
  }

  onProgress('Parsing parameters…');

  // Group words into lines by Y proximity
  const lines: Word[][] = [];
  for (const word of words) {
    const cy = (word.bbox.y0 + word.bbox.y1) / 2;
    const existing = lines.find(
      (l) => Math.abs((l[0].bbox.y0 + l[0].bbox.y1) / 2 - cy) < 14
    );
    if (existing) existing.push(word);
    else lines.push([word]);
  }
  for (const line of lines) line.sort((a, b) => a.bbox.x0 - b.bbox.x0);

  const found = new Map<string, { value: number; unit: string; x: number; y: number; w: number; h: number }>();

  // Pass 1: full-line text match
  for (const line of lines) {
    const lineText = line.map((w) => w.text).join(' ');
    for (const pat of PARAM_PATTERNS) {
      if (found.has(pat.name) || !pat.regex.test(lineText)) continue;
      const numWord = line.find((w) => NUM_RE.test(w.text.replace(',', '.')));
      if (!numWord) continue;
      const value = parseFloat(numWord.text.replace(',', '.'));
      if (isNaN(value)) continue;
      found.set(pat.name, {
        value, unit: pat.unit,
        x: ((numWord.bbox.x0 + numWord.bbox.x1) / 2) / imgWidth,
        y: ((numWord.bbox.y0 + numWord.bbox.y1) / 2) / imgHeight,
        w: (numWord.bbox.x1 - numWord.bbox.x0) / imgWidth,
        h: (numWord.bbox.y1 - numWord.bbox.y0) / imgHeight,
      });
    }
  }

  // Pass 2: word-by-word lookahead (catches multi-word labels)
  for (const pat of PARAM_PATTERNS) {
    if (found.has(pat.name)) continue;
    outer: for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      for (let wi = 0; wi < line.length; wi++) {
        if (!pat.regex.test(line[wi].text)) continue;
        const candidates = [...line.slice(wi + 1, wi + 5), ...(lines[li + 1] ?? []).slice(0, 4)];
        const numWord = candidates.find((w) => NUM_RE.test(w.text.replace(',', '.')));
        if (!numWord) continue;
        const value = parseFloat(numWord.text.replace(',', '.'));
        if (isNaN(value)) continue;
        found.set(pat.name, {
          value, unit: pat.unit,
          x: ((numWord.bbox.x0 + numWord.bbox.x1) / 2) / imgWidth,
          y: ((numWord.bbox.y0 + numWord.bbox.y1) / 2) / imgHeight,
          w: (numWord.bbox.x1 - numWord.bbox.x0) / imgWidth,
          h: (numWord.bbox.y1 - numWord.bbox.y0) / imgHeight,
        });
        break outer;
      }
    }
  }

  if (found.size === 0) {
    throw new Error(
      'No corneal topography parameters found in this image.\n\n' +
      'Tips:\n• Make sure the image is a clear, unrotated screenshot\n' +
      '• Screenshot the data/numbers panel, not only the color map\n' +
      '• Avoid blurry or low-resolution images'
    );
  }

  const entries = Array.from(found.entries()).map(([name, d]) => ({
    name, value: d.value, unit: d.unit,
    x: d.x, y: d.y, width: Math.max(d.w, 0.04), height: Math.max(d.h, 0.02),
  }));

  const fullText = words.map((w) => w.text).join(' ').toLowerCase();
  let device = 'Unknown';
  if (/pentacam|oculus/i.test(fullText)) device = 'Pentacam';
  else if (/sirius|cso/i.test(fullText)) device = 'Sirius';
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
