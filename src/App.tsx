import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ApiKeyInput } from './components/ApiKeyInput';
import { ImageUploader } from './components/ImageUploader';
import { AnnotatedCanvas } from './components/AnnotatedCanvas';
import { ParameterTable } from './components/ParameterTable';
import { ResultSummary } from './components/ResultSummary';
import { analyzeTopographyImage } from './lib/analyzer';
import type { AnalysisResult } from './types/topography';

const STORAGE_KEY = 'zt_api_key';

export default function App() {
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      import.meta.env.VITE_ANTHROPIC_API_KEY ||
      sessionStorage.getItem(STORAGE_KEY) ||
      ''
    );
  });
  const [showKeyInput, setShowKeyInput] = useState(!apiKey);

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'>('image/jpeg');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredParam, setHoveredParam] = useState<string | null>(null);

  const handleApiKey = useCallback((key: string) => {
    setApiKey(key);
    sessionStorage.setItem(STORAGE_KEY, key);
    setShowKeyInput(false);
  }, []);

  const handleImage = useCallback(
    (base64: string, mime: typeof imageMime, preview: string) => {
      setImageBase64(base64);
      setImageMime(mime);
      setPreviewUrl(preview);
      setResult(null);
      setError(null);
    },
    []
  );

  const analyze = useCallback(async () => {
    if (!imageBase64 || !apiKey) return;
    setAnalyzing(true);
    setError(null);
    try {
      const r = await analyzeTopographyImage(imageBase64, imageMime, apiKey);
      setResult(r);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('401') || msg.includes('authentication')) {
        setError('Invalid API key. Please update your key.');
        setShowKeyInput(true);
      } else {
        setError(msg);
      }
    } finally {
      setAnalyzing(false);
    }
  }, [imageBase64, imageMime, apiKey]);

  // Auto-analyze when image is loaded
  useEffect(() => {
    if (imageBase64 && apiKey && !analyzing && !result) {
      analyze();
    }
  }, [imageBase64, apiKey, analyzing, result, analyze]);

  const reset = () => {
    setImageBase64(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {showKeyInput && (
        <ApiKeyInput onSave={handleApiKey} currentKey={apiKey} />
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Topography Analysis</h2>
            <p className="text-sm text-gray-500">
              Upload a screenshot from any corneal topographer — abnormal values will be highlighted automatically
            </p>
          </div>
          <div className="flex gap-2">
            {result && (
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
            )}
            <button
              onClick={() => setShowKeyInput(true)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-2 transition-colors shadow-sm"
              title="Change API key"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              API Key
            </button>
          </div>
        </div>

        {/* Upload area (shown when no image) */}
        {!previewUrl && (
          <ImageUploader onImage={handleImage} disabled={!apiKey} />
        )}

        {/* Loading state */}
        {analyzing && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-sky-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-sky-600 border-t-transparent animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-700">Analyzing topography...</p>
              <p className="text-sm text-gray-500 mt-1">
                Claude Vision is extracting all parameters. This takes ~10–20 seconds.
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
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
            <button onClick={() => analyze()} className="text-sm text-red-700 hover:text-red-900 font-semibold underline flex-shrink-0">
              Retry
            </button>
          </div>
        )}

        {/* Results layout */}
        {previewUrl && result && !analyzing && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: annotated image */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Annotated Image</h3>
                <button
                  onClick={reset}
                  className="text-xs text-sky-600 hover:text-sky-800 underline"
                >
                  Upload different image
                </button>
              </div>
              <AnnotatedCanvas
                imageSrc={previewUrl}
                parameters={result.parameters}
                hoveredParam={hoveredParam}
              />
            </div>

            {/* Right: results panels */}
            <div className="space-y-4">
              <ResultSummary result={result} />

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  All Parameters
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    Hover a row to highlight on image
                  </span>
                </h3>
                <ParameterTable
                  parameters={result.parameters}
                  onHover={setHoveredParam}
                />
              </div>
            </div>
          </div>
        )}

        {/* Image shown before analysis completes */}
        {previewUrl && !result && !analyzing && !error && (
          <div className="flex justify-center">
            <img
              src={previewUrl}
              alt="Topography screenshot"
              className="max-h-96 rounded-xl border border-gray-200 shadow-sm"
            />
          </div>
        )}
      </main>
    </div>
  );
}
