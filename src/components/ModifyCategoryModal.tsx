import React from 'react';
import type { TransaccionVariable, CategoriaVariable } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { X, Check, ArrowRight, Sparkles } from 'lucide-react';
import { vibrate } from '../utils/haptics';

interface Props {
  transaccion: TransaccionVariable | null;
  categorias: CategoriaVariable[];
  onCerrar: () => void;
  onAsignarCategoria: (txId: string, nuevaCategoriaId: string, nombreComercio: string) => void;
}

export const ModifyCategoryModal: React.FC<Props> = ({
  transaccion,
  categorias,
  onCerrar,
  onAsignarCategoria,
}) => {
  if (!transaccion) return null;

  const categoriaActual = categorias.find((c) => c.id === transaccion.categoriaId);

  const handleSeleccionar = (catId: string) => {
    vibrate(20);
    onAsignarCategoria(transaccion.id, catId, transaccion.comercio);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-0 sm:items-center sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[430px] bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 duration-200 max-h-[85vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Modificar Categoría</h3>
              <p className="text-[10px] text-zinc-400">Gasto detectado por notificación</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tarjeta Resumen del Gasto */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              {transaccion.comercio || 'Gasto'}
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {transaccion.importe.toFixed(2)} €
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-zinc-500">Categoría asignada:</div>
            <div className="text-xs font-bold text-amber-400 mt-0.5 flex items-center gap-1 justify-end">
              <span>{categoriaActual?.nombre || 'Sin clasificar'}</span>
              <ArrowRight size={12} className="text-zinc-600" />
            </div>
          </div>
        </div>

        {/* Selector de Nueva Categoría */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          <div className="text-xs font-bold text-zinc-300">Selecciona la categoría correcta:</div>
          <div className="grid grid-cols-2 gap-2">
            {categorias.map((cat) => {
              const esActual = cat.id === transaccion.categoriaId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSeleccionar(cat.id)}
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 text-left transition cursor-pointer active:scale-98 ${
                    esActual
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm shadow-emerald-500/20'
                      : 'bg-zinc-900/70 hover:bg-zinc-850 border-zinc-800/80 text-zinc-300 hover:text-white'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${cat.color || '#10b981'}22` }}
                  >
                    <CategoryIcon icono={cat.icono || 'Tag'} color={cat.color || '#10b981'} size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">{cat.nombre}</div>
                    <div className="text-[10px] text-zinc-500">Toca para asignar</div>
                  </div>
                  {esActual && <Check size={14} className="text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nota explicativa de autoaprendizaje */}
        <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/60 text-[10px] text-zinc-400 flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-400 shrink-0" />
          <span>Konto aprenderá esta categoría para futuros pagos en {transaccion.comercio}.</span>
        </div>
      </div>
    </div>
  );
};
