import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { AnalysisResult } from '../types/topography';
import { matchParameters, type Word } from './ocrAnalyzer';

// Bundle the PDF.js worker as a local asset (works offline in APK).
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export async function analyzeFromPDF(
  file: File,
  onProgress: (msg: string) => void,
): Promise<AnalysisResult> {
  onProgress('Reading PDF…');
  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  onProgress(`PDF loaded — ${pdf.numPages} page(s), extracting text…`);

  const words: Word[] = [];
  let totalHeight = 0;
  let maxWidth = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 }); // 2× scale → better sub-pixel resolution
    const pageW = viewport.width;
    const pageH = viewport.height;
    maxWidth = Math.max(maxWidth, pageW);

    const textContent = await page.getTextContent();

    for (const raw of textContent.items) {
      // TextItem has 'str'; TextMarkedContent does not
      if (!('str' in raw)) continue;
      const item = raw as TextItem;
      const str = item.str.trim();
      if (!str) continue;

      // PDF transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
      // Origin is bottom-left; flip Y for top-left canvas convention.
      const [, , , scaleY, tx, ty] = item.transform;
      const charH = Math.abs(scaleY) * 2; // scaled character height
      const w = Math.abs(item.width) * 2;

      // PDF y=0 is bottom of page; flip so y=0 is top.
      const y1 = pageH - ty * 2;
      const y0 = y1 - Math.max(charH, 4);
      const x0 = tx * 2;
      const x1 = x0 + Math.max(w, 4);

      words.push({
        text: item.str,  // keep original (including spaces) for regex matching
        confidence: 99,
        bbox: { x0, y0: totalHeight + y0, x1, y1: totalHeight + y1 },
      });
    }

    totalHeight += pageH;
  }

  onProgress(`Extracted ${words.length} text tokens — matching parameters…`);
  return matchParameters(words, maxWidth, totalHeight, onProgress);
}
