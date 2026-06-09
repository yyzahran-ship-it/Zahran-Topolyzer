import { useState } from 'react';
import { buildResult } from '../lib/classify';
import type { AnalysisResult } from '../types/topography';

type Eye = 'OD' | 'OS' | 'unknown';

interface ParamField {
  name: string;
  unit: string;
  placeholder: string;
  hint?: string;
}

interface ParamGroup {
  label: string;
  fields: ParamField[];
}

const PENTACAM_GROUPS: ParamGroup[] = [
  {
    label: 'Keratometry',
    fields: [
      { name: 'K1', unit: 'D', placeholder: '42.50', hint: 'Flat meridian' },
      { name: 'K2', unit: 'D', placeholder: '44.00', hint: 'Steep meridian' },
      { name: 'Kmax', unit: 'D', placeholder: '46.00', hint: 'Maximum curvature' },
      { name: 'Km', unit: 'D', placeholder: '43.25', hint: 'Mean K' },
      { name: 'Astigmatism', unit: 'D', placeholder: '1.50' },
    ],
  },
  {
    label: 'Pachymetry',
    fields: [
      { name: 'CCT', unit: 'µm', placeholder: '540', hint: 'Central corneal thickness' },
      { name: 'Thinnest Point', unit: 'µm', placeholder: '530' },
      { name: 'Anterior Elevation', unit: 'µm', placeholder: '5', hint: 'BFS' },
      { name: 'Posterior Elevation', unit: 'µm', placeholder: '10', hint: 'BFS' },
    ],
  },
  {
    label: 'Pentacam Indices',
    fields: [
      { name: 'ISV', unit: '', placeholder: '20' },
      { name: 'IVA', unit: '', placeholder: '0.10' },
      { name: 'KI', unit: '', placeholder: '1.00' },
      { name: 'CKI', unit: '', placeholder: '1.00' },
      { name: 'IHA', unit: '°', placeholder: '5' },
      { name: 'IHD', unit: '', placeholder: '0.008' },
      { name: 'Rmin', unit: 'mm', placeholder: '7.0' },
      { name: 'BAD-D', unit: '', placeholder: '1.0', hint: 'Belin/Ambrósio D' },
      { name: 'ART-Max', unit: '', placeholder: '500' },
      { name: 'PRFI', unit: '', placeholder: '0.10' },
    ],
  },
  {
    label: 'Biomechanics',
    fields: [
      { name: 'TBI', unit: '', placeholder: '0.15', hint: 'Tomographic Biomechanical Index' },
      { name: 'CBI', unit: '', placeholder: '0.20', hint: 'Corvis Biomechanical Index' },
    ],
  },
  {
    label: 'Classic Indices',
    fields: [
      { name: 'I-S value', unit: 'D', placeholder: '0.50' },
      { name: 'KISA%', unit: '%', placeholder: '30' },
      { name: 'SRAX', unit: '°', placeholder: '10' },
      { name: 'SAI', unit: '', placeholder: '0.30' },
      { name: 'SRI', unit: '', placeholder: '0.20' },
    ],
  },
  {
    label: 'Biometrics',
    fields: [
      { name: 'WTW', unit: 'mm', placeholder: '12.0' },
      { name: 'ACD', unit: 'mm', placeholder: '3.20' },
      { name: 'Corneal Volume', unit: 'mm³', placeholder: '60' },
      { name: 'Q value', unit: '', placeholder: '-0.25' },
      { name: 'HOA RMS', unit: 'µm', placeholder: '0.30' },
    ],
  },
];

const SIRIUS_GROUPS: ParamGroup[] = [
  {
    label: 'Keratometry',
    fields: [
      { name: 'K1', unit: 'D', placeholder: '42.50' },
      { name: 'K2', unit: 'D', placeholder: '44.00' },
      { name: 'Kmax', unit: 'D', placeholder: '46.00' },
      { name: 'Astigmatism', unit: 'D', placeholder: '1.50' },
    ],
  },
  {
    label: 'Pachymetry',
    fields: [
      { name: 'CCT', unit: 'µm', placeholder: '540' },
      { name: 'Thinnest Point', unit: 'µm', placeholder: '530' },
      { name: 'Anterior Elevation', unit: 'µm', placeholder: '5' },
      { name: 'Posterior Elevation', unit: 'µm', placeholder: '10' },
    ],
  },
  {
    label: 'Sirius Indices',
    fields: [
      { name: 'SIf', unit: '', placeholder: '0.20', hint: 'Symmetry Index Front' },
      { name: 'SIb', unit: '', placeholder: '0.05', hint: 'Symmetry Index Back' },
      { name: 'KVf', unit: 'D', placeholder: '1.50' },
      { name: 'KVb', unit: 'D', placeholder: '2.00' },
      { name: 'BAD-D', unit: '', placeholder: '1.0' },
      { name: 'ISV', unit: '', placeholder: '20' },
      { name: 'IVA', unit: '', placeholder: '0.10' },
      { name: 'KI', unit: '', placeholder: '1.00' },
      { name: 'ART-Max', unit: '', placeholder: '500' },
    ],
  },
  {
    label: 'Classic Indices',
    fields: [
      { name: 'I-S value', unit: 'D', placeholder: '0.50' },
      { name: 'KISA%', unit: '%', placeholder: '30' },
      { name: 'SAI', unit: '', placeholder: '0.30' },
      { name: 'SRI', unit: '', placeholder: '0.20' },
    ],
  },
];

