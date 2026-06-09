interface Props {
  apiKey: string | null;
  onOpenSettings: () => void;
}

export function Header({ apiKey, onOpenSettings }: Props) {
  return (
    <header className="bg-gradient-to-r from-sky-900 to-cyan-800 text-white px-6 py-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-xl">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
            <circle cx="12" cy="12" r="3" />
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          </svg>
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">Zahran Topolyzer</h1>
          <p className="text-sky-200 text-xs">
            Corneal Topography Analyzer — Pentacam · Sirius · Galilei · Orbscan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            title={apiKey ? 'Claude Vision enabled — click to change API key' : 'Set Anthropic API key for AI-powered analysis'}
            className="flex items-center gap-1.5 text-xs font-medium bg-white/15 hover:bg-white/25 transition-colors rounded-full px-3 py-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            {apiKey ? (
              <span className="text-green-300">AI Vision</span>
            ) : (
              <span className="text-amber-300">No API Key</span>
            )}
          </button>
          <span className="text-white text-xs font-mono bg-white/20 px-2 py-0.5 rounded-full">v3.5</span>
        </div>
      </div>
    </header>
  );
}
