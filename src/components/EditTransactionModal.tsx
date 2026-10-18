import React, { useState } from 'react';
import type { TransaccionVariable, CategoriaVariable } from '../types';
import { X, Trash2, Check } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  abierto: boolean;
  transaccion: TransaccionVariable | null;
  categorias: CategoriaVariable[];
  onCerrar: () => void;
  onGuardar: (txActualizada: TransaccionVariable) => void;
  onEliminar: (id: string) => void;
}

interface FormProps {
  transaccion: TransaccionVariable;
  categorias: CategoriaVariable[];
  onCerrar: () => void;
  onGuardar: (txActualizada: TransaccionVariable) => void;
  onEliminar: (id: string) => void;
}

const EditForm: React.FC<FormProps> = ({
  transaccion,
  categorias,
  onCerrar,
  onGuardar,
  onEliminar,
}) => {
  const [importe, setImporte] = useState(String(transaccion.importe));
  const [comercio, setComercio] = useState(transaccion.comercio);
  const [categoriaId, setCategoriaId] = useState(transaccion.categoriaId);
  const [tipo, setTipo] = useState<'gasto' | 'ingreso'>(transaccion.tipo);
  const [confirmado, setConfirmado] = useState(transaccion.confirmado);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const impNum = parseFloat(importe);
    if (isNaN(impNum) || impNum <= 0) return;

    onGuardar({
      ...transaccion,
      importe: impNum,
      comercio: comercio.trim() || 'Movimiento',
      categoriaId,
      tipo,
      confirmado,
    });
    onCerrar();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {/* Importe y Tipo */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Importe (€)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-base font-bold font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Tipo</label>
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setTipo('gasto')}
              className={`flex-1 py-1 text-xs font-medium rounded-lg cursor-pointer ${
                tipo === 'gasto' ? 'bg-zinc-800 text-rose-400' : 'text-zinc-400'
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setTipo('ingreso')}
              className={`flex-1 py-1 text-xs font-medium rounded-lg cursor-pointer ${
                tipo === 'ingreso' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400'
              }`}
            >
              Ingreso
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Concepto / Comercio</label>
        <input
          type="text"
          value={comercio}
          onChange={(e) => setComercio(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
          required
        />
      </div>

      {/* Selector de categoría directo */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          Cambiar Categoría
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
                    ? 'bg-zinc-800 border-emerald-500/80 shadow-sm ring-1 ring-emerald-500/50'
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

      {/* Estado Confirmado */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setConfirmado(!confirmado)}
          className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            confirmado
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}
        >
          <Check size={14} />
          <span>{confirmado ? 'Confirmado / Liquidado' : 'Pendiente de cobro'}</span>
        </button>
      </div>

      {/* Botones de acción */}
      <div className="pt-2 flex items-center gap-2">
        <button
          type="submit"
          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-98 transition cursor-pointer"
        >
          <span>Guardar Cambios</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onEliminar(transaccion.id);
            onCerrar();
          }}
          className="p-2.5 rounded-xl bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition cursor-pointer"
          title="Eliminar movimiento"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </form>
  );
};

export const EditTransactionModal: React.FC<Props> = ({
  abierto,
  transaccion,
  categorias,
  onCerrar,
  onGuardar,
  onEliminar,
}) => {
  if (!abierto || !transaccion) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[430px] bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <h2 className="text-base font-bold text-zinc-100">Editar Movimiento</h2>
          <button
            onClick={onCerrar}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <EditForm
          key={transaccion.id}
          transaccion={transaccion}
          categorias={categorias}
          onCerrar={onCerrar}
          onGuardar={onGuardar}
          onEliminar={onEliminar}
        />
      </div>
    </div>
  );
};
