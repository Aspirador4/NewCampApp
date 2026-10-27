export default function RootLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[60vh] space-y-4">
      <div className="w-16 h-16 rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-[#14161f] shadow-tactile flex items-center justify-center relative">
        <div className="w-8 h-8 rounded-full border-3 border-neutral-200 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white animate-spin" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-display font-black text-xs text-neutral-950 dark:text-white uppercase tracking-widest">
          Sincronizando Vestuario
        </p>
        <p className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
          Cargando datos oficiales...
        </p>
      </div>
    </div>
  )
}
