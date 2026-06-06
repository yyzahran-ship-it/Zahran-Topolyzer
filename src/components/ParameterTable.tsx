import { useState } from 'react';
import type { TopographyParameter, ParameterStatus } from '../types/topography';

interface Props {
  parameters: TopographyParameter[];
  onHover?: (name: string | null) => void;
}

const STATUS_CONFIG: Record<ParameterStatus, { label: string; chip: string; row: string }> = {
  abnormal: {
    label: 'Abnormal',
    chip: 'bg-red-100 text-red-700 border border-red-200',
    row: 'bg-red-50/60 hover:bg-red-50',
  },
  borderline: {
    label: 'Borderline',
    chip: 'bg-amber-100 text-amber-700 border border-amber-200',
    row: 'bg-amber-50/60 hover:bg-amber-50',
  },
  normal: {
    label: 'Normal',
    chip: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    row: 'hover:bg-gray-50',
  },
  unknown: {
    label: 'Unknown',
    chip: 'bg-gray-100 text-gray-500 border border-gray-200',
    row: 'hover:bg-gray-50',
  },
};

type FilterType = 'all' | 'abnormal' | 'borderline' | 'normal';

export function ParameterTable({ parameters, onHover }: Props) {
  const [filter, setFilter] = useState<FilterType>('all');

  const counts = {
    abnormal: parameters.filter((p) => p.status === 'abnormal').length,
    borderline: parameters.filter((p) => p.status === 'borderline').length,
    normal: parameters.filter((p) => p.status === 'normal').length,
  };

  const displayed = filter === 'all' ? parameters : parameters.filter((p) => p.status === filter);

  // Sort: abnormal first, then borderline, then normal, then unknown
  const sorted = [...displayed].sort((a, b) => {
    const order: Record<ParameterStatus, number> = { abnormal: 0, borderline: 1, normal: 2, unknown: 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {(['all', 'abnormal', 'borderline', 'normal'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
              filter === f
                ? f === 'abnormal'
                  ? 'bg-red-600 text-white shadow-sm'
                  : f === 'borderline'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : f === 'normal'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-sky-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ].join(' ')}
          >
            {f === 'all' ? `All (${parameters.length})` : `${f} (${counts[f] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Parameter</th>
              <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">Value</th>
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Normal Range</th>
              <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400 text-sm">
                  No parameters match this filter
                </td>
              </tr>
            )}
            {sorted.map((p) => {
              const cfg = STATUS_CONFIG[p.status];
              return (
                <tr
                  key={`${p.name}-${p.value}`}
                  className={`transition-colors cursor-default ${cfg.row}`}
                  onMouseEnter={() => onHover?.(p.name)}
                  onMouseLeave={() => onHover?.(null)}
                  title={p.interpretation}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{p.displayName}</div>
                    <div className="text-xs text-gray-400">{p.name}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-mono font-semibold ${p.status === 'abnormal' ? 'text-red-600' : p.status === 'borderline' ? 'text-amber-600' : 'text-gray-800'}`}>
                      {p.value}
                    </span>
                    {p.unit && (
                      <span className="text-xs text-gray-400 ml-1">{p.unit}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">
                    {p.normalRange}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.chip}`}>
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
