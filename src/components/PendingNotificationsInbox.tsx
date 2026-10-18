import React from 'react';
import type { TransaccionVariable, CategoriaVariable } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatearMoneda, formatearFechaMovimiento } from '../utils/calculations';
import { BellRing, Check, Trash2, Sparkles, ArrowDownRight, ArrowUpRight } from 'lucide-react';

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
  if (transaccionesPendientes.length === 0) return null;

  return (
    <div className="rounded-3xl bg-gradient-to-b from-amber-500/10 via-zinc-900/90 to-zinc-950 p-4 border border-amber-500/30 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-sm animate-pulse">
            <BellRing size={15} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
              <span>Notificaciones pendientes de confirmar</span>
              <span className="text-[10px] bg-amber-500 text-zinc-950 font-black px-1.5 py-0.2 rounded-full font-mono">
                {transaccionesPendientes.length}
              </span>
            </h2>
            <p className="text-[10px] text-zinc-400">
              Confirma en 1 toque y el sistema aprenderá el comercio
            </p>
          </div>
        </div>
      </div>

      {/* List of pending notifications */}
      <div className="space-y-3 relative z-10">
        {transaccionesPendientes.map((tx) => {
          const esGasto = tx.tipo === 'gasto';
          const categoriaSugerida = categorias.find((c) => c.id === tx.categoriaId);

          return (
            <div
              key={tx.id}
              className="bg-zinc-950/80 rounded-2xl p-3 border border-zinc-800 shadow-md space-y-2.5"
            >
              {/* Info row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-100 truncate">
                      {tx.comercio}
                    </span>
                    {tx.origenNotificacion && (
                      <span className="text-[9px] uppercase tracking-wider text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-md font-medium shrink-0">
                        Bancaria
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                    <span>{formatearFechaMovimiento(tx.fecha)}</span>
                    {categoriaSugerida && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
                          <Sparkles size={10} /> Sugerido: {categoriaSugerida.nombre}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      className={`font-mono text-sm font-extrabold flex items-center justify-end ${
                        esGasto ? 'text-zinc-100' : 'text-emerald-400'
                      }`}
                    >
                      {esGasto ? (
                        <ArrowDownRight size={13} className="text-zinc-500" />
                      ) : (
                        <ArrowUpRight size={13} className="text-emerald-400" />
                      )}
                      <span>
                        {esGasto ? '-' : '+'}
                        {formatearMoneda(Math.abs(tx.importe))}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDescartarNotificacion(tx.id)}
                    className="p-1 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-900 transition cursor-pointer"
                    title="Descartar notificación"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* 1-Tap Category buttons row with auto-learning */}
              <div>
                <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">
                  Toca para clasificar y recordar siempre:
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {categorias.map((cat) => {
                    const esSugerida = cat.id === tx.categoriaId;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          onConfirmarConCategoria(tx.id, cat.id, tx.comercio)
                        }
                        className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-center transition cursor-pointer active:scale-95 ${
                          esSugerida
                            ? 'bg-emerald-500/15 border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/40 text-emerald-300'
                            : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/80'
                        }`}
                        title={`Confirmar como ${cat.nombre}`}
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
