import React, { useState } from 'react';
import type { CategoriaVariable, TransaccionVariable } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { X, Delete, ArrowDownRight, ArrowUpRight, Check, Zap } from 'lucide-react';
import { vibrate } from '../utils/haptics';

interface Props {
  abierto: boolean;
  categorias: CategoriaVariable[];
  onCerrar: () => void;
  onGuardar: (tx: Omit<TransaccionVariable, 'id'>) => void;
}

const obtenerFechaActualIso = (): string => new Date().toISOString();

export const QuickExpenseSheet: React.FC<Props> = ({
  abierto,
  categorias,
  onCerrar,
  onGuardar,
}) => {
  const [tipo, setTipo] = useState<'gasto' | 'ingreso'>('gasto');
  const [importeStr, setImporteStr] = useState<string>('0');
  const [concepto, setConcepto] = useState<string>('');
  const [errorVacio, setErrorVacio] = useState<boolean>(false);

  if (!abierto) return null;

  // Manejador del teclado numérico
  const handleDigito = (digito: string) => {
    vibrate(15);
    setErrorVacio(false);
    if (digito === '.') {
      if (importeStr.includes('.')) return;
      setImporteStr(importeStr === '0' ? '0.' : importeStr + '.');
      return;
    }

    if (importeStr === '0') {
      setImporteStr(digito);
    } else {
      // Limitar a 2 decimales si ya hay punto
      const parts = importeStr.split('.');
      if (parts.length > 1 && parts[1].length >= 2) {
        return; // ya tiene 2 decimales
      }
      if (importeStr.length < 9) {
        setImporteStr(importeStr + digito);
      }
    }
  };

  const handleBorrar = () => {
    vibrate(15);
    setErrorVacio(false);
    if (importeStr.length <= 1) {
      setImporteStr('0');
    } else {
      setImporteStr(importeStr.slice(0, -1));
    }
  };

  const handleLimpiarTodo = () => {
    vibrate(15);
    setImporteStr('0');
    setErrorVacio(false);
  };

  // Guardado rápido en 3 segundos al tocar categoría
  const handleSeleccionarCategoria = (cat: CategoriaVariable) => {
    const valorNum = parseFloat(importeStr);
    if (isNaN(valorNum) || valorNum <= 0) {
      setErrorVacio(true);
      return;
    }

    vibrate(20);
    onGuardar({
      importe: valorNum,
      tipo: 'gasto',
      comercio: concepto.trim() || cat.nombre,
      categoriaId: cat.id,
      fecha: obtenerFechaActualIso(),
      confirmado: true,
    });

    // Reset y cierre instantáneo
    setImporteStr('0');
    setConcepto('');
    onCerrar();
  };

  // Guardado para ingresos
  const handleGuardarIngreso = () => {
    const valorNum = parseFloat(importeStr);
    if (isNaN(valorNum) || valorNum <= 0) {
      setErrorVacio(true);
      return;
    }

    onGuardar({
      importe: valorNum,
      tipo: 'ingreso',
      comercio: concepto.trim() || 'Ingreso Extra',
      categoriaId: categorias[0]?.id || 'cat-general',
      fecha: obtenerFechaActualIso(),
      confirmado: true,
    });

    setImporteStr('0');
    setConcepto('');
    onCerrar();
  };

  const displayNumero = () => {
    if (!importeStr || importeStr === '0') return '0,00';
    const partes = importeStr.split('.');
    const entero = partes[0];
    const dec = partes[1];
    if (dec !== undefined) {
      return `${entero},${dec}`;
    }
    return `${entero},00`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[430px] bg-zinc-950 border-t border-x border-zinc-800 rounded-t-3xl p-4 shadow-2xl flex flex-col space-y-3 pb-8">
        {/* Header & Mode Switch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setTipo('gasto')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                tipo === 'gasto'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ArrowDownRight size={13} />
              <span>Gasto</span>
            </button>
            <button
              type="button"
              onClick={() => setTipo('ingreso')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                tipo === 'ingreso'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ArrowUpRight size={13} />
              <span>Ingreso extra</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Zap size={11} /> 3 Segundos
            </span>
            <button
              onClick={onCerrar}
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Big Amount Screen */}
        <div className="bg-zinc-900/80 rounded-2xl p-3 border border-zinc-800/90 text-center relative">
          <div className="flex items-baseline justify-center gap-1">
            <span
              className={`text-4xl font-extrabold font-mono tracking-tight ${
                tipo === 'gasto' ? 'text-zinc-100' : 'text-emerald-400'
              }`}
            >
              {displayNumero()}
            </span>
            <span className="text-xl font-mono text-zinc-500 font-bold">€</span>
          </div>

          {/* Optional Discrete Concept Input */}
          <div className="mt-2 pt-2 border-t border-zinc-800/60">
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Concepto opcional (ej. Mercadona, Café...)"
              className="w-full bg-transparent text-center text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none"
            />
          </div>

          {errorVacio && (
            <div className="text-[11px] text-rose-400 mt-1 font-medium animate-pulse">
              Teclea un importe antes de tocar la categoría
            </div>
          )}
        </div>

        {/* Custom Ergonomic Thumb Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 py-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((dig) => (
            <button
              key={dig}
              type="button"
              onClick={() => handleDigito(dig)}
              className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-mono font-bold text-xl flex items-center justify-center border border-zinc-800/80 active:scale-95 transition shadow-sm cursor-pointer select-none"
            >
              {dig}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleDigito('.')}
            className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono font-bold text-2xl flex items-center justify-center border border-zinc-800/80 active:scale-95 transition cursor-pointer select-none"
          >
            ,
          </button>
          <button
            type="button"
            onClick={() => handleDigito('0')}
            className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-mono font-bold text-xl flex items-center justify-center border border-zinc-800/80 active:scale-95 transition cursor-pointer select-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBorrar}
            onDoubleClick={handleLimpiarTodo}
            className="h-12 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 flex items-center justify-center border border-zinc-800/80 active:scale-95 transition cursor-pointer select-none"
            title="Borrar (Doble clic para borrar todo)"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Bottom Direct Action: 1-Tap Category Save OR Income Button */}
        <div className="pt-1">
          {tipo === 'gasto' ? (
            <div>
              <p className="text-[10px] text-zinc-400 text-center mb-1.5 uppercase tracking-wider font-semibold">
                Toca la categoría para guardar al instante:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSeleccionarCategoria(cat)}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 active:scale-96 transition cursor-pointer text-left shadow-sm group"
                  >
                    <CategoryIcon
                      icono={cat.icono}
                      color={cat.color}
                      size={16}
                      className="group-hover:scale-105"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-zinc-200 truncate">
                        {cat.nombre}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {cat.presupuesto}€/mes
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGuardarIngreso}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-xl shadow-emerald-500/25 active:scale-98 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Check size={18} className="stroke-[3]" />
              <span>Guardar Ingreso Extra (+{displayNumero()} €)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
