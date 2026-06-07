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
  // Sirius KCS labels thinnest as "Min Thickness: XXX µm"; other devices use "Thinnest" or "Thk"
  { regex: /thinn?e?s?t?\s*(p?o?i?n?t?|loc\w*)|\bthk\b|min\.?\s*pachy|\bmin\.?\s+thick/i, name: 'Thinnest Point', unit: 'µm' },
  { regex: /ant\.?\s*el?ev|front\s*el?ev/i,                       name: 'Anterior Elevation',  unit: 'µm'  },
  { regex: /post\.?\s*el?ev|back\s*el?ev/i,                       name: 'Posterior Elevation', unit: 'µm'  },
  // Sirius KC elevation indices — KVf/KVb appear in the KC Indices panel as "KVf = X µm"
  // KVb is the most sensitive Sirius KC indicator (atlas: normal < 8 µm)
  { regex: /\bkv\s*f\b/i,                                         name: 'KVf',                 unit: 'µm'  },
  { regex: /\bkv\s*b\b/i,                                         name: 'KVb',                 unit: 'µm'  },
  // Sirius BCV indices — "BCVf = X D @ Y°" in Keratoconus screening panel
  { regex: /\bbcv\s*f\b/i,                                        name: 'BCVf',                unit: 'D'   },
  { regex: /\bbcv\s*b\b/i,                                        name: 'BCVb',                unit: 'D'   },
  { regex: /b\.?\s*a\.?\s*d\.?\s*-?\s*d\b|bad\s*d/i,             name: 'BAD-D',               unit: ''    },
  { regex: /\bt\.?\s*b\.?\s*i\b/i,                                name: 'TBI',                 unit: ''    },
  { regex: /\bc\.?\s*b\.?\s*i\b/i,                                name: 'CBI',                 unit: ''    },
  { regex: /\bi\.?\s*s\.?\s*v\b/i,                                name: 'ISV',                 unit: ''    },
  { regex: /\bi\.?\s*v\.?\s*a\b/i,                                name: 'IVA',                 unit: ''    },
  { regex: /\bk\.?\s*i\b(?!s)/i,                                  name: 'KI',                  unit: ''    },
  // Sirius ARIndex (Asymmetry/Regularity Index) — appears below KI in KCS right panel
  { regex: /\bar\s*index\b|\bari\b/i,                            name: 'ARIndex',             unit: ''    },
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
  { regex: /\bcoma\b(?!\s*aberr?\b.*\bfree)/i,                   name: 'Coma',                unit: 'µm'  },
  { regex: /\btrefoil\b/i,                                        name: 'Trefoil',             unit: 'µm'  },
  { regex: /spherical\s*ab(err?)?|spher\.\s*ab|z4_0|z\s*4\s*0/i, name: 'Spherical Aberration', unit: 'µm' },
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
  // ── New Sirius Box 2C / 2E parameters ──────────────────────────────────────
  // Q Post: posterior asphericity, distinct label from anterior Q
  { regex: /\bq[\s.]*(post|back|posterior)\b/i,                  name: 'Q Post',              unit: ''    },
  // Surface RMS (deviation from best-fit sphere) — Sirius Box 2C
  { regex: /\brms\b.*\b(ant(erior)?|front)\b|\b(ant(erior)?|front)\b.*\brms\b/i, name: 'RMS Ant', unit: 'µm' },
  { regex: /\brms\b.*\b(post(erior)?|back)\b|\b(post(erior)?|back)\b.*\brms\b/i, name: 'RMS Post', unit: 'µm' },
  // Apex Curvature: tangential map value at geometric apex
  { regex: /apex\s+(curv(ature)?|tang\w*|steep)|\btang\w+\s+apex/i, name: 'Apex Curvature', unit: 'D' },
  // Apex Thickness: "Apex Thickness", "Thickness at apex", or standalone "Apex:" (Sirius label)
  // Negative lookahead excludes "Apex Curvature" / "Apex Tang" to avoid overlap with Apex Curvature.
  { regex: /apex\s+thick(ness)?|thick(ness)?\s+(?:at\s+)?apex|\bapex\s*:(?!\s*(?:curv|tang|steep))/i, name: 'Apex Thickness', unit: 'µm' },
  // Pupil Diameter from Sirius Box 2A — "Pupil dia.:" or "Pupil Ø:"
  { regex: /pupil\s+(diam?(eter)?|dia\.?|size|ø|Ø)/i,            name: 'Pupil Diameter',      unit: 'mm'  },
  // AC Volume — Sirius "Aq. Volume" / "AC Volume", Pentacam "Chamber Volume", Galilei "ACV"
  { regex: /\ba\.?\s*c\.?\s*vol(ume)?|ant\w*\s+cham\w+\s+vol|chamber\s+vol(ume)?|\bacv\b|\baq\w*\.?\s+vol/i, name: 'AC Volume', unit: 'mm³' },
  // ── Multi-device: Eccentricity (shape factor) + AC Angle ──────────────────
  { regex: /\beccentricity\b|\be\s*\(\s*\d+(?:\.\d+)?\s*mm\s*\)/i, name: 'Eccentricity',       unit: ''    },
  { regex: /\ba\.?\s*c\.?\s*angle\b|ant\w*\s+cham\w*\s+angle|mean\s+angle\b|\baqd\b/i, name: 'AC Angle', unit: '°' },
  // ── Galilei Box 3E: KC probability indices ─────────────────────────────────
  { regex: /\bkpi\b|k(?:eratoconus)?\s*prob\w*\s*index/i,          name: 'KPI',                 unit: '%'   },
  { regex: /\bppk\b|pellucid.*prob|prob.*pellucid/i,                name: 'PPK',                 unit: '%'   },
  { regex: /\bclmi(?:aa)?\b|cone\s+loc\w+\s+magn/i,                name: 'CLMIaa',              unit: 'D'   },
  // ── Orbscan Box 3B: corneal irregularity + BFS ratio ──────────────────────
  { regex: /irreg\w*\s*3\s*mm|3[\s.]?mm\s*irreg/i,                 name: 'Irregularity 3mm',    unit: 'D'   },
  { regex: /irreg\w*\s*5\s*mm|5[\s.]?mm\s*irreg/i,                 name: 'Irregularity 5mm',    unit: 'D'   },
  { regex: /bfs\s*ratio|ant\w*\s*bfs.*\/.*post\w*|post.*bfs.*ratio/i, name: 'BFS Ratio',        unit: ''    },
];

