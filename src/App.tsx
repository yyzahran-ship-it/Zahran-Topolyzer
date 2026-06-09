import { useCallback, useState } from 'react';
import { Header } from './components/Header';
import { ImageUploader, type AcceptedFile } from './components/ImageUploader';
import { AnnotatedCanvas } from './components/AnnotatedCanvas';
import { ParameterTable } from './components/ParameterTable';
import { ResultSummary } from './components/ResultSummary';
import { ApiKeyInput } from './components/ApiKeyInput';
import { analyzeWithOCR } from './lib/ocrAnalyzer';
import { analyzeWithVision } from './lib/visionAnalyzer';
import { analyzeFromPDF } from './lib/pdfAnalyzer';
import { analyzeFromCSV, analyzeFromXML } from './lib/structuredAnalyzer';
import type { AnalysisResult } from './types/topography';

const STORAGE_KEY = 'zahran_anthropic_key';

function loadKey(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function saveKey(k: string | null) {
  try {
    if (k) localStorage.setItem(STORAGE_KEY, k);
    else    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

type SourceLabel = 'AI Vision (Claude)' | 'OCR (Tesseract)' | 'PDF text layer' | 'CSV export' | 'XML export';

export default function App() {
  const [apiKey, setApiKey]           = useState<string | null>(loadKey);
  const [showKeyModal, setShowKeyModal] = useState(false);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel]   = useState<SourceLabel | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress]   = useState('');
  const [result, setResult]       = useState<AnalysisResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [hoveredParam, setHoveredParam] = useState<string | null>(null);

  const handleSaveKey = (k: string) => {
    setApiKey(k);
    saveKey(k);
    setShowKeyModal(false);
  };

  const handleFile = useCallback(
    (accepted: AcceptedFile) => {
      setResult(null);
      setError(null);
      setProgress('');

      if (accepted.kind === 'image') {
        setImageDataUrl(accepted.dataUrl);
      } else {
        setImageDataUrl(null);
      }

      setAnalyzing(true);

      let promise: Promise<AnalysisResult>;

      if (accepted.kind === 'image') {
        const key = loadKey(); // read from storage in case state lags
        if (key) {
          setSourceLabel('AI Vision (Claude)');
          promise = analyzeWithVision(accepted.dataUrl, key, setProgress);
        } else {
          setSourceLabel('OCR (Tesseract)');
          promise = analyzeWithOCR(accepted.dataUrl, setProgress);
        }
      } else if (accepted.kind === 'pdf') {
        setSourceLabel('PDF text layer');
        promise = analyzeFromPDF(accepted.file, setProgress);
      } else if (accepted.kind === 'csv') {
        setSourceLabel('CSV export');
        promise = accepted.file.text().then(t => analyzeFromCSV(t, setProgress));
      } else {
        setSourceLabel('XML export');
        promise = accepted.file.text().then(t => analyzeFromXML(t, setProgress));
      }

      promise
        .then(r => setResult(r))
        .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setAnalyzing(false));
    },
    [],
  );

  const reset = () => {
    setImageDataUrl(null);
    setSourceLabel(null);
    setResult(null);
    setError(null);
    setProgress('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header apiKey={apiKey} onOpenSettings={() => setShowKeyModal(true)} />

      {showKeyModal && (
        <ApiKeyInput
          currentKey={apiKey ?? undefined}
          onSave={handleSaveKey}
          onClose={() => setShowKeyModal(false)}
        />
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-5">

        {/* Loading */}
        {analyzing && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-sky-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-sky-600 border-t-transparent animate-spin"></div>
            </div>
            <p className="font-semibold text-gray-700">{progress || 'Analysing…'}</p>
            <p className="text-sm text-gray-500">Extracting parameters from your topography report.</p>
          </div>
        )}

        {/* Error */}
        {error && !analyzing && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex gap-3 items-start">
            <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" className="w-5 h-5 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-red-700">Could not read parameters</p>
              <p className="text-sm text-red-600 mt-1 whitespace-pre-line">{error}</p>
              {error.includes('API key') && (
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="mt-2 text-sm text-sky-700 hover:text-sky-900 font-semibold underline"
                >
                  Update API Key
                </button>
              )}
            </div>
            <button onClick={reset} className="text-sm text-red-700 hover:text-red-900 font-semibold underline flex-shrink-0">
              Try another file
            </button>
          </div>
        )}

        {/* Results */}
        {result && !analyzing && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Analysis Results</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {result.parameters.length} parameter{result.parameters.length !== 1 ? 's' : ''} found
                  {result.device && result.device !== 'Unknown' ? ` · ${result.device}` : ''}
                  {result.eye && result.eye !== 'unknown' ? ` · ${result.eye}` : ''}
                  {sourceLabel ? ` · ${sourceLabel}` : ''}
                </p>
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-4 py-2 transition-colors shadow-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-4.44" />
                </svg>
                New Analysis
              </button>
            </div>

            <div className={`grid gap-6 ${imageDataUrl ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {imageDataUrl && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Annotated Image
                    <span className="ml-2 text-xs font-normal text-gray-400">Hover a row to highlight</span>
                  </h3>
                  <AnnotatedCanvas imageSrc={imageDataUrl} parameters={result.parameters} hoveredParam={hoveredParam} />
                </div>
              )}
              <div className="space-y-4">
                <ResultSummary result={result} />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">All Parameters</h3>
                  <ParameterTable parameters={result.parameters} onHover={setHoveredParam} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload UI — shown when no result and not analyzing */}
        {!result && !analyzing && !error && (
          <div className="max-w-xl mx-auto w-full space-y-4">
            <div className="text-center">
              <h2 className="font-semibold text-gray-800">Topography Report Analyzer</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload a screenshot, PDF export, CSV, or XML file — parameters extracted automatically
              </p>
            </div>

            {/* API key status banner */}
            {!apiKey ? (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p className="text-xs text-amber-700 flex-1">
                  Screenshots use Tesseract OCR.{' '}
                  <button onClick={() => setShowKeyModal(true)} className="font-semibold underline hover:text-amber-900">
                    Add an Anthropic API key
                  </button>
                  {' '}for much better AI-powered accuracy.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p className="text-xs text-green-700 flex-1">
                  Claude Vision enabled — screenshots will be analyzed by AI for maximum accuracy.
                </p>
              </div>
            )}

            <ImageUploader onFile={handleFile} />
          </div>
        )}

        {/* Show image while error is visible */}
        {error && !analyzing && imageDataUrl && (
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white max-w-xl mx-auto">
            <img src={imageDataUrl} alt="Topography report" className="w-full object-contain max-h-[50vh]" />
          </div>
        )}

      </main>
    </div>
  );
}
