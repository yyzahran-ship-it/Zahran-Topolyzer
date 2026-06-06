import { createWorker } from 'tesseract.js';
import { buildResult } from './classify';
import type { AnalysisResult } from '../types/topography';

const PARAM_PATTERNS: { regex: RegExp; name: string; unit: string }[] = [
  { regex: /k\s*-?\s*max|kmax/i,                                  name: 'Kmax',                unit: 'D'   },
  // Sirius: "K1 = X D" in K readings, "rf = X D" in Shape indices (anterior flat K)
  { regex: /\bk\s*f\b|\bk\s*1\b|flat\s*k|\brf\b/i,              name: 'K1',                  unit: 'D'   },
  // Sirius: "K2 = X D" in K readings, "rs = X D" in Shape indices (anterior steep K)
  { regex: /\bk\s*s\b|\bk\s*2\b|steep\s*k|\brs\b/i,             name: 'K2',                  unit: 'D'   },
  // Removed \bavg\b — too broad, grabs wrong column from posterior K "Avg = -6.xx D"
  { regex: /\bk\s*m\b|mean\s*k/i,                                 name: 'Km',                  unit: 'D'   },
  { regex: /sim\.?\s*k\s*1|simk1/i,                               name: 'SimK1',               unit: 'D'   },
  { regex: /sim\.?\s*k\s*2|simk2/i,                               name: 'SimK2',               unit: 'D'   },
  { regex: /\bc\.?\s*c\.?\s*t\b|central\s*corneal\s*thick/i,      name: 'CCT',                 unit: 'µm'  },
  // Sirius uses "Thk = X µm" on the same line as the thickness value
  { regex: /thinn?e?s?t?\s*(p?o?i?n?t?|loc\w*)|\bthk\b|min\.?\s*pachy/i, name: 'Thinnest Point', unit: 'µm' },
  { regex: /ant\.?\s*el?ev|front\s*el?ev/i,                       name: 'Anterior Elevation',  unit: 'µm'  },
  { regex: /post\.?\s*el?ev|back\s*el?ev/i,                       name: 'Posterior Elevation', unit: 'µm'  },
  { regex: /b\.?\s*a\.?\s*d\.?\s*-?\s*d\b|bad\s*d/i,             name: 'BAD-D',               unit: ''    },
  { regex: /\bt\.?\s*b\.?\s*i\b/i,                                name: 'TBI',                 unit: ''    },
  { regex: /\bc\.?\s*b\.?\s*i\b/i,                                name: 'CBI',                 unit: ''    },
  { regex: /\bi\.?\s*s\.?\s*v\b/i,                                name: 'ISV',                 unit: ''    },
  { regex: /\bi\.?\s*v\.?\s*a\b/i,                                name: 'IVA',                 unit: ''    },
  { regex: /\bk\.?\s*i\b(?!s)/i,                                  name: 'KI',                  unit: ''    },
  { regex: /\bc\.?\s*k\.?\s*i\b/i,                                name: 'CKI',                 unit: ''    },
  { regex: /\bi\.?\s*h\.?\s*a\b/i,                                name: 'IHA',                 unit: '°'   },
  { regex: /\bi\.?\s*h\.?\s*d\b/i,                                name: 'IHD',                 unit: ''    },
  { regex: /\br\.?\s*m\.?\s*i\.?\s*n\b|r\s*min/i,                name: 'Rmin',                unit: 'mm'  },
  { regex: /a\.?\s*r\.?\s*t\.?\s*-?\s*max|artmax/i,              name: 'ART-Max',             unit: ''    },
  { regex: /\bp\.?\s*r\.?\s*f\.?\s*i\b/i,                        name: 'PRFI',                unit: ''    },
  { regex: /i\s*[\/\-]\s*s\s*(val|value)?/i,                      name: 'I-S value',           unit: 'D'   },
  { regex: /\bkisa\s*%?/i,                                        name: 'KISA%',               unit: '%'   },
  { regex: /\bs\.?\s*r\.?\s*a\.?\s*x\b/i,                        name: 'SRAX',                unit: '°'   },
  { regex: /\bs\.?\s*a\.?\s*i\b/i,                                name: 'SAI',                 unit: ''    },
  { regex: /\bs\.?\s*r\.?\s*i\b/i,                                name: 'SRI',                 unit: ''    },
  // Sirius: HVID = horizontal visible iris diameter (same as WTW)
  { regex: /\bw\.?\s*t\.?\s*w\b|white.to.white|\bhvid\b/i,       name: 'WTW',                 unit: 'mm'  },
  { regex: /\ba\.?\s*c\.?\s*d\b/i,                                name: 'ACD',                 unit: 'mm'  },
  { regex: /corneal\s*vol/i,                                       name: 'Corneal Volume',      unit: 'mm³' },
  { regex: /q[.\s]?val|aspherici?ty|\bq\s*=/i,                    name: 'Q value',             unit: ''    },
  { regex: /hoa\s*rms|total\s*hoa/i,                              name: 'HOA RMS',             unit: 'µm'  },
  { regex: /\bs\.?\s*i\.?\s*f\b|si\s*-?\s*f\b/i,                 name: 'SIf',                 unit: 'D'   },
  { regex: /\bs\.?\s*i\.?\s*b\b|si\s*-?\s*b\b/i,                 name: 'SIb',                 unit: 'D'   },
  { regex: /\bd\.?\s*s\.?\s*i\b/i,                                name: 'DSI',                 unit: ''    },
  { regex: /\bo\.?\s*s\.?\s*i\b/i,                                name: 'OSI',                 unit: ''    },
  { regex: /\bc\.?\s*s\.?\s*i\b/i,                                name: 'CSI',                 unit: ''    },
  { regex: /\bi\.?\s*a\.?\s*i\b/i,                                name: 'IAI',                 unit: ''    },
  { regex: /\ba\.?\s*a\.?\s*i\b/i,                                name: 'AAI',                 unit: ''    },
  { regex: /\bs\.?\s*d\.?\s*p\b/i,                                name: 'SDP',                 unit: ''    },
  { regex: /astigmati?sm|\bcyl\b/i,                               name: 'Astigmatism',         unit: 'D'   },
  { regex: /ppi\s*-?\s*avg/i,                                     name: 'PPI-Avg',             unit: ''    },
  { regex: /ppi\s*-?\s*min/i,                                     name: 'PPI-Min',             unit: ''    },
  { regex: /pachy\s*min|min\s*pachy/i,                            name: 'Pachymetry Min',      unit: 'µm'  },
  { regex: /\bflat\b(?!\s*k)/i,                                   name: 'Flat K',              unit: 'D'   },
  { regex: /\bsteep\b(?!\s*k)/i,                                  name: 'Steep K',             unit: 'D'   },
  { regex: /\blsa\b/i,                                            name: 'LSA',                 unit: 'D'   },
];

