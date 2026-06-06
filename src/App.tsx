import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ApiKeyInput } from './components/ApiKeyInput';
import { ImageUploader } from './components/ImageUploader';
import { AnnotatedCanvas } from './components/AnnotatedCanvas';
import { ParameterTable } from './components/ParameterTable';
import { ResultSummary } from './components/ResultSummary';
import { analyzeTopographyImage } from './lib/analyzer';
import { analyzeWithOCR } from './lib/ocrAnalyzer';
import type { AnalysisResult } from './types/topography';

const STORAGE_KEY = 'zt_api_key';
type AppMode = 'offline' | 'ai';

export default function App() {
  const [mode, setMode] = useState<AppMode>('offline');

  const [apiKey, setApiKey] = useState<string>(() =>
    import.meta.env.VITE_ANTHROPIC_API_KEY || sessionStorage.getItem(STORAGE_KEY) || ''
  );
  const [showKeyInput, setShowKeyInput] = useState(false);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'>('image/jpeg');

  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredParam, setHoveredParam] = useState<string | null>(null);

  const handleApiKey = useCallback((key: string) => {
    setApiKey(key);
    sessionStorage.setItem(STORAGE_KEY, key);
    setShowKeyInput(false);
    setMode('ai');
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

  const runOcr = useCallback(async (dataUrl: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const r = await analyzeWithOCR(dataUrl, setProgress);
      setResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
      setProgress('');
    }
  }, []);

  const runAI = useCallback(async (base64: string, mime: typeof imageMime) => {
    if (!apiKey) return;
    setAnalyzing(true);
    setProgress('Sending to Claude Vision…');
    setError(null);
    try {
      const r = await analyzeTopographyImage(base64, mime, apiKey);
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
      setProgress('');
    }
  }, [apiKey]);

  // Auto-run analysis when image is set
  useEffect(() => {
    if (!imageDataUrl || !imageBase64 || analyzing || result) return;
    if (mode === 'offline') {
      runOcr(imageDataUrl);
    } else if (mode === 'ai' && apiKey) {
      runAI(imageBase64, imageMime);
    }
  }, [imageDataUrl, imageBase64, imageMime, mode, apiKey, analyzing, result, runOcr, runAI]);

  const reset = () => {
    setImageBase64(null);
    setImageDataUrl(null);
    setResult(null);
    setError(null);
  };

  const switchMode = (m: AppMode) => {
    if (m === mode) return;
    setMode(m);
    if (m === 'ai' && !apiKey) setShowKeyInput(true);
    reset();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {showKeyInput && (
        <ApiKeyInput onSave={handleApiKey} currentKey={apiKey} onClose={() => setShowKeyInput(false)} />
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-5">

        {/* Mode toggle */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          <button
            onClick={() => switchMode('offline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'offline' ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
              <line x1="2" y1="8" x2="22" y2="8" />
            </svg>
            Offline (OCR)
          </button>
          <button
            onClick={() => switchMode('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'ai' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            AI Mode
          </button>
        </div>

        {/* Mode info banner (only when no image yet) */}
        {!imageDataUrl && !result && (
          <div className={`rounded-xl p-4 border ${
            mode === 'offline' ? 'bg-sky-50 border-sky-200' : 'bg-violet-50 border-violet-200'
          }`}>
            {mode === 'offline' ? (
              <div>
                <p className="font-semibold text-sky-900 text-sm">
                  Offline OCR Mode — No internet &amp; no account required
                </p>
                <p className="text-sky-700 text-sm mt-0.5">
                  Upload a screenshot from Pentacam, Sirius, Galilei, or Orbscan.
                  The app reads every number directly on your device using built-in OCR,
                  then classifies each value and grades ectasia risk — all without internet.
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-violet-900 text-sm">
                  AI Mode — More accurate, requires Anthropic API key + internet
                </p>
                <p className="text-violet-700 text-sm mt-0.5">
                  Claude Vision extracts all visible parameters from the image and highlights
                  abnormal values in place on the screenshot.
                  {!apiKey && (
                    <button onClick={() => setShowKeyInput(true)} className="ml-2 underline font-semibold text-violet-900">
                      Set API key →
                    </button>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Image uploader */}
        {!imageDataUrl && !result && (
          <ImageUploader
            onImage={handleImage}
            disabled={mode === 'ai' && !apiKey}
          />
        )}
        {mode === 'ai' && !apiKey && !imageDataUrl && (
          <p className="text-center text-sm text-gray-500">
            <button onClick={() => setShowKeyInput(true)} className="text-violet-600 underline font-medium">
              Set your Anthropic API key
            </button>{' '}
            to enable AI mode.
          </p>
        )}

        {/* Loading / progress */}
        {analyzing && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative w-16 h-16">
              <div className={`absolute inset-0 rounded-full border-4 ${mode === 'offline' ? 'border-sky-200' : 'border-violet-200'}`}></div>
              <div className={`absolute inset-0 rounded-full border-4 border-t-transparent animate-spin ${mode === 'offline' ? 'border-sky-600' : 'border-violet-600'}`}></div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-700">
                {mode === 'offline' ? 'Extracting parameters…' : 'Analyzing with AI…'}
              </p>
              {progress && (
                <p className="text-sm text-gray-500 mt-1">{progress}</p>
              )}
            </div>
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
              <p className="font-semibold text-red-700">Extraction failed</p>
              <p className="text-sm text-red-600 mt-1 whitespace-pre-wrap">{error}</p>
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
                  {result.parameters.length} parameter{result.parameters.length !== 1 ? 's' : ''} extracted
                  {result.device !== 'Unknown' ? ` · ${result.device}` : ''}
                  {result.eye !== 'unknown' ? ` · ${result.eye}` : ''}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Annotated image */}
              {imageDataUrl && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">
                    Annotated Image
                    <span className="ml-2 text-xs font-normal text-gray-400">Hover a row to highlight</span>
                  </h3>
                  <AnnotatedCanvas
                    imageSrc={imageDataUrl}
                    parameters={result.parameters}
                    hoveredParam={hoveredParam}
                  />
                </div>
              )}

              {/* Results panels */}
              <div className="space-y-4">
                <ResultSummary result={result} />
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">All Parameters</h3>
                  <ParameterTable
                    parameters={result.parameters}
                    onHover={imageDataUrl ? setHoveredParam : undefined}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