const GALILEI_GROUPS: ParamGroup[] = [
  {
    label: 'Keratometry',
    fields: [
      { name: 'K1', unit: 'D', placeholder: '42.50' },
      { name: 'K2', unit: 'D', placeholder: '44.00' },
      { name: 'Kmax', unit: 'D', placeholder: '46.00' },
      { name: 'Astigmatism', unit: 'D', placeholder: '1.50' },
    ],
  },
  {
    label: 'Pachymetry',
    fields: [
      { name: 'CCT', unit: 'µm', placeholder: '540' },
      { name: 'Thinnest Point', unit: 'µm', placeholder: '530' },
      { name: 'Anterior Elevation', unit: 'µm', placeholder: '5' },
      { name: 'Posterior Elevation', unit: 'µm', placeholder: '10' },
    ],
  },
  {
    label: 'Galilei Indices',
    fields: [
      { name: 'AAI', unit: '', placeholder: '10', hint: 'Asymmetry Analysis Index' },
      { name: 'SDP', unit: '', placeholder: '1.0', hint: 'Standard Deviation of Power' },
      { name: 'DSI', unit: '', placeholder: '1.0' },
      { name: 'OSI', unit: '', placeholder: '1.0' },
      { name: 'CSI', unit: '', placeholder: '0.5' },
      { name: 'IAI', unit: '', placeholder: '0.20' },
      { name: 'BAD-D', unit: '', placeholder: '1.0' },
      { name: 'ISV', unit: '', placeholder: '20' },
    ],
  },
];

const ORBSCAN_GROUPS: ParamGroup[] = [
  {
    label: 'Keratometry',
    fields: [
      { name: 'SimK1', unit: 'D', placeholder: '42.50' },
      { name: 'SimK2', unit: 'D', placeholder: '44.00' },
      { name: 'Kmax', unit: 'D', placeholder: '46.00' },
      { name: 'Astigmatism', unit: 'D', placeholder: '1.50' },
    ],
  },
  {
    label: 'Pachymetry',
    fields: [
      { name: 'CCT', unit: 'µm', placeholder: '540' },
      { name: 'Thinnest Point', unit: 'µm', placeholder: '530' },
      { name: 'Anterior Elevation', unit: 'µm', placeholder: '5' },
      { name: 'Posterior Elevation', unit: 'µm', placeholder: '10' },
    ],
  },
  {
    label: 'Classic Indices',
    fields: [
      { name: 'I-S value', unit: 'D', placeholder: '0.50' },
      { name: 'KISA%', unit: '%', placeholder: '30' },
      { name: 'SRAX', unit: '°', placeholder: '10' },
      { name: 'SAI', unit: '', placeholder: '0.30' },
      { name: 'SRI', unit: '', placeholder: '0.20' },
      { name: 'DSI', unit: '', placeholder: '1.0' },
      { name: 'OSI', unit: '', placeholder: '1.0' },
      { name: 'IAI', unit: '', placeholder: '0.20' },
    ],
  },
];

const DEVICE_GROUPS: Record<string, ParamGroup[]> = {
  Pentacam: PENTACAM_GROUPS,
  Sirius: SIRIUS_GROUPS,
  Galilei: GALILEI_GROUPS,
  Orbscan: ORBSCAN_GROUPS,
};

interface Props {
  onResult: (result: AnalysisResult) => void;
}

export function ManualEntry({ onResult }: Props) {
  const [device, setDevice] = useState<string>('Pentacam');
  const [eye, setEye] = useState<Eye>('OD');
  const [values, setValues] = useState<Record<string, string>>({});

  const groups = DEVICE_GROUPS[device] ?? PENTACAM_GROUPS;

  const setValue = (name: string, v: string) =>
    setValues((prev) => ({ ...prev, [name]: v }));

  const handleAnalyze = () => {
    const entries = groups
      .flatMap((g) => g.fields)
      .map((f) => ({
        name: f.name,
        value: parseFloat(values[f.name] ?? ''),
        unit: f.unit,
      }))
      .filter((e) => !isNaN(e.value));

    if (entries.length === 0) {
      alert('Enter at least one parameter value before analyzing.');
      return;
    }

    onResult(buildResult(entries, device, eye));
  };

  const handleReset = () => setValues({});

  return (
    <div className="space-y-5">
      {/* Device + Eye selectors */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Device
          </label>
          <select
            value={device}
            onChange={(e) => { setDevice(e.target.value); setValues({}); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {Object.keys(DEVICE_GROUPS).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Eye
          </label>
          <div className="flex gap-1">
            {(['OD', 'OS', 'unknown'] as const).map((e) => (
              <button
                key={e}
                onClick={() => setEye(e)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  eye === e
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300'
                }`}
              >
                {e === 'unknown' ? '?' : e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Parameter groups */}
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              {group.label}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {group.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {field.name}
                    {field.unit && (
                      <span className="text-gray-400 ml-1">({field.unit})</span>
                    )}
                    {field.hint && (
                      <span className="block text-[10px] text-gray-400 font-normal">{field.hint}</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder={field.placeholder}
                    value={values[field.name] ?? ''}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleAnalyze}
          className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
        >
          Analyze Parameters
        </button>
        <button
          onClick={handleReset}
          className="px-5 py-3 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-xl text-sm transition-colors shadow-sm"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