interface Word {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

// ── Device-specific panel layout ─────────────────────────────────────────────
// Coarse x-axis gate: remove words outside the device's data-table region.
// Pentacam 4-map refractive uses ALL four quadrants across full width → [0.0, 1.0].
// Sirius KCS right panel: parameters concentrated in x > 33 %.
// Sources: Pentacam Interpretation Guide (Oculus, 2024); CSO Sirius Phoenix manual;
//          corneal-topography-reader reference package (uploaded 2025-06)
const DEVICE_PANEL: Partial<Record<string, [number, number]>> = {
  'Pentacam': [0.00, 1.00],  // 4-map: K (UL), elevation (UR), pachy (LL), Kmax/post (LR)
  'Sirius':   [0.33, 1.00],
  'Galilei':  [0.38, 1.00],
  'Orbscan':  [0.35, 1.00],  // data sidebar on right; 4-map body occupies left portion
};

// ── Per-parameter bounding box [xMin, xMax, yMin, yMax] per device ───────────
// Image fractions (0–1). Generous ±12 % margins tolerate crops and firmware variants.
//
// Pentacam 4-Map Refractive (Oculus):
//   Upper-left  (x 0–58%, y 8–62%): K1, K2, Km, Astigmatism, Q value, Eccentricity (Box 2B)
//   Upper-left  (x 0–58%, y 30–65%): K1 back, Q Post, Eccentricity back (Box 2C)
//   Lower-left  (x 0–58%, y 52–97%): CCT, Thinnest Point, Apex Thickness, Corneal Volume,
//                                      Chamber Volume (= AC Volume), ACD, AC Angle (Box 2D)
//   Upper-right (x 40–100%, y 8–62%): Anterior Elevation, Q value (Box 2B)
//   Lower-right (x 40–100%, y 8–97%): Kmax, Posterior Elevation (lower-right)
//   BAD/Topometric (separate screen): BAD-D, ART-Max, ISV, IVA …
//
// Sirius KCS — right panel (x > 33%), section stack (top → bottom):
//   [0.03–0.45] KC indices  : KI, ARIndex
//   [0.02–0.38] Box 2A      : Apex Curvature, Apex Thickness, Pupil Diameter, AC Volume
//   [0.32–0.62] Box 2B K    : SimK1, SimK2, Astigmatism, K1, K2
//   [0.24–0.55] Biometry    : WTW, ACD
//   [0.38–0.62] Box 2C Shape: Q value, Q Post, RMS Ant, RMS Post
//   [0.45–0.92] Box 2D KC   : SIf, SIb, KVf, KVb, BCVf, BCVb
//   [0.68–1.00] Aberrations : HOA RMS, Coma, Trefoil, Spherical Aberration
//
// Galilei Refractive Report — right panel (x > 38%), section stack (top → bottom):
//   [0.05–0.45] Box 3A SimK : SimK1, SimK2, Astigmatism, Q value, Eccentricity
//   [0.35–0.65] Box 3B Post K: K1, K2 (posterior)
//   [0.45–0.75] Box 3C Pachy: CCT, Thinnest Point, Corneal Volume
//   [0.60–0.88] Box 3D Biom : WTW, ACD, AC Angle, AC Volume, Pupil Diameter
//   [0.75–1.00] Box 3E KC   : KPI, PPK, CLMIaa, SRI, SAI, I-S value
const PARAM_SITES: Partial<Record<string, Partial<Record<string, [number, number, number, number]>>>> = {
  // ── Pentacam Box 2B / Galilei Box 3A: anterior K readings ─────────────────
  'K1':    { Pentacam: [0.00, 0.58, 0.08, 0.62], Galilei: [0.38, 1.00, 0.05, 0.45] },
  'K2':    { Pentacam: [0.00, 0.58, 0.08, 0.62], Galilei: [0.38, 1.00, 0.05, 0.45] },
  'Km':    { Pentacam: [0.00, 0.58, 0.08, 0.62], Galilei: [0.38, 1.00, 0.05, 0.45] },
  'Flat K':  { Pentacam: [0.00, 0.58, 0.08, 0.62] },
  'Steep K': { Pentacam: [0.00, 0.58, 0.08, 0.62] },
  'Astigmatism': { Pentacam: [0.00, 0.58, 0.08, 0.65], Sirius: [0.33, 1.00, 0.32, 0.62], Galilei: [0.38, 1.00, 0.05, 0.65] },
  // ── Pentacam upper-right: anterior elevation + Q ───────────────────────────
  'Anterior Elevation': { Pentacam: [0.40, 1.00, 0.08, 0.62] },
  // Q value: Pentacam UL (Box 2B front) / Sirius Box 2C / Galilei Box 3A
  'Q value':  { Pentacam: [0.00, 0.58, 0.08, 0.65], Sirius: [0.33, 1.00, 0.38, 0.62], Galilei: [0.38, 1.00, 0.05, 0.45] },
  // Q Post: Pentacam Box 2C (back cornea, left column) / Sirius Box 2C
  'Q Post':   { Pentacam: [0.00, 0.58, 0.30, 0.65], Sirius: [0.33, 1.00, 0.38, 0.62] },
  // Eccentricity (shape factor): Pentacam Box 2B/2C, Galilei Box 3A
  'Eccentricity': { Pentacam: [0.00, 0.58, 0.08, 0.65], Galilei: [0.38, 1.00, 0.05, 0.45] },
  // ── Pentacam lower-left / Galilei Box 3C: pachymetry ──────────────────────
  'CCT':           { Pentacam: [0.00, 0.58, 0.52, 0.97], Sirius: [0.33, 1.00, 0.44, 0.76], Galilei: [0.38, 1.00, 0.45, 0.75] },
  'Thinnest Point':{ Pentacam: [0.00, 0.58, 0.52, 0.97], Sirius: [0.33, 1.00, 0.44, 0.76], Galilei: [0.38, 1.00, 0.45, 0.75] },
  'Pachymetry Min':{ Pentacam: [0.00, 0.58, 0.52, 0.97], Sirius: [0.33, 1.00, 0.44, 0.76] },
  'Apex Thickness':{ Pentacam: [0.00, 0.58, 0.52, 0.97], Sirius: [0.33, 1.00, 0.05, 0.45] },
  'Corneal Volume':{ Pentacam: [0.00, 0.58, 0.52, 0.97], Sirius: [0.33, 1.00, 0.44, 0.76], Galilei: [0.38, 1.00, 0.45, 0.75] },
  // ── Biometry: ACD, WTW, AC Volume, AC Angle, Pupil Diameter ───────────────
  'ACD':          { Pentacam: [0.00, 0.58, 0.52, 0.97], Sirius: [0.33, 1.00, 0.22, 0.55], Galilei: [0.38, 1.00, 0.60, 0.88] },
  'WTW':          { Sirius: [0.33, 1.00, 0.20, 0.55], Galilei: [0.38, 1.00, 0.60, 0.88] },
  'AC Volume':    { Pentacam: [0.00, 0.58, 0.52, 0.97], Sirius: [0.33, 1.00, 0.05, 0.45], Galilei: [0.38, 1.00, 0.60, 0.88] },
  'AC Angle':     { Pentacam: [0.00, 0.58, 0.52, 0.97], Sirius: [0.33, 1.00, 0.05, 0.45], Galilei: [0.38, 1.00, 0.60, 0.88] },
  'Pupil Diameter':{ Pentacam: [0.00, 0.58, 0.52, 0.97], Sirius: [0.33, 1.00, 0.02, 0.38], Galilei: [0.38, 1.00, 0.60, 0.88] },
  // ── Pentacam lower-right: Kmax + posterior elevation ───────────────────────
  'Kmax':               { Pentacam: [0.40, 1.00, 0.08, 0.97] },
  'Posterior Elevation':{ Pentacam: [0.40, 1.00, 0.52, 0.97] },
  // ── Sirius SimK (Box 2B) ────────────────────────────────────────────────────
  'SimK1': { Sirius: [0.33, 1.00, 0.32, 0.62] },
  'SimK2': { Sirius: [0.33, 1.00, 0.32, 0.62] },
  // ── Sirius KC indices top (KI, ARIndex) ─────────────────────────────────────
  // x starts at 0.55 to avoid the K-readings formula zone where "1.3375" constants appear.
  'KI':      { Sirius: [0.55, 1.00, 0.03, 0.45] },
  'ARIndex': { Sirius: [0.55, 1.00, 0.03, 0.45] },
  // ── Sirius Box 2A: summary/biometry (top of right panel) ───────────────────
  'Apex Curvature': { Sirius: [0.33, 1.00, 0.05, 0.45] },
  // ── Sirius Box 2C: Shape Indices (Q, RMS, below K readings) ────────────────
  'RMS Ant':  { Sirius: [0.33, 1.00, 0.38, 0.65] },
  'RMS Post': { Sirius: [0.33, 1.00, 0.38, 0.65] },
  // ── Sirius Box 2D: KC screening indices (below KC Screening header at y≈0.53-0.55)
  // yMin 0.56 ensures the label matches data rows, not the section header text above.
  'SIf':  { Sirius: [0.33, 1.00, 0.56, 0.92] },
  'SIb':  { Sirius: [0.33, 1.00, 0.56, 0.92] },
  'KVf':  { Sirius: [0.33, 1.00, 0.56, 0.92] },
  'KVb':  { Sirius: [0.33, 1.00, 0.56, 0.92] },
  'BCVf': { Sirius: [0.33, 1.00, 0.56, 0.92] },
  'BCVb': { Sirius: [0.33, 1.00, 0.56, 0.92] },
  // ── Sirius aberrations section ──────────────────────────────────────────────
  'HOA RMS':            { Sirius: [0.33, 1.00, 0.68, 1.00] },
  'Coma':               { Sirius: [0.33, 1.00, 0.68, 1.00] },
  'Trefoil':            { Sirius: [0.33, 1.00, 0.68, 1.00] },
  'Spherical Aberration':{ Sirius: [0.33, 1.00, 0.68, 1.00] },
  // ── Galilei Box 3E: KC probability indices ─────────────────────────────────
  'KPI':    { Galilei: [0.38, 1.00, 0.75, 1.00] },
  'PPK':    { Galilei: [0.38, 1.00, 0.75, 1.00] },
  'CLMIaa': { Galilei: [0.38, 1.00, 0.75, 1.00] },
  'SAI':    { Galilei: [0.38, 1.00, 0.75, 1.00] },
  'SRI':    { Galilei: [0.38, 1.00, 0.75, 1.00] },
  // ── Orbscan Box 3B: irregularity + BFS ratio (broad — no device map available) ─
  'Irregularity 3mm': { Orbscan: [0.30, 1.00, 0.20, 0.80] },
  'Irregularity 5mm': { Orbscan: [0.30, 1.00, 0.20, 0.80] },
  'BFS Ratio':        { Orbscan: [0.30, 1.00, 0.20, 0.80] },
  // Pentacam BAD/Topometric display is a separate screen (full-width layout).
  // No spatial restriction for BAD-D, ART-Max, ISV, IVA, CKI, etc.
};

// OCR words below this confidence level are treated as noise.
// Sirius uses red/blue colored text for K values which can drop confidence — keep threshold low.
const MIN_CONFIDENCE = 20;
// Label words (the ones matching parameter name regex) must be higher confidence
// to avoid phantom matches from photo borders, shadows, or paper bleed-through.
const LABEL_MIN_CONFIDENCE = 50;

// Values that must NEVER be accepted for a given parameter, even if inside RANGES.
// Keratometric index constants (1.3375, 1.336, 1.376) are printed verbatim on K-readings
// panels of Sirius / Pentacam reports and would otherwise pass the KI range [0.5, 2.5].
const EXCLUDED_VALUES: Partial<Record<string, Set<number>>> = {
  'KI': new Set([1.3375, 1.3315, 1.336, 1.376]),
};

// Parameters that must NEVER appear in results for a given device.
// Sirius uses SIf/SIb/KVf/KVb/BCVf/BCVb for KC screening — it does NOT report the
// Pentacam-style KI, CKI, IHD, IHA, PRFI, or BAD-D indices.
// Including them would produce false positives from incidental text on Sirius printouts.
const DEVICE_BLOCK: Partial<Record<string, Set<string>>> = {
  // Sirius: Q values are in the left "Shape Indices" panel (x < 0.33) — not in the right column.
  // Blocking Q value prevents the left-panel reads whose bounding box can straddle x=0.33.
  'Sirius': new Set(['KI', 'CKI', 'IHA', 'IHD', 'BAD-D', 'PRFI', 'ART-Max', 'ISV', 'IVA', 'Rmin',
                     'Q value', 'CLMIaa', 'KPI', 'PPK',
                     'Irregularity 3mm', 'Irregularity 5mm', 'BFS Ratio']),
  // Pentacam: no Sirius BCV/KV/SI indices or Surface RMS; no Galilei/Orbscan specifics.
  'Pentacam': new Set(['SIf', 'SIb', 'KVf', 'KVb', 'BCVf', 'BCVb', 'ARIndex',
                       'RMS Ant', 'RMS Post', 'Apex Curvature',
                       'CLMIaa', 'Irregularity 3mm', 'Irregularity 5mm', 'BFS Ratio']),
  // Galilei: no Sirius-specific or Pentacam-specific indices; no Orbscan irregularity.
  'Galilei': new Set(['SIf', 'SIb', 'KVf', 'KVb', 'BCVf', 'BCVb', 'ARIndex',
                      'KI', 'CKI', 'IHA', 'IHD', 'BAD-D', 'PRFI', 'ART-Max', 'ISV', 'IVA',
                      'RMS Ant', 'RMS Post', 'Apex Curvature',
                      'Irregularity 3mm', 'Irregularity 5mm', 'BFS Ratio']),
  // Orbscan: no Sirius/Pentacam/Galilei indices; Irregularity/BFS Ratio are Orbscan-specific.
  'Orbscan': new Set(['SIf', 'SIb', 'KVf', 'KVb', 'BCVf', 'BCVb', 'ARIndex',
                      'KI', 'CKI', 'IHA', 'IHD', 'BAD-D', 'PRFI', 'ART-Max', 'ISV', 'IVA',
                      'RMS Ant', 'RMS Post', 'Apex Curvature', 'CLMIaa']),
};

// Plausible value ranges — values outside are rejected as mis-reads
const RANGES: Partial<Record<string, [number, number]>> = {
  'K1': [30, 65], 'K2': [30, 65], 'Kmax': [30, 70], 'Km': [30, 65],
  'SimK1': [30, 65], 'SimK2': [30, 65], 'Flat K': [30, 65], 'Steep K': [30, 65],
  'CCT': [200, 850], 'Thinnest Point': [200, 850], 'Pachymetry Min': [200, 850],
  'Anterior Elevation': [-500, 500], 'Posterior Elevation': [-500, 500],
  'BAD-D': [0, 30], 'TBI': [0, 1.05], 'CBI': [0, 1.05],
  'KVf': [0, 200], 'KVb': [0, 200],
  'BCVf': [0, 15], 'BCVb': [0, 15],
  'ISV': [0, 300], 'IVA': [0, 3], 'KI': [0.5, 2.5], 'CKI': [0, 2], 'ARIndex': [0, 2],
  'IHA': [0, 360], 'IHD': [0, 0.5], 'Rmin': [3, 10], 'ART-Max': [0, 600],
  'SIf': [-3, 3], 'SIb': [-1.5, 1.5], 'DSI': [-10, 300], 'OSI': [0, 300],
  'CSI': [0, 300], 'IAI': [0, 300], 'AAI': [0, 300],
  'PPI-Avg': [0, 5], 'PPI-Min': [0, 5], 'PRFI': [0, 30],
  'KISA%': [0, 2000], 'SRAX': [0, 360], 'SAI': [0, 10], 'SRI': [0, 10],
  'WTW': [8, 16], 'ACD': [1, 6], 'Corneal Volume': [20, 130],
  'Astigmatism': [-15, 15], 'Q value': [-3, 1], 'Q Post': [-3, 1],
  'HOA RMS': [0, 10], 'Coma': [0, 5], 'Trefoil': [0, 5], 'Spherical Aberration': [-2, 2],
  'I-S value': [-20, 20], 'LSA': [0, 10],
  'RMS Ant': [0, 20], 'RMS Post': [0, 20],
  'Apex Curvature': [30, 70], 'Apex Thickness': [200, 800],
  'Pupil Diameter': [1, 10], 'AC Volume': [50, 400],
  'Eccentricity': [0, 2], 'AC Angle': [5, 60],
  'KPI': [0, 100], 'PPK': [0, 100], 'CLMIaa': [0, 10],
  'Irregularity 3mm': [0, 10], 'Irregularity 5mm': [0, 10], 'BFS Ratio': [0.8, 1.5],
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
    if (rng && (n < rng[0] || n > rng[1])) return false;
    const excl = patName ? EXCLUDED_VALUES[patName] : undefined;
    if (excl && excl.has(n)) return false;
    return true;
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
// Returns both the processed dataUrl AND the exact canvas pixel dimensions.
// The canvas dimensions are the ground-truth for OCR bbox fractions — do NOT
// use max(word.bbox.x1/y1) as a proxy, because camera photos of printouts often
// have empty desk background below/beside the paper. No words appear there, so
// max(y1) ≈ bottom-of-printout rather than bottom-of-image, inflating all
// y-fractions and pushing every overlay box downward by up to 2×.
async function preprocessForOCR(dataUrl: string): Promise<{ url: string; w: number; h: number }> {
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
      resolve({ url: canvas.toDataURL('image/jpeg', 0.92), w: canvas.width, h: canvas.height });
    };
    img.onerror = () => {
      const fallback = document.createElement('canvas');
      fallback.width = 1; fallback.height = 1;
      resolve({ url: dataUrl, w: 1, h: 1 });
    };
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
  const { url: processedUrl, w: canvasW, h: canvasH } = await preprocessForOCR(imageDataUrl);

  const b64 = processedUrl.slice(processedUrl.indexOf(',') + 1);
  const binaryStr = atob(b64);
  const imgBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) imgBytes[i] = binaryStr.charCodeAt(i);

