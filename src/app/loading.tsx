export default function RootLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[60vh] space-y-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
      </div>
      <p className="text-xs font-semibold text-neutral-400 animate-pulse tracking-wide uppercase">
        Cargando...
      </p>
    </div>
  )
}
