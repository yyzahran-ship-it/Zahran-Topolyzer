import { useEffect, useRef, useState } from 'react';
import type { TopographyParameter } from '../types/topography';

interface Props {
  imageSrc: string;
  parameters: TopographyParameter[];
  hoveredParam?: string | null;
}

const STATUS_COLORS = {
  abnormal: { fill: 'rgba(239,68,68,0.25)', stroke: 'rgb(239,68,68)', label: '#dc2626' },
  borderline: { fill: 'rgba(234,179,8,0.25)', stroke: 'rgb(234,179,8)', label: '#ca8a04' },
  normal: { fill: 'rgba(34,197,94,0.15)', stroke: 'rgb(34,197,94)', label: '#16a34a' },
  unknown: { fill: 'rgba(156,163,175,0.15)', stroke: 'rgb(156,163,175)', label: '#6b7280' },
};

interface Transform { scale: number; tx: number; ty: number }
interface Pt { clientX: number; clientY: number }

const CLAMP = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dist2 = (a: Pt, b: Pt) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
const mid2  = (a: Pt, b: Pt) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

export function AnnotatedCanvas({ imageSrc, parameters, hoveredParam }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const [xf, setXf]  = useState<Transform>({ scale: 1, tx: 0, ty: 0 });

  // Mutable gesture state — kept out of React state to avoid re-renders during gesture
  const g = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    t0: Pt[];
    xf0: Transform;
    lastTapMs: number;
  }>({ mode: 'none', t0: [], xf0: { scale: 1, tx: 0, ty: 0 }, lastTapMs: 0 });

  const annotatable = parameters.filter(
    (p) => p.x !== undefined && p.y !== undefined && p.status !== 'normal'
  );

  // Draw canvas content
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });

      ctx.drawImage(img, 0, 0);

      for (const p of annotatable) {
        const colors = STATUS_COLORS[p.status] ?? STATUS_COLORS.unknown;
        const cx = p.x * img.naturalWidth;
        const cy = p.y * img.naturalHeight;
        const bw = (p.width  ?? 0.08) * img.naturalWidth;
        const bh = (p.height ?? 0.035) * img.naturalHeight;
        const isHovered = hoveredParam === p.name;

        ctx.fillStyle = isHovered ? colors.stroke.replace('rgb', 'rgba').replace(')', ',0.4)') : colors.fill;
        ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);

        const label    = p.name;
        const fontSize = Math.max(10, Math.min(14, img.naturalHeight * 0.018));
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        const textW = ctx.measureText(label).width + 8;
        const textH = fontSize + 6;
        const wouldOverflow = cx + bw / 2 + 2 + textW > canvas.width;
        const lx = wouldOverflow ? cx - bw / 2 - 2 - textW : cx + bw / 2 + 2;
        ctx.fillStyle = colors.stroke;
        ctx.fillRect(lx, cy - textH / 2, textW, textH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, lx + 4, cy + fontSize / 2 - 2);
      }
    };
    img.src = imageSrc;
  }, [imageSrc, annotatable, hoveredParam]);

  // Clamp pan so image never fully leaves viewport (loose — 80% must stay visible)
  const clampXf = (next: Transform, rect: DOMRect): Transform => {
    const minTx = rect.width  * 0.2 - rect.width  * next.scale;
    const minTy = rect.height * 0.2 - rect.height * next.scale;
    const maxTx = rect.width  * 0.8;
    const maxTy = rect.height * 0.8;
    return { scale: next.scale, tx: CLAMP(next.tx, minTx, maxTx), ty: CLAMP(next.ty, minTy, maxTy) };
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const touches: Pt[] = Array.from(e.touches);
    const gs = g.current;

    if (touches.length === 1) {
      const now = Date.now();
      if (now - gs.lastTapMs < 300) {
        // Double-tap → reset
        setXf({ scale: 1, tx: 0, ty: 0 });
        gs.lastTapMs = 0;
        gs.mode = 'none';
        return;
      }
      gs.lastTapMs = now;
      gs.mode = 'pan';
      gs.t0   = touches;
      gs.xf0  = xf;
    } else if (touches.length === 2) {
      gs.mode = 'pinch';
      gs.t0   = touches;
      gs.xf0  = xf;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touches: Pt[] = Array.from(e.touches);
    const gs  = g.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (gs.mode === 'pan' && touches.length >= 1) {
      const dx = touches[0].clientX - gs.t0[0].clientX;
      const dy = touches[0].clientY - gs.t0[0].clientY;
      setXf(clampXf({ ...gs.xf0, tx: gs.xf0.tx + dx, ty: gs.xf0.ty + dy }, rect));

    } else if (gs.mode === 'pinch' && touches.length >= 2) {
      const d0    = dist2(gs.t0[0], gs.t0[1]);
      const d1    = dist2(touches[0], touches[1]);
      const newScale = CLAMP(gs.xf0.scale * (d1 / d0), 1, 6);

      // Keep pinch midpoint fixed on canvas
      const m0 = mid2(gs.t0[0], gs.t0[1]);
      const m1 = mid2(touches[0], touches[1]);
      const mx = m0.x - rect.left;
      const my = m0.y - rect.top;
      const ratio = newScale / gs.xf0.scale;
      const tx    = mx - (mx - gs.xf0.tx) * ratio + (m1.x - m0.x);
      const ty    = my - (my - gs.xf0.ty) * ratio + (m1.y - m0.y);

      setXf(clampXf({ scale: newScale, tx, ty }, rect));
    }
  };

  const onTouchEnd = () => { g.current.mode = 'none'; };

  const cssTransform = `translate(${xf.tx}px, ${xf.ty}px) scale(${xf.scale})`;
  const isZoomed = xf.scale > 1.05;

  return (
    <div className="relative w-full">
      {/* Zoom hint */}
      {!isZoomed && imgDims.w > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white text-xs rounded-full px-3 py-1 pointer-events-none select-none">
          Pinch to zoom · double-tap to reset
        </div>
      )}

      {/* Scrollable / zoomable viewport */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm touch-none"
        style={{ maxHeight: '65vh', cursor: isZoomed ? 'grab' : 'default' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{
            transformOrigin: '0 0',
            transform: cssTransform,
            willChange: 'transform',
            userSelect: 'none',
          }}
        />
      </div>

      {/* Legend */}
      {annotatable.length > 0 && (
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 px-3 py-2 flex flex-col gap-1.5 text-xs shadow-sm pointer-events-none">
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
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-full px-4 py-1.5 font-medium shadow-sm pointer-events-none">
          All extracted values within normal limits
        </div>
      )}
    </div>
  );
}
