/**
 * Route-level Suspense fallbacks — richer than a plain spinner so the
 * layout doesn't collapse while a lazy chunk loads.
 */

export function PublicRouteSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-cream">
      <div className="border-2 border-ink bg-paper px-6 py-3 font-display text-sm shadow-brutal">
        Yükleniyor…
      </div>
    </div>
  );
}

function Bar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse border-2 border-ink bg-paper ${className}`}
      aria-hidden
    />
  );
}

export function AppRouteSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Yükleniyor">
      <div className="space-y-3">
        <Bar className="h-3 w-24" />
        <Bar className="h-12 w-2/3" />
        <Bar className="h-4 w-1/2" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Bar className="h-24" />
        <Bar className="h-24" />
        <Bar className="h-24" />
        <Bar className="h-24" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Bar className="h-64" />
        <Bar className="h-64" />
      </div>
      <span className="sr-only">Sayfa yükleniyor</span>
    </div>
  );
}

export function AuthRouteSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6 py-10">
      <div className="w-full max-w-[440px] space-y-4">
        <Bar className="h-11 w-40" />
        <div className="space-y-3 border-2 border-ink bg-paper p-8 shadow-brutal">
          <Bar className="h-9 w-3/4" />
          <Bar className="h-4 w-1/2" />
          <Bar className="h-11 w-full" />
          <Bar className="h-11 w-full" />
          <Bar className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ReportRouteSkeleton() {
  return (
    <div className="min-h-screen bg-cream px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <Bar className="h-12 w-2/3" />
        <Bar className="h-5 w-1/3" />
        <Bar className="h-48 w-full" />
        <Bar className="h-48 w-full" />
      </div>
    </div>
  );
}
