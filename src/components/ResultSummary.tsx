import type { AnalysisResult, RiskLevel } from '../types/topography';

interface Props {
  result: AnalysisResult;
}

const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string; border: string; icon: string }> = {
  low: {
    label: 'LOW RISK',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    icon: '✓',
  },
  moderate: {
    label: 'MODERATE RISK',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    icon: '⚠',
  },
  high: {
    label: 'HIGH RISK',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-300',
    icon: '⚠',
  },
  'very-high': {
    label: 'VERY HIGH RISK',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-400',
    icon: '✕',
  },
};

export function ResultSummary({ result }: Props) {
  const risk = RISK_CONFIG[result.riskLevel];
  const abnormal = result.parameters.filter((p) => p.status === 'abnormal');
  const borderline = result.parameters.filter((p) => p.status === 'borderline');

  // ── No parameters extracted ──────────────────────────────────────────────────
  if (result.parameters.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border-2 p-5 bg-gray-100 border-gray-400">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-black text-gray-500">?</span>
            <div className="font-black text-lg tracking-wide text-gray-700">
              NO DATA EXTRACTED
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-600">
            The OCR could not extract any parameters from this image.
          </p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Photograph <strong>only the numbers table</strong> — not the colour maps</li>
            <li>Crop tightly to the data panel (K readings, Shape indices, Summary)</li>
            <li>Hold the phone closer — the text must be large enough to read</li>
            <li>Avoid shadows and ensure the page is flat and well-lit</li>
          </ul>
        </div>
        <div className="text-xs text-gray-400 text-center leading-relaxed">
          For research and educational use only. Not a substitute for clinical examination.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk banner */}
      <div className={`rounded-xl border-2 p-5 ${risk.bg} ${risk.border}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-2xl font-black ${risk.text}`}>{risk.icon}</span>
          <div>
            <div className={`font-black text-lg tracking-wide ${risk.text}`}>
              {risk.label}
            </div>
            {result.keratoconusGrade && (
              <div className={`text-sm font-semibold mt-0.5 ${risk.text} opacity-80`}>
                {result.keratoconusGrade}
              </div>
            )}
          </div>
          <div className="ml-auto text-right">
            <div className={`text-xs font-medium ${risk.text} opacity-70`}>Device</div>
            <div className={`text-sm font-bold ${risk.text}`}>{result.device}</div>
          </div>
        </div>
        <p className={`text-sm leading-relaxed ${risk.text} opacity-90`}>
          {result.clinicalSummary}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-red-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-red-600">{abnormal.length}</div>
          <div className="text-xs text-red-500 font-semibold mt-0.5">Abnormal</div>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-amber-600">{borderline.length}</div>
          <div className="text-xs text-amber-500 font-semibold mt-0.5">Borderline</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-gray-600">{result.parameters.length}</div>
          <div className="text-xs text-gray-500 font-semibold mt-0.5">Total Params</div>
        </div>
      </div>

      {/* Eye info */}
      <div className="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="1.8" className="w-5 h-5 flex-shrink-0">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <div className="text-sm text-sky-800">
          <span className="font-semibold">Eye:</span>{' '}
          {result.eye === 'OD'
            ? 'Right Eye (OD)'
            : result.eye === 'OS'
              ? 'Left Eye (OS)'
              : result.eye === 'OU'
                ? 'Both Eyes (OU)'
                : 'Not specified'}
        </div>
      </div>

      {/* Critical findings */}
      {abnormal.length > 0 && (
        <div className="bg-white border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-red-700 mb-2">Critical Findings</h3>
          <ul className="space-y-1.5">
            {abnormal.map((p) => (
              <li key={p.name} className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5"></span>
                <span className="text-gray-700">
                  <span className="font-semibold text-red-600">{p.displayName}</span>
                  {' = '}
                  <span className="font-mono">{p.value} {p.unit}</span>
                  <span className="text-gray-500"> (normal: {p.normalRange})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-xs text-gray-400 text-center leading-relaxed">
        For research and educational use only. Not a substitute for clinical examination.
        Always correlate with slit-lamp findings and patient history.
      </div>
    </div>
  );
}
