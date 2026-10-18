import React, { useState } from 'react';
import type { CategoriaVariable, CategoriaIcono, CategoriaColor } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { X, Save, Trash2 } from 'lucide-react';

interface Props {
  abierto: boolean;
  categoriaInicial?: CategoriaVariable | null;
  onCerrar: () => void;
  onGuardar: (cat: Omit<CategoriaVariable, 'id'>, idExistente?: string) => void;
  onEliminar?: (id: string) => void;
  puedeEliminar: boolean;
}

export const CategoryModal: React.FC<Props> = ({
  abierto,
  categoriaInicial,
  onCerrar,
  onGuardar,
  onEliminar,
  puedeEliminar,
}) => {
  const [nombre, setNombre] = useState(categoriaInicial ? categoriaInicial.nombre : '');
  const [presupuesto, setPresupuesto] = useState(
    categoriaInicial ? String(categoriaInicial.presupuesto) : '150'
  );
  const [icono, setIcono] = useState<CategoriaIcono>(
    categoriaInicial ? categoriaInicial.icono : 'ShoppingCart'
  );
  const [color, setColor] = useState<CategoriaColor>(
    categoriaInicial ? categoriaInicial.color : 'emerald'
  );

  if (!abierto) return null;

  const iconosDisponibles: CategoriaIcono[] = [
    'ShoppingCart',
    'Utensils',
    'Car',
    'ShoppingBag',
    'HeartPulse',
    'Gamepad2',
    'Home',
    'Coffee',
    'Plane',
    'Tag',
  ];

  const coloresDisponibles: CategoriaColor[] = [
    'emerald',
    'amber',
    'blue',
    'purple',
    'rose',
    'teal',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const presNum = parseFloat(presupuesto);
    if (isNaN(presNum) || presNum < 0 || !nombre.trim()) return;

    onGuardar(
      {
        nombre: nombre.trim(),
        presupuesto: presNum,
        icono,
        color,
      },
      categoriaInicial ? categoriaInicial.id : undefined
    );
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[430px] bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <CategoryIcon icono={icono} color={color} size={16} />
            <h2 className="text-base font-bold text-zinc-100">
              {categoriaInicial ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
          </div>
          <button
            onClick={onCerrar}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Nombre de la Categoría
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Ocio, Salud, Mascotas..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-medium"
              required
            />
          </div>

          {/* Presupuesto Asignado */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Presupuesto Asignado por Ciclo (€)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={presupuesto}
                onChange={(e) => setPresupuesto(e.target.value)}
                placeholder="150.00"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-base font-bold font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="absolute right-3 top-2 text-sm font-mono text-zinc-500">€</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Tope mensual o por ciclo estimado para esta categoría.
            </p>
          </div>

          {/* Selector de Icono */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Icono Representativo
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-2 bg-zinc-900/60 rounded-xl border border-zinc-800">
              {iconosDisponibles.map((ico) => {
                const seleccionado = icono === ico;
                return (
                  <button
                    key={ico}
                    type="button"
                    onClick={() => setIcono(ico)}
                    className={`flex items-center justify-center p-2 rounded-xl border transition cursor-pointer ${
                      seleccionado
                        ? 'bg-zinc-800 border-emerald-500 shadow-sm ring-1 ring-emerald-500/50'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <CategoryIcon icono={ico} color={color} size={16} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector de Color */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Color de Identidad
            </label>
            <div className="flex items-center gap-2">
              {coloresDisponibles.map((c) => {
                const seleccionado = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`flex-1 py-2 rounded-xl border transition cursor-pointer capitalize text-[10px] font-medium flex items-center justify-center gap-1 ${
                      seleccionado
                        ? 'ring-2 ring-white border-transparent font-bold'
                        : 'border-zinc-800 text-zinc-400'
                    } ${
                      c === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : c === 'amber'
                        ? 'bg-amber-500/20 text-amber-400'
                        : c === 'blue'
                        ? 'bg-blue-500/20 text-blue-400'
                        : c === 'purple'
                        ? 'bg-purple-500/20 text-purple-400'
                        : c === 'rose'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-teal-500/20 text-teal-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-98 transition cursor-pointer"
            >
              <Save size={15} />
              <span>{categoriaInicial ? 'Guardar Cambios' : 'Crear Categoría'}</span>
            </button>

            {categoriaInicial && puedeEliminar && onEliminar && (
              <button
                type="button"
                onClick={() => {
                  onEliminar(categoriaInicial.id);
                  onCerrar();
                }}
                className="p-2.5 rounded-xl bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition cursor-pointer"
                title="Eliminar categoría"
              >
                <Trash2 size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={onCerrar}
              className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-800 transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
