import { useEffect, useRef, useState } from 'react';
import type { TopographyParameter } from '../types/topography';

interface Props {
  imageSrc: string;
  parameters: TopographyParameter[];
  /** Parameter name to highlight on hover from table */
  hoveredParam?: string | null;
}

const STATUS_COLORS = {
  abnormal: { fill: 'rgba(239,68,68,0.25)', stroke: 'rgb(239,68,68)', label: '#dc2626' },
  borderline: { fill: 'rgba(234,179,8,0.25)', stroke: 'rgb(234,179,8)', label: '#ca8a04' },
  normal: { fill: 'rgba(34,197,94,0.15)', stroke: 'rgb(34,197,94)', label: '#16a34a' },
  unknown: { fill: 'rgba(156,163,175,0.15)', stroke: 'rgb(156,163,175)', label: '#6b7280' },
};

export function AnnotatedCanvas({ imageSrc, parameters, hoveredParam }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });

  const annotatable = parameters.filter(
    (p) => p.x !== undefined && p.y !== undefined && p.status !== 'normal'
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });

      ctx.drawImage(img, 0, 0);

      // Draw overlays for abnormal / borderline values
      for (const p of annotatable) {
        const colors = STATUS_COLORS[p.status] ?? STATUS_COLORS.unknown;
        const cx = p.x * img.naturalWidth;
        const cy = p.y * img.naturalHeight;
        const bw = (p.width ?? 0.08) * img.naturalWidth;
        const bh = (p.height ?? 0.035) * img.naturalHeight;

        const isHovered = hoveredParam === p.name;

        // Filled rectangle
        ctx.fillStyle = isHovered ? colors.stroke.replace('rgb', 'rgba').replace(')', ',0.4)') : colors.fill;
        ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);

        // Border
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);

        // Label tag above the box
        const label = p.name;
        const fontSize = Math.max(10, Math.min(14, img.naturalHeight * 0.018));
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        const textW = ctx.measureText(label).width + 8;
        const textH = fontSize + 6;

        ctx.fillStyle = colors.stroke;
        ctx.fillRect(cx - bw / 2, cy - bh / 2 - textH - 2, textW, textH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, cx - bw / 2 + 4, cy - bh / 2 - 6);
      }
    };
    img.src = imageSrc;
  }, [imageSrc, annotatable, hoveredParam]);

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-xl border border-gray-200 shadow-sm"
        style={{ maxHeight: '65vh', objectFit: 'contain' }}
      />

      {/* Legend */}
      {annotatable.length > 0 && (
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 px-3 py-2 flex flex-col gap-1.5 text-xs shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500 inline-block"></span>
            <span className="text-gray-600">Abnormal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-yellow-400/30 border border-yellow-500 inline-block"></span>
            <span className="text-gray-600">Borderline</span>
          </div>
        </div>
      )}

      {imgDims.w > 0 && annotatable.length === 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-full px-4 py-1.5 font-medium shadow-sm">
          All extracted values within normal limits
        </div>
      )}
    </div>
  );
}
