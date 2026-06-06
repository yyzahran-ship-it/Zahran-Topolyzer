import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ApiKeyInput } from './components/ApiKeyInput';
import { ImageUploader } from './components/ImageUploader';
import { AnnotatedCanvas } from './components/AnnotatedCanvas';
import { ParameterTable } from './components/ParameterTable';
import { ResultSummary } from './components/ResultSummary';
import { ManualEntry } from './components/ManualEntry';
import { analyzeTopographyImage } from './lib/analyzer';
import type { AnalysisResult } from './types/topography';

const STORAGE_KEY = 'zt_api_key';

export default function App() {
  const [apiKey] = useState<string>(() =>
    import.meta.env.VITE_ANTHROPIC_API_KEY || sessionStorage.getItem(STORAGE_KEY) || ''
  );
  const [showKeyInput, setShowKeyInput] = useState(false);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'>('image/jpeg');

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredParam, setHoveredParam] = useState<string | null>(null);

  const handleApiKey = useCallback((key: string, saveKey: (k: string) => void) => {
    saveKey(key);
    sessionStorage.setItem(STORAGE_KEY, key);
    setShowKeyInput(false);
  }, []);

  const handleImage = useCallback(
    (base64: string, mime: typeof imageMime, dataUrl: string) => {
      setImageBase64(base64);
      setImageMime(mime);
      setImageDataUrl(dataUrl);
      setResult(null);
      setError(null);
    },
    []
  );

  const runAI = useCallback(async (base64: string, mime: typeof imageMime, key: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const r = await analyzeTopographyImage(base64, mime, key);
      setResult(r);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('401') || msg.includes('authentication')
        ? 'Invalid API key.'
        : msg);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  // If an API key exists and image is loaded, auto-run AI analysis
  useEffect(() => {
    if (imageBase64 && apiKey && !analyzing && !result) {
      runAI(imageBase64, imageMime, apiKey);
    }
  }, [imageBase64, imageMime, apiKey, analyzing, result, runAI]);

  const reset = () => {
    setImageBase64(null);
    setImageDataUrl(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {showKeyInput && (
        <ApiKeyInput
          onSave={(key) => handleApiKey(key, () => sessionStorage.setItem(STORAGE_KEY, key))}
          currentKey={apiKey}
          onClose={() => setShowKeyInput(false)}
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
            <p className="font-semibold text-gray-700">Analyzing with Claude Vision…</p>
            <p className="text-sm text-gray-500">Extracting all parameters from the image.</p>
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
              <p className="font-semibold text-red-700">Analysis failed</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button onClick={reset} className="text-sm text-red-700 hover:text-red-900 font-semibold underline flex-shrink-0">
              Retry
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
                  {result.parameters.length} parameter{result.parameters.length !== 1 ? 's' : ''} analysed
                  {result.device && result.device !== 'Unknown' && result.device !== 'Manual Entry' ? ` · ${result.device}` : ''}
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

            <div className={`grid gap-6 ${imageDataUrl && apiKey ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {imageDataUrl && apiKey && (
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
                    onHover={imageDataUrl && apiKey ? setHoveredParam : undefined}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main entry UI — shown when no result yet */}
        {!result && !analyzing && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: image panel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">Topography Report</h2>
                  <p className="text-xs text-gray-500">Upload your screenshot to view it here</p>
                </div>
                {imageDataUrl && (
                  <button
                    onClick={() => { setImageDataUrl(null); setImageBase64(null); }}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Change image
                  </button>
                )}
              </div>

              {!imageDataUrl ? (
                <ImageUploader onImage={handleImage} />
              ) : (
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                  <img src={imageDataUrl} alt="Topography report" className="w-full object-contain max-h-[60vh]" />
                </div>
              )}
            </div>

            {/* Right: parameter entry */}
            <div className="space-y-3">
              <div>
                <h2 className="font-semibold text-gray-800">Enter Parameters</h2>
                <p className="text-xs text-gray-500">Select your device and type in the values</p>
              </div>
              <ManualEntry onResult={(r) => setResult(r)} />
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