interface Word {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

// OCR words below this confidence level are treated as noise.
// Sirius uses red/blue colored text for K values which can drop confidence — keep threshold low.
const MIN_CONFIDENCE = 20;
// Label words (the ones matching parameter name regex) must be higher confidence
// to avoid phantom matches from photo borders, shadows, or paper bleed-through.
const LABEL_MIN_CONFIDENCE = 50;

// Plausible value ranges — values outside are rejected as mis-reads
const RANGES: Partial<Record<string, [number, number]>> = {
  'K1': [30, 65], 'K2': [30, 65], 'Kmax': [30, 70], 'Km': [30, 65],
  'SimK1': [30, 65], 'SimK2': [30, 65], 'Flat K': [30, 65], 'Steep K': [30, 65],
  'CCT': [200, 850], 'Thinnest Point': [200, 850], 'Pachymetry Min': [200, 850],
  'Anterior Elevation': [-500, 500], 'Posterior Elevation': [-500, 500],
  'BAD-D': [0, 30], 'TBI': [0, 1.05], 'CBI': [0, 1.05],
  'ISV': [0, 300], 'IVA': [0, 3], 'KI': [0.5, 2.5], 'CKI': [0, 2],
  'IHA': [0, 360], 'IHD': [0, 0.5], 'Rmin': [3, 10], 'ART-Max': [0, 600],
  'SIf': [-10, 10], 'SIb': [-10, 10], 'DSI': [-10, 300], 'OSI': [0, 300],
  'CSI': [0, 300], 'IAI': [0, 300], 'AAI': [0, 300],
  'PPI-Avg': [0, 5], 'PPI-Min': [0, 5], 'PRFI': [0, 30],
  'KISA%': [0, 2000], 'SRAX': [0, 360], 'SAI': [0, 10], 'SRI': [0, 10],
  'WTW': [8, 16], 'ACD': [1, 6], 'Corneal Volume': [20, 130],
  'Astigmatism': [-15, 15], 'Q value': [-3, 1], 'HOA RMS': [0, 10],
  'I-S value': [-20, 20], 'LSA': [0, 10],
};

// Extract numeric value from OCR'd text — tolerates units attached to digits
function parseNum(raw: string): number | null {
  const s = raw.replace(',', '.').replace(/[°µDmm%³]+$/i, '').replace(/^[^\d\-]+/, '');
  if (!s || !/\d/.test(s)) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * Find the nearest valid numeric word to `label` using 2D spatial proximity
 * rather than linear word-order. This prevents crossing column boundaries
 * in multi-column report layouts (Pentacam, Sirius, Galilei, etc.).
 *
 * Tier 1: same row, to the right, within 32% of image width.
 * Tier 2: one row below, roughly same horizontal zone.
 */
function nearbyNum(
  label: Word,
  pool: Word[],
  imgW: number,
  imgH: number,
  patName?: string
): Word | undefined {
  const lCy = (label.bbox.y0 + label.bbox.y1) / 2;
  const lX1 = label.bbox.x1;
  const rowH = imgH * 0.028;

  function valid(w: Word): boolean {
    const n = parseNum(w.text);
    if (n === null) return false;
    const rng = patName ? RANGES[patName] : undefined;
    return !rng || (n >= rng[0] && n <= rng[1]);
  }

  // Tier 1: same row, to the right
  const tier1 = pool.filter(w => {
    if (!valid(w)) return false;
    const cy = (w.bbox.y0 + w.bbox.y1) / 2;
    const cx = (w.bbox.x0 + w.bbox.x1) / 2;
    return Math.abs(cy - lCy) <= rowH
        && cx > lX1 - imgW * 0.01
        && cx <= lX1 + imgW * 0.32;
  });
  if (tier1.length) return tier1.sort((a, b) => a.bbox.x0 - b.bbox.x0)[0];

  // Tier 2: one row below, similar horizontal zone
  const tier2 = pool.filter(w => {
    if (!valid(w)) return false;
    const cy = (w.bbox.y0 + w.bbox.y1) / 2;
    const cx = (w.bbox.x0 + w.bbox.x1) / 2;
    return cy > lCy + rowH * 0.3
        && cy <= lCy + rowH * 2.5
        && cx >= label.bbox.x0 - imgW * 0.04
        && cx <= lX1 + imgW * 0.22;
  });
  return tier2.sort((a, b) => (a.bbox.y0 - b.bbox.y0) || (a.bbox.x0 - b.bbox.x0))[0];
}

// Upscale to ~2000px and convert to grayscale.
// Grayscale helps Tesseract read colored text (Sirius shows K2 in red, K1 in blue)
// which can otherwise have lower OCR confidence on color input.
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
      // Grayscale conversion: improves OCR confidence on colored text
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = g;
      }
      ctx.putImageData(id, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function analyzeWithOCR(
  imageDataUrl: string,
  onProgress: (msg: string) => void
): Promise<AnalysisResult> {
  const tesseractBase = 'http://localhost/tesseract/';

  onProgress('Downloading language model…');
  const [workerText, langBuffer] = await Promise.all([
    fetch(tesseractBase + 'worker.min.js').then((r) => r.text()),
    fetch(tesseractBase + 'eng.traineddata').then((r) => r.arrayBuffer()),
  ]);

  onProgress('Preparing OCR engine…');

  const langBlobUrl = URL.createObjectURL(
    new Blob([langBuffer], { type: 'application/octet-stream' })
  );

  const patch = `(function(){var D=${JSON.stringify(langBlobUrl)};var _f=self.fetch.bind(self);self.fetch=function(u,o){return(typeof u==='string'&&u.indexOf('.traineddata')!==-1)?_f(D,o):_f(u,o);};var _x=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){var a=[].slice.call(arguments);if(typeof u==='string'&&u.indexOf('.traineddata')!==-1)a[1]=D;return _x.apply(this,a);};})();\n`;

  const workerBlobUrl = URL.createObjectURL(
    new Blob([patch, workerText], { type: 'application/javascript' })
  );

  const worker = await createWorker('eng', 1, {
    workerPath:  workerBlobUrl,
    corePath:    tesseractBase + 'tesseract-core-lstm.wasm.js',
    langPath:    tesseractBase,
    cacheMethod: 'none' as const,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress(`Scanning… ${Math.round(m.progress * 100)}%`);
      } else if (m.status === 'loading tesseract core') {
        onProgress('Loading OCR engine…');
      } else if (m.status === 'loading language traineddata') {
        onProgress('Loading language model…');
      } else if (m.status === 'initializing tesseract') {
        onProgress('Initializing OCR…');
      }
    },
  });

