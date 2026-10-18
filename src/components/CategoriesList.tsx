import React from 'react';
import type { CategoriaVariable, TransaccionVariable, CicloFechas } from '../types';
import { CategoryIcon } from './CategoryIcon';
import {
  calcularProgresoCategorias,
  formatearMoneda,
} from '../utils/calculations';

interface Props {
  categorias: CategoriaVariable[];
  transacciones: TransaccionVariable[];
  ciclo: CicloFechas;
}

export const CategoriesList: React.FC<Props> = ({
  categorias,
  transacciones,
  ciclo,
}) => {
  const categoriasConProgreso = calcularProgresoCategorias(
    categorias,
    transacciones,
    ciclo
  );

  const getBarColor = (estadoRitmo: 'verde' | 'ambar' | 'rojo', colorBase: string) => {
    if (estadoRitmo === 'rojo') return 'bg-rose-500 shadow-rose-500/20';
    if (estadoRitmo === 'ambar') return 'bg-amber-500 shadow-amber-500/20';
    // verde o en ritmo
    switch (colorBase) {
      case 'emerald':
        return 'bg-emerald-500 shadow-emerald-500/20';
      case 'amber':
        return 'bg-amber-400 shadow-amber-400/20';
      case 'blue':
        return 'bg-blue-500 shadow-blue-500/20';
      case 'purple':
        return 'bg-purple-500 shadow-purple-500/20';
      case 'rose':
        return 'bg-rose-500 shadow-rose-500/20';
      case 'teal':
        return 'bg-teal-500 shadow-teal-500/20';
      default:
        return 'bg-emerald-500 shadow-emerald-500/20';
    }
  };

  const posicionMarcador = Math.min(100, Math.max(0, ciclo.porcentajeCicloTranscurrido));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-zinc-200">Categorías Variables</h2>
        <span className="text-[11px] text-zinc-500 font-mono">
          {categorias.length} {categorias.length === 1 ? 'categoría activa' : 'categorías activas'}
        </span>
      </div>

      <div className="space-y-2.5">
        {categoriasConProgreso.map((cat) => {
          const anchoBarra = Math.min(100, Math.max(0, cat.porcentajeGastado));
          const sobrepasado = cat.gastado > cat.presupuesto;

          return (
            <div
              key={cat.id}
              className="bg-zinc-900/60 hover:bg-zinc-900/80 transition-all rounded-2xl p-3.5 border border-zinc-800/80"
            >
              {/* Category Header Row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryIcon icono={cat.icono} color={cat.color} size={16} />
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-zinc-200 truncate">
                      {cat.nombre}
                    </h3>
                    <div className="text-[10px] text-zinc-400">
                      Restante:{' '}
                      <span
                        className={`font-mono ${
                          sobrepasado ? 'text-rose-400 font-medium' : 'text-zinc-300'
                        }`}
                      >
                        {formatearMoneda(cat.restante)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-xs font-bold text-zinc-100">
                    {formatearMoneda(cat.gastado)}
                  </div>
                  <div className="font-mono text-[10px] text-zinc-500">
                    de {formatearMoneda(cat.presupuesto)} ({cat.porcentajeGastado.toFixed(0)}%)
                  </div>
                </div>
              </div>

              {/* Progress Bar with Shiny Marker */}
              <div className="relative my-2">
                {/* Track */}
                <div className="h-2.5 w-full bg-zinc-800/90 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(
                      cat.estadoRitmo,
                      cat.color
                    )}`}
                    style={{ width: `${anchoBarra}%` }}
                  />
                </div>

                {/* Vertical Marker (Ritmo del ciclo) */}
                <div
                  className="absolute -top-0.5 bottom-0 pointer-events-none flex flex-col items-center"
                  style={{
                    left: `${posicionMarcador}%`,
                    transform: 'translateX(-50%)',
                  }}
                  title={`Ritmo del ciclo: día ${ciclo.diaEnCiclo}/${ciclo.diasTotalesCiclo} (${posicionMarcador.toFixed(1)}%)`}
                >
                  <div className="w-1.5 h-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,1)]" />
                  <div className="w-0.5 h-3.5 bg-white shadow-[0_0_8px_rgba(255,255,255,1)] z-10" />
                </div>
              </div>

              {/* Status footer for this category */}
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>
                  {cat.estadoRitmo === 'verde' && (
                    <span className="text-emerald-400">● En ritmo óptimo</span>
                  )}
                  {cat.estadoRitmo === 'ambar' && (
                    <span className="text-amber-400">▲ Acelerado sobre el día {ciclo.diaEnCiclo}</span>
                  )}
                  {cat.estadoRitmo === 'rojo' && (
                    <span className="text-rose-400">■ &gt;90% consumido</span>
                  )}
                </span>
                <span className="font-mono text-zinc-400">
                  {cat.porcentajeGastado.toFixed(1)}% consumido
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
