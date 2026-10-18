import React from 'react';
import { Sliders, ChevronLeft, ChevronRight, Sparkles, Calendar } from 'lucide-react';
import { formatearMesLegible } from '../utils/calculations';

interface Props {
  nombreApp: string;
  mesActual: string;
  etiquetaRangoCiclo: string;
  diasRestantesCiclo: number;
  onCambiarMes: (nuevoMes: string) => void;
  onAbrirAjustesRapidos: () => void;
}

export const Header: React.FC<Props> = ({
  nombreApp,
  mesActual,
  etiquetaRangoCiclo,
  diasRestantesCiclo,
  onCambiarMes,
  onAbrirAjustesRapidos,
}) => {
  const navegarMes = (delta: number) => {
    const [yearStr, monthStr] = mesActual.split('-');
    const current = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1 + delta, 1);
    const newYear = current.getFullYear();
    const newMonth = String(current.getMonth() + 1).padStart(2, '0');
    onCambiarMes(`${newYear}-${newMonth}`);
  };

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-900/80 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* App Title & Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles size={16} className="text-zinc-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold tracking-tight text-zinc-100 leading-none">
                {nombreApp}
              </h1>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Sueldo Dinámico
              </span>
            </div>
            {/* Etiqueta discreta con el rango activo del ciclo */}
            <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1 mt-0.5">
              <span>Ciclo:</span>
              <strong className="text-zinc-200 font-semibold">{etiquetaRangoCiclo}</strong>
              <span>•</span>
              <span className="text-emerald-400 font-mono">Quedan {diasRestantesCiclo}d</span>
            </p>
          </div>
        </div>

        {/* Quick Settings Action */}
        <button
          onClick={onAbrirAjustesRapidos}
          aria-label="Ajustes de nómina y ciclo"
          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800/80 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-sm"
        >
          <Sliders size={15} />
          <span className="hidden sm:inline">Presupuesto</span>
        </button>
      </div>

      {/* Cycle / Month Navigator */}
      <div className="mt-2.5 flex items-center justify-between bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-2 py-1.5">
        <button
          onClick={() => navegarMes(-1)}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition active:scale-90 cursor-pointer"
          title="Ciclo anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="text-center flex items-center gap-2">
          <Calendar size={13} className="text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-200 capitalize tracking-wide">
              {formatearMesLegible(mesActual)}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {etiquetaRangoCiclo}
            </span>
          </div>
        </div>

        <button
          onClick={() => navegarMes(1)}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition active:scale-90 cursor-pointer"
          title="Ciclo siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </header>
  );
};
