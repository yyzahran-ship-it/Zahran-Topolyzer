import { useCallback, useRef, useState } from 'react';

interface Props {
  onImage: (base64: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', previewUrl: string) => void;
  disabled?: boolean;
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif';

export function ImageUploader({ onImage, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const mime = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        onImage(base64, mime, dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [onImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const item = Array.from(e.clipboardData.items).find((i) =>
        i.type.startsWith('image/')
      );
      if (item) {
        const file = item.getAsFile();
        if (file) processFile(file);
      }
    },
    [processFile]
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
        accept={ACCEPTED}
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
            Drop a topography screenshot here
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or click to browse · or paste with Ctrl+V
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
          {['Pentacam', 'Sirius', 'Galilei', 'Orbscan', 'Atlas', 'Keratograph'].map((d) => (
            <span key={d} className="bg-gray-100 rounded-full px-3 py-1">{d}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
