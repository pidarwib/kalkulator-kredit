export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900">
          Credit Calculator BPR
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Aplikasi Simulasi &amp; Kalkulator Kredit Terstandarisasi.
        </p>
        <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs text-slate-500">
          Project Foundation Initialized (Next.js + TypeScript + Tailwind + Prisma)
        </div>
      </div>
    </main>
  );
}
