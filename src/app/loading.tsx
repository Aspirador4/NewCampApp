export default function RootLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[60vh] space-y-4">
      <div className="w-16 h-16 rounded-3xl border-2 border-neutral-900 bg-white shadow-tactile flex items-center justify-center relative">
        <div className="w-8 h-8 rounded-full border-3 border-neutral-200 border-t-neutral-900 animate-spin" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-display font-black text-xs text-neutral-950 uppercase tracking-widest">
          Sincronizando Vestuario
        </p>
        <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
          Cargando datos oficiales...
        </p>
      </div>
    </div>
  )
}
