import { useCallback, useRef, useState } from 'react';

export type AcceptedFile =
  | { kind: 'image'; file: File; dataUrl: string }
  | { kind: 'pdf';   file: File }
  | { kind: 'csv';   file: File }
  | { kind: 'xml';   file: File };

interface Props {
  onFile: (f: AcceptedFile) => void;
  disabled?: boolean;
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.csv,.xml,.pen,.xpt';

function classify(file: File): AcceptedFile['kind'] | null {
  if (IMAGE_TYPES.has(file.type)) return 'image';
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return 'pdf';
  if (file.type === 'text/csv' || file.name.endsWith('.csv')) return 'csv';
  if (
    file.type === 'text/xml' || file.type === 'application/xml' ||
    /\.(xml|pen|xpt)$/i.test(file.name)
  ) return 'xml';
  return null;
}

export function ImageUploader({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      const kind = classify(file);
      if (!kind) return;

      if (kind === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          onFile({ kind: 'image', file, dataUrl });
        };
        reader.readAsDataURL(file);
      } else {
        onFile({ kind, file } as AcceptedFile);
      }
    },
    [onFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const item = Array.from(e.clipboardData.items).find(
        (i) => i.type.startsWith('image/'),
      );
      if (item) {
        const file = item.getAsFile();
        if (file) processFile(file);
      }
    },
    [processFile],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onPaste={handlePaste}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
      className={[
        'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all select-none outline-none',
        dragging
          ? 'border-sky-500 bg-sky-50'
          : 'border-gray-300 hover:border-sky-400 hover:bg-gray-50',
        disabled ? 'opacity-50 pointer-events-none' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processFile(f);
          e.target.value = '';
        }}
      />

      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="1.5" className="w-9 h-9">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <div>
          <p className="text-base font-semibold text-gray-700">
            Drop a topography file here
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or click to browse · or paste with Ctrl+V
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
          {['Screenshot / Photo', 'PDF Export', 'CSV Export', 'XML / .pen'].map((t) => (
            <span key={t} className="bg-gray-100 rounded-full px-3 py-1">{t}</span>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 text-xs text-gray-400 mt-1">
          {['Pentacam', 'Sirius', 'Galilei', 'Orbscan', 'Atlas'].map((d) => (
            <span key={d} className="bg-sky-50 text-sky-700 rounded-full px-2.5 py-0.5">{d}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
