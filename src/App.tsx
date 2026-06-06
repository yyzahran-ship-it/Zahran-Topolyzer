import { useCallback, useState } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { AnnotatedCanvas } from './components/AnnotatedCanvas';
import { ParameterTable } from './components/ParameterTable';
import { ResultSummary } from './components/ResultSummary';
import { analyzeWithOCR } from './lib/ocrAnalyzer';
import type { AnalysisResult } from './types/topography';

export default function App() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredParam, setHoveredParam] = useState<string | null>(null);

  const handleImage = useCallback(
    (_base64: string, _mime: string, dataUrl: string) => {
      setImageDataUrl(dataUrl);
      setResult(null);
      setError(null);
      setProgress('');

      setAnalyzing(true);
      analyzeWithOCR(dataUrl, setProgress)
        .then((r) => setResult(r))
        .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setAnalyzing(false));
    },
    []
  );

  const reset = () => {
    setImageDataUrl(null);
    setResult(null);
    setError(null);
    setProgress('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-5">

        {/* Loading */}
        {analyzing && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-sky-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-sky-600 border-t-transparent animate-spin"></div>
            </div>
            <p className="font-semibold text-gray-700">{progress || 'Scanning image…'}</p>
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
            </div>
            <button onClick={reset} className="text-sm text-red-700 hover:text-red-900 font-semibold underline flex-shrink-0">
              Try another image
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

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
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
                  <ParameterTable
                    parameters={result.parameters}
                    onHover={setHoveredParam}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload UI — shown when no result and not analyzing */}
        {!result && !analyzing && !error && (
          <div className="max-w-xl mx-auto w-full space-y-4">
            <div className="text-center">
              <h2 className="font-semibold text-gray-800">Topography Report Scanner</h2>
              <p className="text-sm text-gray-500 mt-1">Upload a screenshot — parameters are extracted automatically</p>
            </div>
            <ImageUploader onImage={handleImage} />
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