  onProgress('Running OCR…');

  let words: Word[] = [];
  // Use exact canvas dimensions as the coordinate space for OCR bboxes.
  // Do NOT use max(word.bbox.x1/y1): if the printout occupies only the top portion
  // of a camera photo, the max-word approach gives a height much smaller than the
  // real image, inflating all y-fractions and pushing every overlay box downward.
  let imgWidth  = canvasW;
  let imgHeight = canvasH;

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
    const excl = EXCLUDED_VALUES[pat.name];
    if (excl && excl.has(value)) return;

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

  const fullText = words.map((w) => w.text).join(' ').toLowerCase();
  let device = 'Unknown';
  if (/pentacam|oculus/i.test(fullText))       device = 'Pentacam';
  // Sirius-specific labels: KVf, KVb, BCVf, BCVb — only found on CSO Sirius reports
  else if (/sirius|cso|\bkvf\b|\bkv[bf]\b|\bbcv[fb]\b/i.test(fullText)) device = 'Sirius';
  else if (/galilei|ziemer/i.test(fullText))   device = 'Galilei';
  else if (/orbscan|bausch/i.test(fullText))   device = 'Orbscan';
  else if (/atlas|zeiss/i.test(fullText))      device = 'Atlas';

  // Panel-region filter (x-axis): remove hits outside the device's data-table column.
  // Eliminates false positives from colour-map labels, scale bars, axis legends.
  const panel = DEVICE_PANEL[device];
  if (panel) {
    for (const [name, d] of found) {
      if (d.x < panel[0] || d.x > panel[1]) found.delete(name);
    }
  }

