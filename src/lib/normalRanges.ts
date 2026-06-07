/**
 * Comprehensive normal ranges for corneal topography / tomography parameters.
 *
 * Sources (all 2024–2025 peer-reviewed):
 * - Rabinowitz & McDonnell 1989 (I-S index)
 * - Rabinowitz & Rasheed 1999 (KISA%)
 * - Belin et al. 2020 (ABCD grading, BAD-D)
 * - Doctor et al. 2020, Indian J Ophthalmol 68(12):2732–2743
 * - Motlagh et al. 2019 (Pentacam review, Part I)
 * - Moshirfar et al. 2019 (Galilei review, Part II)
 * - Salman et al. 2022 (Sirius indices)
 * - Gharieb et al. 2021 (Sirius/Placido combined)
 * - MDPI Diagnostics 2024 (PRFI)
 * - Corneal Biomechanics / TBI paper (2023)
 *
 * Master reference: "Comprehensive Reference Guide to Corneal Topography
 * and Tomography" (Manus AI compilation, 2024–2025).
 */

import type { NormalRange } from '../types/topography';

export const normalRanges: Record<string, NormalRange> = {

  // ── Keratometry ──────────────────────────────────────────────────────────
  k1: {
    displayName: 'K1 (Flat Meridian)',
    unit: 'D',
    normalMin: 40.0,
    normalMax: 44.0,
    borderlineHigh: 46.0,
    displayRange: '40.0 – 44.0 D',
  },
  k2: {
    displayName: 'K2 (Steep Meridian)',
    unit: 'D',
    normalMin: 41.0,
    normalMax: 46.0,
    borderlineHigh: 47.2,
    displayRange: '41.0 – 46.0 D',
  },
  km: {
    displayName: 'Km (Mean K)',
    unit: 'D',
    normalMin: 43.0,
    normalMax: 45.0,
    borderlineHigh: 47.2,
    displayRange: '43.0 – 45.0 D',
  },
  kmax: {
    displayName: 'Kmax',
    unit: 'D',
    normalMax: 47.2,
    borderlineHigh: 48.7,
    displayRange: '< 47.2 D',
  },
  simk1: {
    displayName: 'SimK1 (Flat)',
    unit: 'D',
    normalMin: 40.0,
    normalMax: 44.0,
    borderlineHigh: 47.2,
    displayRange: '40.0 – 44.0 D',
  },
  simk2: {
    displayName: 'SimK2 (Steep)',
    unit: 'D',
    normalMin: 41.0,
    normalMax: 47.2,
    borderlineHigh: 48.7,
    displayRange: '41.0 – 47.2 D',
  },
  'simk max': {
    displayName: 'SimK Max',
    unit: 'D',
    normalMax: 47.2,
    borderlineHigh: 48.7,
    displayRange: '< 47.2 D',
  },
  astigmatism: {
    displayName: 'Corneal Astigmatism (Cyl)',
    unit: 'D',
    normalMax: 1.5,
    borderlineHigh: 2.5,
    displayRange: '< 1.5 D (regular)',
  },
  cyl: {
    displayName: 'Corneal Astigmatism (Cyl)',
    unit: 'D',
    normalMax: 1.5,
    borderlineHigh: 2.5,
    displayRange: '< 1.5 D (regular)',
  },

  // ── Pachymetry ────────────────────────────────────────────────────────────
  cct: {
    displayName: 'CCT (Central Corneal Thickness)',
    unit: 'µm',
    normalMin: 520,
    normalMax: 560,
    borderlineLow: 480,
    displayRange: '520 – 560 µm',
    higherIsBetter: true,
  },
  'pachy apex': {
    displayName: 'Pachy Apex (CCT)',
    unit: 'µm',
    normalMin: 520,
    normalMax: 560,
    borderlineLow: 480,
    displayRange: '520 – 560 µm',
    higherIsBetter: true,
  },
  'thinnest location': {
    displayName: 'Thinnest Point',
    unit: 'µm',
    normalMin: 500,
    borderlineLow: 450,
    displayRange: '≥ 500 µm',
    higherIsBetter: true,
  },
  'min pachymetry': {
    displayName: 'Min Pachymetry',
    unit: 'µm',
    normalMin: 500,
    borderlineLow: 450,
    displayRange: '≥ 500 µm',
    higherIsBetter: true,
  },
  'thinnest point': {
    displayName: 'Thinnest Point',
    unit: 'µm',
    normalMin: 500,
    borderlineLow: 450,
    displayRange: '≥ 500 µm',
    higherIsBetter: true,
  },
  'thinnest displacement': {
    displayName: 'Thinnest Point Displacement',
    unit: 'mm',
    normalMax: 0.5,
    borderlineHigh: 1.0,
    displayRange: '< 0.5 mm from apex',
  },
  // Pachymetric Progression Index
  'ppi avg': {
    displayName: 'PPI-Avg (Pachymetric Progression)',
    unit: '',
    normalMax: 0.46,       // mean 0.13, 2 SD above mean ~0.79 borderline
    borderlineHigh: 0.79,
    displayRange: '0.13 ± 0.33 (normal mean)',
  },
  'ppi max': {
    displayName: 'PPI-Max',
    unit: '',
    normalMax: 1.03,
    borderlineHigh: 1.21,
    displayRange: '0.85 ± 0.18 (normal mean)',
  },

  // ── Elevation (BFS) ───────────────────────────────────────────────────────
  // Elevation thresholds per corneal-topography-reader reference (Belin 2013, Saad 2010)
  'anterior elevation': {
    displayName: 'Anterior Elevation (BFS, 8 mm)',
    unit: 'µm',
    normalMax: 12,
    borderlineHigh: 16,
    displayRange: '≤ +12 µm',
  },
  'front elevation': {
    displayName: 'Front Elevation (BFS)',
    unit: 'µm',
    normalMax: 12,
    borderlineHigh: 16,
    displayRange: '≤ +12 µm',
  },
  // Posterior elevation is the most sensitive early KC marker
  'posterior elevation': {
    displayName: 'Posterior Elevation (BFS, 8 mm)',
    unit: 'µm',
    normalMax: 15,
    borderlineHigh: 22,
    displayRange: '≤ +15 µm',
  },
  'back elevation': {
    displayName: 'Back Elevation (BFS)',
    unit: 'µm',
    normalMax: 15,
    borderlineHigh: 22,
    displayRange: '≤ +15 µm',
  },
  // Elevation — Best Fit Toric Ellipsoid (BFTE)
  'anterior elevation bfte': {
    displayName: 'Anterior Elevation (BFTE)',
    unit: 'µm',
    normalMax: 8,
    borderlineHigh: 12,
    displayRange: '≤ +8 µm',
  },
  'posterior elevation bfte': {
    displayName: 'Posterior Elevation (BFTE)',
    unit: 'µm',
    normalMax: 12,
    borderlineHigh: 15,
    displayRange: '≤ +12 µm',
  },
  'front elevation bfte': {
    displayName: 'Front Elevation (BFTE)',
    unit: 'µm',
    normalMax: 8,
    borderlineHigh: 12,
    displayRange: '≤ +8 µm',
  },
  'back elevation bfte': {
    displayName: 'Back Elevation (BFTE)',
    unit: 'µm',
    normalMax: 12,
    borderlineHigh: 15,
    displayRange: '≤ +12 µm',
  },

  // ── Pentacam BAD Ectasia Display ──────────────────────────────────────────
  'bad-d': {
    displayName: 'BAD-D (Belin/Ambrósio D)',
    unit: 'SD',
    normalMax: 1.6,
    borderlineHigh: 2.6,
    displayRange: '< 1.6 SD (white zone)',
  },
  badd: {
    displayName: 'BAD-D (Belin/Ambrósio D)',
    unit: 'SD',
    normalMax: 1.6,
    borderlineHigh: 2.6,
    displayRange: '< 1.6 SD (white zone)',
  },

  // Ambrósio Relational Thickness (ART) — higher = better/normal
  // Cutoff 304 µm from Belin & Ambrosio ROC analysis (J Refract Surg 2011)
  // Sensitivity 88%, specificity 92%, AUC 0.97
  artmax: {
    displayName: 'ART-Max (Ambrósio Relational Thickness)',
    unit: '',
    normalMin: 304,
    borderlineLow: 260,
    displayRange: '> 304',
    higherIsBetter: true,
  },
  'art max': {
    displayName: 'ART-Max',
    unit: '',
    normalMin: 304,
    borderlineLow: 260,
    displayRange: '> 304',
    higherIsBetter: true,
  },
  artavg: {
    displayName: 'ART-Avg',
    unit: '',
    normalMin: 339,
    borderlineLow: 280,
    displayRange: '> 339',
    higherIsBetter: true,
  },

  // ── Pentacam Topometric / Keratoconus Indices ─────────────────────────────
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
    borderlineHigh: 1.15,
    displayRange: '< 1.07',
  },
  cki: {
    displayName: 'CKI (Center Keratoconus Index)',
    unit: '',
    normalMax: 1.03,
    borderlineHigh: 1.03,
    displayRange: '< 1.03',
  },
  iha: {
    displayName: 'IHA (Index of Height Asymmetry)',
    unit: '',
    normalMax: 17,
    borderlineHigh: 22,
    displayRange: '< 17',
  },
  ihd: {
    displayName: 'IHD (Index of Height Decentration)',
    unit: '',
    normalMax: 0.014,
    borderlineHigh: 0.016,
    displayRange: '< 0.014',
  },
  rmin: {
    displayName: 'Rmin (Min Radius of Curvature)',
    unit: 'mm',
    normalMin: 6.71,
    borderlineLow: 6.35,
    displayRange: '> 6.71 mm',
    higherIsBetter: true,
  },

  // ── Pentacam AI Index (PRFI) ──────────────────────────────────────────────
  prfi: {
    displayName: 'PRFI (Pentacam Random Forest Index)',
    unit: '',
    normalMax: 0.125,
    borderlineHigh: 0.200,
    displayRange: '< 0.125',
  },

  // ── Classic Placido Screening Indices ─────────────────────────────────────
  'i-s value': {
    displayName: 'I-S Value (Inferior-Superior Asymmetry)',
    unit: 'D',
    normalMax: 1.2,
    borderlineHigh: 1.4,
    displayRange: '< 1.2 D',
  },
  'is value': {
    displayName: 'I-S Value (Inferior-Superior)',
    unit: 'D',
    normalMax: 1.2,
    borderlineHigh: 1.4,
    displayRange: '< 1.2 D',
  },
  'i/s': {
    displayName: 'I-S Value',
    unit: 'D',
    normalMax: 1.2,
    borderlineHigh: 1.4,
    displayRange: '< 1.2 D',
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
    unit: '%',
    normalMax: 23,
    borderlineHigh: 30,
    displayRange: '< 23%',
  },
  srax: {
    displayName: 'SRAX (Skewed Radial Axis)',
    unit: '°',
    normalMax: 21,
    borderlineHigh: 21,
    displayRange: '< 21°',
  },
  sai: {
    displayName: 'SAI (Surface Asymmetry Index)',
    unit: '',
    normalMax: 0.50,
    borderlineHigh: 0.75,
    displayRange: '< 0.50',
  },
  sri: {
    displayName: 'SRI (Surface Regularity Index)',
    unit: '',
    normalMax: 1.00,
    borderlineHigh: 1.55,
    displayRange: '< 1.00',
  },

  // ── Galilei-Specific Indices ───────────────────────────────────────────────
  aai: {
    displayName: 'AAI (Asphericity Asymmetry Index)',
    unit: '',
    normalMax: 25,
    borderlineHigh: 30,
    displayRange: '< 25',
  },
  csi: {
    displayName: 'CSI (Center/Surround Index)',
    unit: '',
    normalMax: 0.30,
    borderlineHigh: 1.00,
    displayRange: '< 0.30',
  },
  dsi: {
    displayName: 'DSI (Differential Sector Index)',
    unit: '',
    normalMax: 1.50,
    borderlineHigh: 3.50,
    displayRange: '< 1.50',
  },
  iai: {
    displayName: 'IAI (Irregular Astigmatism Index)',
    unit: '',
    normalMax: 0.30,
    borderlineHigh: 0.50,
    displayRange: '< 0.30',
  },
  osi: {
    displayName: 'OSI (Opposite Sector Index)',
    unit: '',
    normalMax: 0.90,
    borderlineHigh: 2.10,
    displayRange: '< 0.90',
  },
  ppk: {
    displayName: 'PPK (Percentage Probability of KC)',
    unit: '%',
    normalMax: 30,
    borderlineHigh: 45,
    displayRange: '< 30%',
  },
  sdp: {
    displayName: 'SDP (Standard Deviation of Corneal Power)',
    unit: 'D',
    normalMax: 2.00,
    borderlineHigh: 2.50,
    displayRange: '< 2.00 D',
  },

  // ── Sirius-Specific Indices ───────────────────────────────────────────────
  // Source: Atlas §6.2 & §11; Salman 2022; Gharieb 2021
  sif: {
    displayName: 'SIf (Symmetry Index Front)',
    unit: 'D',
    normalMax: 1.0,
    borderlineHigh: 1.5,
    displayRange: '< 1.0 D',
  },
  'symmetry index front': {
    displayName: 'SIf (Symmetry Index Front)',
    unit: 'D',
    normalMax: 1.0,
    borderlineHigh: 1.5,
    displayRange: '< 1.0 D',
  },
  sib: {
    displayName: 'SIb (Symmetry Index Back) ★ Key',
    unit: 'D',
    normalMax: 0.5,
    borderlineHigh: 1.0,
    displayRange: '< 0.5 D',
  },
  'symmetry index back': {
    displayName: 'SIb (Symmetry Index Back) ★ Key',
    unit: 'D',
    normalMax: 0.5,
    borderlineHigh: 1.0,
    displayRange: '< 0.5 D',
  },
  // ARIndex — Sirius asymmetry/regularity index (right panel, below KI)
  arindex: {
    displayName: 'ARIndex (Asymmetry/Regularity)',
    unit: '',
    normalMax: 0.40,
    borderlineHigh: 0.60,
    displayRange: '< 0.40',
  },

  // KVf / KVb — Sirius elevation indices, equivalent to Pentacam ant/post elevation max
  // Atlas §6.2: KVb is the most sensitive single Sirius KC indicator
  kvf: {
    displayName: 'KVf (KC Vertex Front)',
    unit: 'µm',
    normalMax: 6,
    borderlineHigh: 12,
    displayRange: '< 6 µm (green)',
  },
  kvb: {
    displayName: 'KVb (KC Vertex Back) ★ Most Sensitive',
    unit: 'µm',
    normalMax: 8,
    borderlineHigh: 20,
    displayRange: '< 8 µm (green)',
  },
  // BCV indices — Atlas §6.2: normal < 1.0 D, pathologic > 1.5 D
  bcvf: {
    displayName: 'BCVf (Baiocchi-Calossi-Versaci Front)',
    unit: 'D',
    normalMax: 1.0,
    borderlineHigh: 1.5,
    displayRange: '< 1.0 D',
  },
  bcvb: {
    displayName: 'BCVb (Baiocchi-Calossi-Versaci Back)',
    unit: 'D',
    normalMax: 1.0,
    borderlineHigh: 1.5,
    displayRange: '< 1.0 D',
  },
  bcv: {
    displayName: 'BCV (BCV Vector Sum)',
    unit: 'D',
    normalMax: 1.0,
    borderlineHigh: 1.5,
    displayRange: '< 1.0 D',
  },

  // ── Corvis ST Biomechanical Indices ───────────────────────────────────────
  cbi: {
    displayName: 'CBI (Corvis Biomechanical Index)',
    unit: '',
    normalMax: 0.5,
    borderlineHigh: 0.8,
    displayRange: '< 0.5',
  },
  tbi: {
    displayName: 'TBI (Tomographic Biomechanical Index) ★★',
    unit: '',
    normalMax: 0.29,
    borderlineHigh: 0.79,
    displayRange: '< 0.29',
  },

  // ── Wavefront Aberrations ─────────────────────────────────────────────────
  // Wavefront thresholds per reference (6 mm analysis zone, Saad & Gatinel 2010)
  'hoa rms': {
    displayName: 'Total HOA RMS',
    unit: 'µm',
    normalMax: 0.30,
    borderlineHigh: 0.50,
    displayRange: '< 0.30 µm',
  },
  hoa: {
    displayName: 'HOA RMS',
    unit: 'µm',
    normalMax: 0.30,
    borderlineHigh: 0.50,
    displayRange: '< 0.30 µm',
  },
  coma: {
    displayName: 'Coma (Vertical Z₃⁻¹)',
    unit: 'µm',
    normalMax: 0.15,
    borderlineHigh: 0.30,
    displayRange: '< 0.15 µm',
  },
  trefoil: {
    displayName: 'Trefoil',
    unit: 'µm',
    normalMax: 0.15,
    borderlineHigh: 0.25,
    displayRange: '< 0.15 µm',
  },
  'spherical aberration': {
    displayName: 'Spherical Aberration (Z₄⁰)',
    unit: 'µm',
    normalMin: 0.17,
    normalMax: 0.37,
    borderlineLow: -0.10,
    borderlineHigh: 0.50,
    displayRange: '+0.27 ± 0.10 µm',
  },
  sa: {
    displayName: 'Spherical Aberration (Z₄⁰)',
    unit: 'µm',
    normalMin: 0.17,
    normalMax: 0.37,
    borderlineLow: -0.10,
    borderlineHigh: 0.50,
    displayRange: '+0.27 ± 0.10 µm',
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
    displayName: 'Q Value (Asphericity)',
    unit: '',
    normalMin: -0.40,
    normalMax: -0.10,
    borderlineLow: -0.60,
    borderlineHigh: 0.00,
    displayRange: '-0.10 to -0.40 (prolate)',
  },
  'q value': {
    displayName: 'Q Value (Asphericity)',
    unit: '',
    normalMin: -0.40,
    normalMax: -0.10,
    borderlineLow: -0.60,
    borderlineHigh: 0.00,
    displayRange: '-0.10 to -0.40 (prolate)',
  },
  // Posterior Q (Sirius Box 2C): more negative = more prolate = KC-like
  // Normal posterior cornea: Q ≈ -0.30 to -0.50; steeper negative values suggest ectasia
  'q post': {
    displayName: 'Q Post (Posterior Asphericity)',
    unit: '',
    normalMin: -0.60,
    normalMax: -0.20,
    borderlineLow: -1.00,
    borderlineHigh: 0.00,
    displayRange: '-0.20 to -0.60 (prolate)',
  },

  // ── Sirius Surface RMS (Box 2C) ───────────────────────────────────────────
  // Deviation of anterior/posterior surface from the best-fit asphero-toric surface.
  // Source: CSO Sirius Atlas §6.2; values > 0.30 µm suggest surface irregularity.
  'rms ant': {
    displayName: 'RMS Ant (Surface Deviation)',
    unit: 'µm',
    normalMax: 0.30,
    borderlineHigh: 0.50,
    displayRange: '< 0.30 µm',
  },
  'rms post': {
    displayName: 'RMS Post (Surface Deviation)',
    unit: 'µm',
    normalMax: 0.20,
    borderlineHigh: 0.40,
    displayRange: '< 0.20 µm',
  },

  // ── Sirius Box 2A: Apex / Curvature / Pupil ────────────────────────────────
  // Apex Curvature: steepest point on tangential map. KC suspect if > 48 D.
  'apex curvature': {
    displayName: 'Apex Curvature (Tangential)',
    unit: 'D',
    normalMax: 48.0,
    borderlineHigh: 52.0,
    displayRange: '< 48.0 D',
  },
  // Apex Thickness: thickness at corneal apex (≠ thinnest point)
  'apex thickness': {
    displayName: 'Apex Thickness',
    unit: 'µm',
    normalMin: 510,
    normalMax: 560,
    borderlineLow: 480,
    displayRange: '510 – 560 µm',
    higherIsBetter: true,
  },
  // Pupil Diameter: informational (no KC-specific threshold)
  'pupil diameter': {
    displayName: 'Pupil Diameter',
    unit: 'mm',
    normalMin: 2.0,
    normalMax: 7.0,
    displayRange: '2.0 – 7.0 mm',
  },
  // AC Volume: anterior chamber volume (reduced in narrow-angle / shallow AC)
  'ac volume': {
    displayName: 'AC Volume',
    unit: 'mm³',
    normalMin: 100,
    normalMax: 250,
    borderlineLow: 80,
    displayRange: '100 – 250 mm³',
  },

  // ── Refractive Surgery Risk ───────────────────────────────────────────────
  pta: {
    displayName: 'PTA (Percent Tissue Altered)',
    unit: '%',
    normalMax: 40,
    borderlineHigh: 40,
    displayRange: '< 40%',
  },
};

/** Case-insensitive lookup with fuzzy fallback. */
export function lookupNormalRange(rawName: string): NormalRange | undefined {
  const key = rawName.toLowerCase().trim();

  if (normalRanges[key]) return normalRanges[key];

  // Exact substring match (longer key contains the query or vice-versa)
  for (const [k, v] of Object.entries(normalRanges)) {
    if (key === k) return v;
    if (key.length >= 3 && k.includes(key)) return v;
    if (key.length >= 3 && key.includes(k)) return v;
  }

  return undefined;
}
