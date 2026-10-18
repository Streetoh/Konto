import React, { useState } from 'react';
import type { CategoriaVariable, TransaccionVariable } from '../types';
import { X, Check } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  abierto: boolean;
  categorias: CategoriaVariable[];
  onCerrar: () => void;
  onGuardar: (nuevaTransaccion: Omit<TransaccionVariable, 'id'>) => void;
}

export const AddTransactionModal: React.FC<Props> = ({
  abierto,
  categorias,
  onCerrar,
  onGuardar,
}) => {
  const [importe, setImporte] = useState('');
  const [tipo, setTipo] = useState<'gasto' | 'ingreso'>('gasto');
  const [comercio, setComercio] = useState('');
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id || '');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [confirmado, setConfirmado] = useState(true);

  if (!abierto) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const importeNum = parseFloat(importe);
    if (isNaN(importeNum) || importeNum <= 0) return;

    onGuardar({
      importe: importeNum,
      tipo,
      comercio: comercio.trim() || (tipo === 'gasto' ? 'Gasto Variable' : 'Ingreso Extra'),
      categoriaId,
      fecha: new Date(fecha).toISOString(),
      confirmado,
    });

    // Reset form
    setImporte('');
    setComercio('');
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-[430px] bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <h2 className="text-base font-bold text-zinc-100">Nuevo Movimiento Variable</h2>
          <button
            onClick={onCerrar}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Tipo Selector (Gasto / Ingreso) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setTipo('gasto')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                tipo === 'gasto'
                  ? 'bg-zinc-800 text-rose-400 shadow-sm border border-rose-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Gasto Variable
            </button>
            <button
              type="button"
              onClick={() => setTipo('ingreso')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                tipo === 'ingreso'
                  ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Ingreso Extra
            </button>
          </div>

          {/* Importe Big Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Importe (€)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-2xl font-bold font-mono text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                required
              />
              <span className="absolute right-4 top-3 text-xl font-mono text-zinc-500">€</span>
            </div>
          </div>

          {/* Comercio / Concepto */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Comercio o Concepto
            </label>
            <input
              type="text"
              value={comercio}
              onChange={(e) => setComercio(e.target.value)}
              placeholder="Ej. Mercadona, Bar Pepe, Repsol..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Categoría Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Categoría Asignada
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categorias.map((cat) => {
                const seleccionada = categoriaId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaId(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${
                      seleccionada
                        ? 'bg-zinc-800 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/50'
                        : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <CategoryIcon
                      icono={cat.icono}
                      color={cat.color}
                      size={14}
                      className="p-1.5"
                    />
                    <span className="text-xs font-medium text-zinc-200 truncate">
                      {cat.nombre}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fecha y Confirmación */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Estado
              </label>
              <button
                type="button"
                onClick={() => setConfirmado(!confirmado)}
                className={`w-full py-1.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  confirmado
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <Check size={12} className={confirmado ? 'opacity-100' : 'opacity-30'} />
                <span>{confirmado ? 'Confirmado' : 'Pendiente'}</span>
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-98 transition cursor-pointer"
            >
              Registrar Movimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
