export function Header() {
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
        <span className="text-white text-xs font-mono bg-white/20 px-2 py-0.5 rounded-full">v2.52</span>
      </div>
    </header>
  );
}
