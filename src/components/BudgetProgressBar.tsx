import React from 'react';
import { formatearMoneda } from '../utils/calculations';
import { Info } from 'lucide-react';

interface Props {
  gastado: number;
  totalPresupuesto: number;
  porcentajeMesTranscurrido: number;
  diaActual: number;
  diasTotalesMes: number;
  estadoRitmo: 'verde' | 'ambar' | 'rojo';
}

export const BudgetProgressBar: React.FC<Props> = ({
  gastado,
  totalPresupuesto,
  porcentajeMesTranscurrido,
  diaActual,
  diasTotalesMes,
  estadoRitmo,
}) => {
  const porcentajeGastado = totalPresupuesto > 0 ? (gastado / totalPresupuesto) * 100 : 0;
  const anchoBarra = Math.min(100, Math.max(0, porcentajeGastado));
  const posicionMarcador = Math.min(100, Math.max(0, porcentajeMesTranscurrido));

  const getColorClasses = () => {
    switch (estadoRitmo) {
      case 'verde':
        return 'bg-emerald-500 shadow-emerald-500/30';
      case 'ambar':
        return 'bg-amber-500 shadow-amber-500/30';
      case 'rojo':
        return 'bg-rose-500 shadow-rose-500/30';
      default:
        return 'bg-emerald-500 shadow-emerald-500/30';
    }
  };

  const getTextoRitmo = () => {
    switch (estadoRitmo) {
      case 'verde':
        return {
          texto: 'Ritmo Excelente (Por debajo del día del mes)',
          clase: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'ambar':
        return {
          texto: 'Atención (Ligeramente por encima del ritmo)',
          clase: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        };
      case 'rojo':
        return {
          texto: 'Alerta (>90% gastado del presupuesto)',
          clase: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        };
    }
  };

  const infoRitmo = getTextoRitmo();

  return (
    <div className="bg-zinc-900/60 rounded-2xl p-4 border border-zinc-800/80">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-zinc-300">Presupuesto Variable</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${infoRitmo.clase}`}
          >
            {porcentajeGastado.toFixed(1)}%
          </span>
        </div>
        <div className="text-right font-mono text-xs text-zinc-400">
          <span className="text-zinc-100 font-semibold">{formatearMoneda(gastado)}</span> /{' '}
          {formatearMoneda(totalPresupuesto)}
        </div>
      </div>

      {/* Progress Bar Container with Current Month Day Marker */}
      <div className="relative mt-3 mb-2">
        {/* Track */}
        <div className="relative h-4 w-full bg-zinc-800/90 rounded-full overflow-hidden">
          {/* Fill Bar */}
          <div
            className={`h-full transition-all duration-500 rounded-full shadow-lg ${getColorClasses()}`}
            style={{ width: `${anchoBarra}%` }}
          />
        </div>

        {/* Shiny White Vertical Marker (Ritmo del ciclo) */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center"
          style={{ left: `${posicionMarcador}%`, transform: 'translateX(-50%)' }}
          title={`Día en ciclo: ${diaActual}/${diasTotalesMes} (${posicionMarcador.toFixed(1)}%)`}
        >
          {/* Top pin head */}
          <div className="w-2.5 h-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] -mt-1" />
          {/* Shiny Line passing through */}
          <div className="w-0.5 h-6 bg-white shadow-[0_0_10px_rgba(255,255,255,1)] z-10" />
        </div>
      </div>

      {/* Bar Footnote / Marker Legend */}
      <div className="flex items-center justify-between mt-2 text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
          <span>
            Ritmo del ciclo: <strong className="text-zinc-200 font-mono">{posicionMarcador.toFixed(1)}%</strong>{' '}
            (Día {diaActual}/{diasTotalesMes})
          </span>
        </div>
        <span className="text-zinc-500 font-mono">
          Resta: {formatearMoneda(Math.max(0, totalPresupuesto - gastado))}
        </span>
      </div>

      {/* Diagnostic helper badge */}
      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
        <span className="flex items-center gap-1">
          <Info size={11} className="text-zinc-500" />
          {infoRitmo.texto}
        </span>
      </div>
    </div>
  );
};