  // PSM 3 = Fully automatic page segmentation — gives reliable line bboxes so every word
  // in a visual row shares the same y-coordinates, preventing per-word y-drift.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (worker as any).setParameters({
    tessedit_pageseg_mode: '3',
    preserve_interword_spaces: '1',
  });

  onProgress('Preprocessing image…');
  const processedUrl = await preprocessForOCR(imageDataUrl);

  const b64 = processedUrl.slice(processedUrl.indexOf(',') + 1);
  const binaryStr = atob(b64);
  const imgBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) imgBytes[i] = binaryStr.charCodeAt(i);

  onProgress('Running OCR…');

  let words: Word[] = [];
  let imgWidth  = 1;
  let imgHeight = 1;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await worker.recognize(imgBytes as any, {}, { blocks: true } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = data as any;

    for (const block of (page.blocks ?? [])) {
      for (const para of (block.paragraphs ?? [])) {
        for (const line of (para.lines ?? [])) {
          // Use the Tesseract LINE's bbox for y-coordinates rather than individual word bboxes.
          // With PSM-3, line segmentation is reliable: all words on the same visual row share
          // the same line bbox, eliminating per-word y-drift that caused boxes to land on
          // the wrong row.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lel = line as any;
          const lineY0: number | undefined = lel.bbox?.y0;
          const lineY1: number | undefined = lel.bbox?.y1;
          for (const word of (line.words ?? [])) {
            const w = word as Word;
            if (w.confidence >= MIN_CONFIDENCE) {
              words.push(lineY0 !== undefined && lineY1 !== undefined ? {
                ...w,
                bbox: { x0: w.bbox.x0, y0: lineY0, x1: w.bbox.x1, y1: lineY1 },
              } : w);
            }
          }
        }
      }
    }

    if (words.length > 0) {
      imgWidth  = Math.max(...words.map((w) => w.bbox.x1), 1);
      imgHeight = Math.max(...words.map((w) => w.bbox.y1), 1);
    }
  } finally {
    await worker.terminate();
    URL.revokeObjectURL(workerBlobUrl);
    URL.revokeObjectURL(langBlobUrl);
  }

  onProgress('Parsing parameters…');

  // Remove isolated words — phantom OCR reads in blank paper areas and dark
  // photo borders are always isolated (no neighbouring text around them).
  // Real text on a medical report is always surrounded by other words.
  // We keep imgWidth/imgHeight unchanged so pixel→fraction mapping stays correct.
  if (words.length > 4) {
    words = words.filter(w => {
      const cy = (w.bbox.y0 + w.bbox.y1) / 2;
      const cx = (w.bbox.x0 + w.bbox.x1) / 2;
      let neighbours = 0;
      for (const other of words) {           // 'words' still the original array here
        if (other === w) continue;
        if (Math.abs((other.bbox.y0 + other.bbox.y1) / 2 - cy) < imgHeight * 0.08 &&
            Math.abs((other.bbox.x0 + other.bbox.x1) / 2 - cx) < imgWidth  * 0.35) {
          if (++neighbours >= 2) return true; // enough neighbours → keep
        }
      }
      return false; // isolated → discard
    });
  }

  // Group words into lines by Y-centre proximity (1.5% of image height)
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

  // Record a found parameter.
  // x always anchors at the label's left edge.
  // y: with PSM-3 + line-bbox override, all words on the same visual row share the same
  //    y-coordinates (sameRow=true). When spatial search finds a value on a different row
  //    (sameRow=false — e.g. "Thinnest location" header → "481" below), the value word
  //    IS on the correct data row so we use its y.
  function recordHit(pat: { name: string; unit: string }, labelWord: Word, numWord: Word) {
    if (found.has(pat.name)) return;
    const value = parseNum(numWord.text);
    if (value === null) return;
    const rng = RANGES[pat.name];
    if (rng && (value < rng[0] || value > rng[1])) return;

    const lCy = (labelWord.bbox.y0 + labelWord.bbox.y1) / 2;
    const nCy = (numWord.bbox.y0 + numWord.bbox.y1) / 2;
    const sameRow = Math.abs(lCy - nCy) < imgHeight * 0.028;

    const x0 = labelWord.bbox.x0;
    const x1 = sameRow ? Math.max(labelWord.bbox.x1, numWord.bbox.x1) : labelWord.bbox.x1;

    // Same row → use label's line y (both share it; also covers Pass 0 exact-line matches).
    // Different rows → use value's line y (the value IS on the correct data row).
    const yWord = sameRow ? labelWord : numWord;
    const y0 = yWord.bbox.y0;
    const y1 = yWord.bbox.y1;

    found.set(pat.name, {
      value, unit: pat.unit,
      x: (x0 + x1) / 2 / imgWidth,
      y: (y0 + y1) / 2 / imgHeight,
      w: (x1 - x0) / imgWidth,
      h: (y1 - y0) / imgHeight,
    });
  }

  // Helper: does this word qualify as a label anchor?
  const isLabel = (w: Word) => w.confidence >= LABEL_MIN_CONFIDENCE;

  // Helper: is this label word immediately followed by "=" on the same line?
  // If so, Passes 1/2 must NOT use spatial search from this position —
  // it was already tried in Pass 0 and the value was out of range.
  // Spatial search from a "LABEL =" position would cross into adjacent columns.
  const hasEqualsAfter = (line: Word[], wi: number) =>
    line.slice(wi + 1, wi + 4).some(w => w.text.trim() === '=');

  // Pass 0: "LABEL = VALUE" — handles Sirius format "K1 = 41.56 D @ 12°"
  for (const line of lines) {
    for (const pat of PARAM_PATTERNS) {
      if (found.has(pat.name)) continue;
      let labelWord: Word | undefined;
      let eqIdx = -1;
      for (let wi = 0; wi < line.length; wi++) {
        if (!isLabel(line[wi])) continue;
        const joined = line.slice(wi, wi + 2).map(w => w.text).join(' ');
        if (pat.regex.test(line[wi].text) || pat.regex.test(joined)) {
          labelWord = line[wi];
          // "=" must appear within the next 3 words (handles "K1 = ", "Cyl = ", etc.)
          for (let j = wi + 1; j <= wi + 3 && j < line.length; j++) {
            if (line[j].text.trim() === '=') { eqIdx = j; break; }
          }
          break;
        }
      }
      if (!labelWord || eqIdx < 0) continue;
      const numWord = line.slice(eqIdx + 1).find(w => {
        const n = parseNum(w.text);
        if (n === null) return false;
        const rng = RANGES[pat.name];
        return !rng || (n >= rng[0] && n <= rng[1]);
      });
      if (numWord) recordHit(pat, labelWord, numWord);
    }
  }

  // Pass 1: match full line text, then locate the label word and search spatially.
  // Skip positions where the label is immediately followed by "=" — those were
  // handled (and rejected) by Pass 0; spatial search there would cross columns.
  for (const line of lines) {
    const lineText = line.map((w) => w.text).join(' ');
    for (const pat of PARAM_PATTERNS) {
      if (found.has(pat.name) || !pat.regex.test(lineText)) continue;
      let labelWord: Word | undefined;
      for (let wi = 0; wi < line.length; wi++) {
        if (!isLabel(line[wi])) continue;
        if (hasEqualsAfter(line, wi)) continue; // already tried by Pass 0
        const joined = line.slice(wi, wi + 2).map((w) => w.text).join(' ');
        if (pat.regex.test(line[wi].text) || pat.regex.test(joined)) {
          labelWord = line[wi];
          break;
        }
      }
      if (!labelWord) continue;
      const numWord = nearbyNum(labelWord, line, imgWidth, imgHeight, pat.name);
      if (numWord) recordHit(pat, labelWord, numWord);
    }
  }

  // Pass 2: spatial search across the full word pool.
  // Same "skip if followed by =" guard as Pass 1.
  for (const pat of PARAM_PATTERNS) {
    if (found.has(pat.name)) continue;
    outer: for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      for (let wi = 0; wi < line.length; wi++) {
        if (!isLabel(line[wi])) continue;
        if (hasEqualsAfter(line, wi)) continue;
        const joined = line.slice(wi, wi + 2).map((w) => w.text).join(' ');
        if (!pat.regex.test(line[wi].text) && !pat.regex.test(joined)) continue;
        const labelWord = line[wi];
        const numWord = nearbyNum(labelWord, words, imgWidth, imgHeight, pat.name);
        if (numWord) { recordHit(pat, labelWord, numWord); break outer; }
      }
    }
  }

  // Pass 3: value appears BEFORE label on the same line (reverse scan)
  for (const pat of PARAM_PATTERNS) {
    if (found.has(pat.name)) continue;
    outer: for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      for (let wi = 0; wi < line.length; wi++) {
        if (!isLabel(line[wi])) continue;
        const joined = line.slice(wi, wi + 2).map((w) => w.text).join(' ');
        if (!pat.regex.test(line[wi].text) && !pat.regex.test(joined)) continue;
        const labelWord = line[wi];
        const before = line.slice(0, wi).filter(w => {
          const n = parseNum(w.text);
          if (n === null) return false;
          const rng = RANGES[pat.name];
          return !rng || (n >= rng[0] && n <= rng[1]);
        });
        const numWord = before[before.length - 1];
        if (numWord) { recordHit(pat, labelWord, numWord); break outer; }
      }
    }
  }

  if (found.size === 0) {
    const sample = words.slice(0, 20).map((w) => w.text).filter(Boolean).join('  ');
    throw new Error(
      'No parameters found in this image.\n\n' +
      (sample ? `OCR read: "${sample}"\n\n` : 'OCR detected no text.\n\n') +
      'Tips:\n' +
      '• Screenshot the DATA/NUMBERS panel — not only the colour map\n' +
      '• Crop the image to show just the parameter table\n' +
      '• Use a clear, high-resolution, unrotated screenshot\n' +
      '• Supported: Pentacam, Sirius, Galilei, Orbscan, Atlas'
    );
  }

  const entries = Array.from(found.entries()).map(([name, d]) => ({
    name, value: d.value, unit: d.unit,
    x: d.x, y: d.y,
    // Min size ensures the box is always visible; max size prevents spanning
    // multiple columns or wrapping around OCR bbox oddities.
    width:  Math.min(Math.max(d.w, 0.04), 0.40),
    height: Math.min(Math.max(d.h, 0.02), 0.06),
  }));

  const fullText = words.map((w) => w.text).join(' ').toLowerCase();
  let device = 'Unknown';
  if (/pentacam|oculus/i.test(fullText))       device = 'Pentacam';
  // Sirius-specific labels: KVf, KVb, BCVf, BCVb — only found on CSO Sirius reports
  else if (/sirius|cso|\bkvf\b|\bkv[bf]\b|\bbcv[fb]\b/i.test(fullText)) device = 'Sirius';
  else if (/galilei|ziemer/i.test(fullText))   device = 'Galilei';
  else if (/orbscan|bausch/i.test(fullText))   device = 'Orbscan';
  else if (/atlas|zeiss/i.test(fullText))      device = 'Atlas';

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
