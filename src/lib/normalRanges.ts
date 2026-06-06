/**
 * Comprehensive normal ranges for corneal topography parameters.
 *
 * Sources:
 * - Belin MW, Ambrosio R Jr. Belin/Ambrosio Enhanced Ectasia Display. Int J Kerat Ect Cor Dis. 2013
 * - Rabinowitz YS. Keratoconus. Surv Ophthalmol. 1998
 * - Amsler M. Kératocône classique et kératocône fruste. Bull Soc Ophtalmol Fr. 1961
 * - Muftuoglu O et al. Corneal topographic analysis in forme fruste keratoconus. Ophthalmology. 2013
 * - Savini G et al. Corneal aberrations and visual acuity after myopic LASIK. J Refract Surg. 2006
 * - Schlegel Z et al. Comparison of and correlation between anterior and posterior corneal elevation maps.
 */

import type { NormalRange } from '../types/topography';

export const normalRanges: Record<string, NormalRange> = {
  // ── Keratometry ──────────────────────────────────────────────────────────
  k1: {
    displayName: 'K1 (Flat K)',
    unit: 'D',
    normalMin: 40.0,
    normalMax: 44.5,
    borderlineHigh: 46.0,
    displayRange: '40.0 – 44.5 D',
  },
  k2: {
    displayName: 'K2 (Steep K)',
    unit: 'D',
    normalMin: 40.0,
    normalMax: 46.0,
    borderlineHigh: 47.2,
    displayRange: '40.0 – 46.0 D',
  },
  km: {
    displayName: 'Km (Mean K)',
    unit: 'D',
    normalMin: 40.0,
    normalMax: 46.0,
    borderlineHigh: 47.2,
    displayRange: '40.0 – 46.0 D',
  },
  kmax: {
    displayName: 'Kmax',
    unit: 'D',
    normalMax: 47.2,
    borderlineHigh: 48.0,
    displayRange: '< 47.2 D',
  },
  simk1: {
    displayName: 'SimK1 (Flat)',
    unit: 'D',
    normalMin: 40.0,
    normalMax: 44.5,
    borderlineHigh: 46.0,
    displayRange: '40.0 – 44.5 D',
  },
  simk2: {
    displayName: 'SimK2 (Steep)',
    unit: 'D',
    normalMin: 40.0,
    normalMax: 46.0,
    borderlineHigh: 47.2,
    displayRange: '40.0 – 46.0 D',
  },
  astigmatism: {
    displayName: 'Astigmatism (Cyl)',
    unit: 'D',
    normalMax: 1.5,
    borderlineHigh: 2.5,
    displayRange: '< 1.5 D',
  },
  cyl: {
    displayName: 'Astigmatism (Cyl)',
    unit: 'D',
    normalMax: 1.5,
    borderlineHigh: 2.5,
    displayRange: '< 1.5 D',
  },

  // ── Pachymetry ────────────────────────────────────────────────────────────
  cct: {
    displayName: 'CCT (Central Corneal Thickness)',
    unit: 'µm',
    normalMin: 500,
    borderlineLow: 450,
    displayRange: '≥ 500 µm',
    higherIsBetter: true,
  },
  'min pachymetry': {
    displayName: 'Min Pachymetry',
    unit: 'µm',
    normalMin: 490,
    borderlineLow: 450,
    displayRange: '≥ 490 µm',
    higherIsBetter: true,
  },
  'thinnest point': {
    displayName: 'Thinnest Point',
    unit: 'µm',
    normalMin: 490,
    borderlineLow: 450,
    displayRange: '≥ 490 µm',
    higherIsBetter: true,
  },
  'thinnest location': {
    displayName: 'Thinnest Location',
    unit: 'mm',
    normalMax: 0.5,
    borderlineHigh: 1.0,
    displayRange: '< 0.5 mm from apex',
  },

  // ── Elevation (from Best-Fit Sphere) ─────────────────────────────────────
  'anterior elevation': {
    displayName: 'Anterior Elevation (BFS)',
    unit: 'µm',
    normalMax: 12,
    borderlineHigh: 15,
    displayRange: '< 12 µm',
  },
  'front elevation': {
    displayName: 'Front Elevation (BFS)',
    unit: 'µm',
    normalMax: 12,
    borderlineHigh: 15,
    displayRange: '< 12 µm',
  },
  'posterior elevation': {
    displayName: 'Posterior Elevation (BFS)',
    unit: 'µm',
    normalMax: 15,
    borderlineHigh: 20,
    displayRange: '< 15 µm',
  },
  'back elevation': {
    displayName: 'Back Elevation (BFS)',
    unit: 'µm',
    normalMax: 15,
    borderlineHigh: 20,
    displayRange: '< 15 µm',
  },

  // ── Pentacam Keratoconus Indices ──────────────────────────────────────────
  // Belin-Ambrosio Enhanced Ectasia Display
  isv: {
    displayName: 'ISV (Index of Surface Variance)',
    unit: '',
    normalMax: 37,
    borderlineHigh: 41,
    displayRange: '< 37',
  },
  iva: {
    displayName: 'IVA (Index of Vertical Asymmetry)',
    unit: '',
    normalMax: 0.28,
    borderlineHigh: 0.32,
    displayRange: '< 0.28',
  },
  ki: {
    displayName: 'KI (Keratoconus Index)',
    unit: '',
    normalMax: 1.07,
    borderlineHigh: 1.07,
    displayRange: '< 1.07',
  },
  cki: {
    displayName: 'CKI (Center Keratoconus Index)',
    unit: '',
    normalMax: 1.03,
    borderlineHigh: 1.03,
    displayRange: '< 1.03',
  },
  ihd: {
    displayName: 'IHD (Index Height Decentration)',
    unit: '',
    normalMax: 0.014,
    borderlineHigh: 0.016,
    displayRange: '< 0.014',
  },
  ivp: {
    displayName: 'IVP (Index Vertical Asymmetry Pachymetry)',
    unit: '',
    normalMax: 153,
    borderlineHigh: 170,
    displayRange: '< 153',
  },
  artmax: {
    displayName: 'ARTmax (Ambrosio Relational Thickness)',
    unit: '',
    normalMin: 304,
    borderlineLow: 184,
    displayRange: '≥ 304',
    higherIsBetter: true,
  },
  'bad-d': {
    displayName: 'BAD-D (Belin-Ambrosio D)',
    unit: '',
    normalMax: 1.6,
    borderlineHigh: 2.6,
    displayRange: '< 1.6',
  },
  badd: {
    displayName: 'BAD-D (Belin-Ambrosio D)',
    unit: '',
    normalMax: 1.6,
    borderlineHigh: 2.6,
    displayRange: '< 1.6',
  },
  rmin: {
    displayName: 'Rmin (Minimum Radius of Curvature)',
    unit: 'mm',
    normalMin: 6.71,
    borderlineLow: 6.5,
    displayRange: '≥ 6.71 mm',
    higherIsBetter: true,
  },

  // ── Classic Keratoconus Screening Indices ─────────────────────────────────
  'i-s value': {
    displayName: 'I-S Value (Inferior-Superior)',
    unit: 'D',
    normalMax: 1.4,
    borderlineHigh: 1.8,
    displayRange: '< 1.4 D',
  },
  'is value': {
    displayName: 'I-S Value (Inferior-Superior)',
    unit: 'D',
    normalMax: 1.4,
    borderlineHigh: 1.8,
    displayRange: '< 1.4 D',
  },
  'kisa%': {
    displayName: 'KISA%',
    unit: '%',
    normalMax: 60,
    borderlineHigh: 100,
    displayRange: '< 60%',
  },
  kisa: {
    displayName: 'KISA%',
    unit: '%',
    normalMax: 60,
    borderlineHigh: 100,
    displayRange: '< 60%',
  },
  kpi: {
    displayName: 'KPI (Keratoconus Prediction Index)',
    unit: '',
    normalMax: 0.23,
    borderlineHigh: 0.36,
    displayRange: '< 0.23',
  },
  srax: {
    displayName: 'SRAX (Skewed Radial Axis)',
    unit: '°',
    normalMax: 22,
    borderlineHigh: 45,
    displayRange: '< 22°',
  },
  sai: {
    displayName: 'SAI (Surface Asymmetry Index)',
    unit: '',
    normalMax: 0.5,
    borderlineHigh: 1.0,
    displayRange: '< 0.5',
  },
  sri: {
    displayName: 'SRI (Surface Regularity Index)',
    unit: '',
    normalMax: 0.5,
    borderlineHigh: 1.0,
    displayRange: '< 0.5',
  },

  // ── Wavefront Aberrations ─────────────────────────────────────────────────
  'hoa rms': {
    displayName: 'HOA RMS (4 mm)',
    unit: 'µm',
    normalMax: 0.3,
    borderlineHigh: 0.5,
    displayRange: '< 0.3 µm',
  },
  hoa: {
    displayName: 'HOA RMS',
    unit: 'µm',
    normalMax: 0.3,
    borderlineHigh: 0.5,
    displayRange: '< 0.3 µm',
  },
  coma: {
    displayName: 'Coma (Z3±1)',
    unit: 'µm',
    normalMax: 0.15,
    borderlineHigh: 0.3,
    displayRange: '< 0.15 µm',
  },
  trefoil: {
    displayName: 'Trefoil (Z3±3)',
    unit: 'µm',
    normalMax: 0.15,
    borderlineHigh: 0.3,
    displayRange: '< 0.15 µm',
  },
  'spherical aberration': {
    displayName: 'Spherical Aberration (Z4,0)',
    unit: 'µm',
    normalMin: -0.2,
    normalMax: 0.2,
    borderlineLow: -0.4,
    borderlineHigh: 0.4,
    displayRange: '-0.2 to +0.2 µm',
  },
  sa: {
    displayName: 'Spherical Aberration',
    unit: 'µm',
    normalMin: -0.2,
    normalMax: 0.2,
    borderlineLow: -0.4,
    borderlineHigh: 0.4,
    displayRange: '-0.2 to +0.2 µm',
  },

  // ── Biometrics ────────────────────────────────────────────────────────────
  wtw: {
    displayName: 'WTW (White-to-White)',
    unit: 'mm',
    normalMin: 11.0,
    normalMax: 12.5,
    borderlineLow: 10.5,
    borderlineHigh: 13.0,
    displayRange: '11.0 – 12.5 mm',
  },
  acd: {
    displayName: 'ACD (Anterior Chamber Depth)',
    unit: 'mm',
    normalMin: 2.5,
    normalMax: 3.8,
    borderlineLow: 2.2,
    displayRange: '2.5 – 3.8 mm',
  },
  al: {
    displayName: 'AL (Axial Length)',
    unit: 'mm',
    normalMin: 22.0,
    normalMax: 25.0,
    borderlineHigh: 26.0,
    displayRange: '22.0 – 25.0 mm',
  },

  // ── Asphericity ───────────────────────────────────────────────────────────
  q: {
    displayName: 'Q (Asphericity)',
    unit: '',
    normalMin: -0.5,
    normalMax: -0.1,
    borderlineLow: -0.7,
    borderlineHigh: 0.0,
    displayRange: '-0.5 to -0.1',
  },
  'q value': {
    displayName: 'Q Value (Asphericity)',
    unit: '',
    normalMin: -0.5,
    normalMax: -0.1,
    borderlineLow: -0.7,
    borderlineHigh: 0.0,
    displayRange: '-0.5 to -0.1',
  },
};

/** Normalize a parameter name to look up in the database. */
export function lookupNormalRange(rawName: string): NormalRange | undefined {
  const key = rawName.toLowerCase().trim();
  if (normalRanges[key]) return normalRanges[key];

  // Fuzzy matching for common variations
  for (const [k, v] of Object.entries(normalRanges)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return undefined;
}
