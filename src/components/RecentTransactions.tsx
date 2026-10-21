import React, { useState } from 'react';
import type { TransaccionVariable, CategoriaVariable } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatearMoneda, formatearFechaMovimiento } from '../utils/calculations';
import { Plus, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { EditTransactionModal } from './EditTransactionModal';

interface Props {
  transacciones: TransaccionVariable[];
  categorias: CategoriaVariable[];
  onNuevaTransaccion: () => void;
  onEditarTransaccion: (tx: TransaccionVariable) => void;
  onEliminarTransaccion: (id: string) => void;
}

export const RecentTransactions: React.FC<Props> = ({
  transacciones,
  categorias,
  onNuevaTransaccion,
  onEditarTransaccion,
  onEliminarTransaccion,
}) => {
  const [transaccionAEditar, setTransaccionAEditar] = useState<TransaccionVariable | null>(null);

  // Mostrar solo movimientos confirmados en Últimos Movimientos.
  // Los pendientes de aprobación se muestran arriba en la Bandeja de Notificaciones Pendientes
  const transaccionesConfirmadas = transacciones.filter((tx) => tx.confirmado !== false);

  // Ordenar de más reciente a más antigua
  const transaccionesOrdenadas = [...transaccionesConfirmadas].sort((a, b) => {
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
  });

  const getCategoria = (id: string) => {
    return (
      categorias.find((c) => c.id === id) || {
        nombre: 'Sin categoría',
        icono: 'ShoppingBag',
        color: 'zinc',
      }
    );
  };

  return (
    <div className="space-y-3 pb-28">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Últimos Movimientos</h2>
          <p className="text-[11px] text-zinc-500">Toca cualquier movimiento para editarlo o cambiar categoría</p>
        </div>

        <button
          onClick={onNuevaTransaccion}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer shrink-0"
        >
          <Plus size={14} className="stroke-[3]" />
          <span>Añadir</span>
        </button>
      </div>

      {transaccionesOrdenadas.length === 0 ? (
        <div className="bg-zinc-900/40 rounded-2xl p-6 text-center border border-zinc-800/60">
          <p className="text-xs text-zinc-400">No hay movimientos registrados en este ciclo.</p>
          <button
            onClick={onNuevaTransaccion}
            className="mt-3 text-xs text-emerald-400 font-medium hover:underline cursor-pointer"
          >
            + Registrar primer gasto
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {transaccionesOrdenadas.map((tx) => {
            const cat = getCategoria(tx.categoriaId);
            const esGasto = tx.tipo === 'gasto';

            return (
              <div
                key={tx.id}
                onClick={() => setTransaccionAEditar(tx)}
                className="group flex items-center justify-between p-3 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 transition cursor-pointer"
              >
                {/* Left: Icon & Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <CategoryIcon
                    icono={cat.icono}
                    color={cat.color}
                    size={16}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-200 truncate group-hover:text-emerald-400 transition">
                        {tx.comercio || 'Movimiento'}
                      </span>
                      {tx.confirmado ? (
                        <span title="Confirmado">
                          <CheckCircle2
                            size={11}
                            className="text-emerald-500/80 shrink-0"
                          />
                        </span>
                      ) : (
                        <span title="Pendiente">
                          <Clock
                            size={11}
                            className="text-amber-500/80 shrink-0"
                          />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                      <span className="font-medium text-zinc-300">{cat.nombre}</span>
                      <span>•</span>
                      <span>{formatearFechaMovimiento(tx.fecha)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Delete quick icon */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      className={`font-mono text-xs font-bold flex items-center justify-end gap-0.5 ${
                        esGasto ? 'text-zinc-100' : 'text-emerald-400'
                      }`}
                    >
                      {esGasto ? (
                        <ArrowDownRight size={12} className="text-zinc-500" />
                      ) : (
                        <ArrowUpRight size={12} className="text-emerald-400" />
                      )}
                      <span>
                        {esGasto ? '-' : '+'}
                        {formatearMoneda(Math.abs(tx.importe))}
                      </span>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400">
                      {tx.confirmado ? 'Liquidado' : 'Pendiente'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEliminarTransaccion(tx.id);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                    title="Eliminar movimiento"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edición de Movimiento */}
      <EditTransactionModal
        abierto={Boolean(transaccionAEditar)}
        transaccion={transaccionAEditar}
        categorias={categorias}
        onCerrar={() => setTransaccionAEditar(null)}
        onGuardar={onEditarTransaccion}
        onEliminar={onEliminarTransaccion}
      />
    </div>
  );
};
