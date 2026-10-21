import React, { useState } from 'react';
import type { TransaccionVariable, CategoriaVariable } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatearMoneda, formatearFechaMovimiento } from '../utils/calculations';
import {
  BellRing,
  Check,
  X,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Props {
  transaccionesPendientes: TransaccionVariable[];
  categorias: CategoriaVariable[];
  onConfirmarConCategoria: (txId: string, categoriaId: string, nombreComercio: string) => void;
  onDescartarNotificacion: (txId: string) => void;
}

export const PendingNotificationsInbox: React.FC<Props> = ({
  transaccionesPendientes,
  categorias,
  onConfirmarConCategoria,
  onDescartarNotificacion,
}) => {
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Record<string, boolean>>({});

  if (transaccionesPendientes.length === 0) return null;

  const toggleExpandirCategorias = (txId: string) => {
    setCategoriasExpandidas((prev) => ({
      ...prev,
      [txId]: !prev[txId],
    }));
  };

  const handleAceptarTodas = () => {
    transaccionesPendientes.forEach((tx) => {
      onConfirmarConCategoria(tx.id, tx.categoriaId, tx.comercio);
    });
  };

  return (
    <div className="rounded-3xl bg-gradient-to-b from-amber-500/15 via-zinc-900/95 to-zinc-950 p-4 border border-amber-500/40 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Resplandor ambiental de fondo */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera de la bandeja */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-sm animate-pulse">
            <BellRing size={16} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
              <span>Gastos detectados pendientes</span>
              <span className="text-[10px] bg-amber-500 text-zinc-950 font-black px-1.5 py-0.2 rounded-full font-mono">
                {transaccionesPendientes.length}
              </span>
            </h2>
            <p className="text-[10px] text-zinc-400">
              Acepta para registrar en tu presupuesto o deniega para descartar
            </p>
          </div>
        </div>

        {transaccionesPendientes.length > 1 && (
          <button
            type="button"
            onClick={handleAceptarTodas}
            className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-2 py-1 rounded-xl transition cursor-pointer"
          >
            Aceptar todas
          </button>
        )}
      </div>

      {/* Lista de gastos pendientes */}
      <div className="space-y-3 relative z-10">
        {transaccionesPendientes.map((tx) => {
          const esGasto = tx.tipo === 'gasto';
          const categoriaSugerida = categorias.find((c) => c.id === tx.categoriaId);
          const estaExpandida = Boolean(categoriasExpandidas[tx.id]);

          return (
            <div
              key={tx.id}
              className="bg-zinc-950/90 rounded-2xl p-3.5 border border-zinc-800 shadow-lg space-y-3"
            >
              {/* Fila principal con datos del comercio y monto */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-zinc-100 truncate">
                      {tx.comercio}
                    </span>
                    {tx.origenNotificacion && (
                      <span className="text-[9px] uppercase tracking-wider text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-md font-medium shrink-0">
                        Banco
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{formatearFechaMovimiento(tx.fecha)}</span>
                    {categoriaSugerida && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <Sparkles size={11} className="text-emerald-400" />
                          <span>Sugerido: {categoriaSugerida.nombre}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Importe en grande */}
                <div className="text-right shrink-0">
                  <div
                    className={`font-mono text-base font-extrabold flex items-center justify-end ${
                      esGasto ? 'text-zinc-100' : 'text-emerald-400'
                    }`}
                  >
                    {esGasto ? (
                      <ArrowDownRight size={14} className="text-zinc-500" />
                    ) : (
                      <ArrowUpRight size={14} className="text-emerald-400" />
                    )}
                    <span>
                      {esGasto ? '-' : '+'}
                      {formatearMoneda(Math.abs(tx.importe))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción principales: ACEPTAR y DENEGAR */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => onConfirmarConCategoria(tx.id, tx.categoriaId, tx.comercio)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-98 transition cursor-pointer"
                >
                  <Check size={15} className="stroke-[3]" />
                  <span>Aceptar ({categoriaSugerida?.nombre?.split('/')[0] || 'Gasto'})</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDescartarNotificacion(tx.id)}
                  className="py-2.5 px-3.5 rounded-xl bg-zinc-900 hover:bg-rose-950/50 border border-zinc-800 hover:border-rose-700/60 text-zinc-300 hover:text-rose-400 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition cursor-pointer"
                >
                  <X size={15} className="stroke-[2.5]" />
                  <span>Denegar</span>
                </button>
              </div>

              {/* Botón desplegable para elegir otra categoría */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => toggleExpandirCategorias(tx.id)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition cursor-pointer"
                >
                  <span>{estaExpandida ? 'Ocultar selector de categorías' : '✎ Cambiar a otra categoría antes de aceptar'}</span>
                  {estaExpandida ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {estaExpandida && (
                  <div className="mt-2 pt-2 border-t border-zinc-800/60 space-y-1.5 animate-in fade-in duration-200">
                    <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500">
                      Toca una categoría para clasificar y confirmar:
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {categorias.map((cat) => {
                        const esSugerida = cat.id === tx.categoriaId;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => onConfirmarConCategoria(tx.id, cat.id, tx.comercio)}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-center transition cursor-pointer active:scale-95 ${
                              esSugerida
                                ? 'bg-emerald-500/20 border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/40 text-emerald-300'
                                : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-850'
                            }`}
                          >
                            <CategoryIcon
                              icono={cat.icono}
                              color={cat.color}
                              size={14}
                              className="p-1 mb-1"
                            />
                            <span className="text-[10px] font-medium leading-tight truncate w-full">
                              {cat.nombre.split('/')[0]}
                            </span>
                            {esSugerida && (
                              <span className="text-[8px] font-bold text-emerald-400 flex items-center gap-0.5 mt-0.5">
                                <Check size={8} className="stroke-[3]" /> Auto
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