  // Section-region filter (x + y): remove hits outside the parameter's known
  // bounding box [xMin, xMax, yMin, yMax] within the printout.
  // Each device has a confirmed panel layout (see PARAM_SITES above).
  for (const [name, d] of found) {
    const sites = PARAM_SITES[name];
    if (!sites) continue;
    const bounds = sites[device];
    if (!bounds) continue;
    // bounds = [xMin, xMax, yMin, yMax]
    if (d.x < bounds[0] || d.x > bounds[1] || d.y < bounds[2] || d.y > bounds[3]) {
      found.delete(name);
    }
  }

  // Device-specific parameter blocklist: hard-remove indices that belong only to
  // the other device family (Pentacam vs Sirius) to prevent cross-contamination.
  const block = DEVICE_BLOCK[device];
  if (block) {
    for (const name of block) found.delete(name);
  }

  let eye: AnalysisResult['eye'] = 'unknown';
  if (/\bod\b|right\s+eye/i.test(fullText)) eye = 'OD';
  else if (/\bos\b|left\s+eye/i.test(fullText)) eye = 'OS';
  else if (/\bou\b/i.test(fullText)) eye = 'OU';

  // Build entries AFTER all spatial filters so only passing parameters are included.
  // (Moving this before filters caused filtered-out params to still appear as boxes.)
  const entries = Array.from(found.entries()).map(([name, d]) => ({
    name, value: d.value, unit: d.unit,
    x: d.x, y: d.y,
    width:  Math.min(Math.max(d.w, 0.04), 0.40),
    height: Math.min(Math.max(d.h, 0.02), 0.06),
  }));

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
