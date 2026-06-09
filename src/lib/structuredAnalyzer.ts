/**
 * Structured-data import: CSV and XML/XPT exports from corneal topography devices.
 *
 * Strategy: for each field name in the export, test it against every PARAM_PATTERNS
 * regex (the same regexes used by the OCR path). If it matches and the associated
 * numeric value passes RANGES validation, record it. This is device-agnostic and
 * handles any field naming convention the manufacturer chose.
 */

import { buildResult } from './classify';
import { PARAM_PATTERNS, RANGES, DEVICE_BLOCK } from './ocrAnalyzer';
import type { AnalysisResult } from '../types/topography';

// ── Device detection ─────────────────────────────────────────────────────────

function detectDevice(raw: string): string {
  const t = raw.toLowerCase();
  if (/pentacam|oculus/.test(t))                                          return 'Pentacam';
  if (/sirius|cso|1\.3375|kvf|bcvf/.test(t))                             return 'Sirius';
  if (/galilei|ziemer/.test(t))                                           return 'Galilei';
  if (/orbscan|bausch/.test(t))                                           return 'Orbscan';
  if (/atlas|zeiss/.test(t))                                              return 'Atlas';
  return 'Unknown';
}

function detectEye(raw: string): AnalysisResult['eye'] {
  const t = raw.toLowerCase();
  if (/\bod\b|right\s+eye/.test(t)) return 'OD';
  if (/\bos\b|left\s+eye/.test(t))  return 'OS';
  if (/\bou\b/.test(t))             return 'OU';
  return 'unknown';
}

// ── Core matching ─────────────────────────────────────────────────────────────

function parseNum(s: string): number | null {
  const cleaned = s.replace(',', '.').replace(/[^\d.\-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/**
 * Given a list of (key, rawValue, rawUnit) triples from a CSV/XML source,
 * match them to known parameters and return an AnalysisResult.
 */
function buildFromTriples(
  triples: Array<{ key: string; rawValue: string; rawUnit: string }>,
  sourceText: string,
): AnalysisResult {
  const device  = detectDevice(sourceText);
  const eye     = detectEye(sourceText);
  const block   = DEVICE_BLOCK[device] ?? new Set<string>();
  const found   = new Map<string, { value: number; unit: string }>();

  for (const { key, rawValue, rawUnit } of triples) {
    if (!key || !rawValue) continue;
    const value = parseNum(rawValue);
    if (value === null) continue;

    for (const pat of PARAM_PATTERNS) {
      if (found.has(pat.name) || block.has(pat.name)) continue;
      if (!pat.regex.test(key)) continue;

      const rng = RANGES[pat.name];
      if (rng && (value < rng[0] || value > rng[1])) continue;

      // Unit from file overrides PARAM_PATTERNS default when present
      const unit = rawUnit.trim() || pat.unit;
      found.set(pat.name, { value, unit });
      break;
    }
  }

  const entries = Array.from(found.entries()).map(([name, { value, unit }]) => ({
    name, value, unit,
    x: 0, y: 0, width: 0, height: 0,  // no image coords for structured data
  }));

  return buildResult(entries, device, eye);
}

// ── CSV parser ────────────────────────────────────────────────────────────────

/**
 * Parse any delimited text file (comma, semicolon, tab).
 * Scans every row for a (parameterName, numericValue) pair without assuming
 * a fixed column layout — works regardless of which column the name is in.
 */
export async function analyzeFromCSV(
  text: string,
  onProgress: (msg: string) => void,
): Promise<AnalysisResult> {
  onProgress('Parsing CSV…');

  // Auto-detect delimiter
  const delimiters = [';', ',', '\t', '|'];
  const counts     = delimiters.map(d => (text.match(new RegExp(`\\${d}`, 'g')) ?? []).length);
  const delim      = delimiters[counts.indexOf(Math.max(...counts))];

  const triples: Array<{ key: string; rawValue: string; rawUnit: string }> = [];

  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(delim).map(c => c.replace(/^["']|["']$/g, '').trim());
    if (cells.length < 2) continue;

    // Enumerate all (text-cell, numeric-cell) pairs within the same row
    const textCells = cells.filter(c => c && !/^-?\d+\.?\d*$/.test(c));
    const numCells  = cells.filter(c => /^-?\d+\.?\d*$/.test(c));

    for (const key of textCells) {
      for (const rawValue of numCells) {
        // Look for a unit cell immediately after the numeric cell
        const numIdx = cells.indexOf(rawValue);
        const rawUnit = numIdx + 1 < cells.length ? cells[numIdx + 1] : '';
        triples.push({ key, rawValue, rawUnit });
      }
    }
  }

  onProgress(`CSV parsed — ${triples.length} candidate pairs — matching…`);
  return buildFromTriples(triples, text);
}

// ── XML / XPT parser ─────────────────────────────────────────────────────────

function xmlTriples(
  node: Element,
  acc: Array<{ key: string; rawValue: string; rawUnit: string }>,
): void {
  // Collect every attribute that looks like a name/id/label + an adjacent value attribute
  const attrNames = ['name', 'id', 'label', 'key', 'param', 'parameter', 'field'];
  const attrVals  = ['value', 'val', 'result', 'data', 'measure', 'reading'];
  const attrUnits = ['unit', 'units', 'dimension', 'dim'];

  let key = '';
  let rawValue = '';
  let rawUnit = '';

  for (const a of attrNames) {
    if (node.hasAttribute(a)) { key = node.getAttribute(a)!; break; }
  }
  for (const a of attrVals) {
    if (node.hasAttribute(a)) { rawValue = node.getAttribute(a)!; break; }
  }
  for (const a of attrUnits) {
    if (node.hasAttribute(a)) { rawUnit = node.getAttribute(a)!; break; }
  }

  // If no name attribute, use element tag name as key
  if (!key) key = node.tagName;

  // If no value attribute, use text content
  if (!rawValue) rawValue = node.textContent?.trim() ?? '';

  if (key && rawValue) acc.push({ key, rawValue, rawUnit });

  // Recurse into children
  for (const child of Array.from(node.children)) {
    xmlTriples(child, acc);
  }
}

export async function analyzeFromXML(
  text: string,
  onProgress: (msg: string) => void,
): Promise<AnalysisResult> {
  onProgress('Parsing XML…');

  const parser = new DOMParser();
  const doc    = parser.parseFromString(text, 'application/xml');
  const root   = doc.documentElement;

  if (root.tagName === 'parsererror') {
    throw new Error('Invalid XML file — could not parse.');
  }

  const triples: Array<{ key: string; rawValue: string; rawUnit: string }> = [];
  xmlTriples(root, triples);

  onProgress(`XML parsed — ${triples.length} candidate pairs — matching…`);
  return buildFromTriples(triples, text);
}
