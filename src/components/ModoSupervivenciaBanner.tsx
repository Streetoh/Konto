import React, { useState } from 'react';
import type { CategoriaVariable, TransaccionVariable, CicloFechas } from '../types';
import {
  calcularProgresoCategorias,
  formatearMoneda,
} from '../utils/calculations';
import { ShieldAlert, RefreshCw, CheckCircle2 } from 'lucide-react';

interface Props {
  categorias: CategoriaVariable[];
  transacciones: TransaccionVariable[];
  ciclo: CicloFechas;
  onReajustarPresupuestos: (nuevasCategorias: CategoriaVariable[]) => void;
}

export const ModoSupervivenciaBanner: React.FC<Props> = ({
  categorias,
  transacciones,
  ciclo,
  onReajustarPresupuestos,
}) => {
  const [reajustadoExito, setReajustadoExito] = useState(false);

  const progreso = calcularProgresoCategorias(categorias, transacciones, ciclo);

  const categoriasEnDeficit = progreso.filter((c) => c.gastado > c.presupuesto);
  const categoriasConSobrante = progreso.filter((c) => c.presupuesto > c.gastado);

  const totalDeficit = categoriasEnDeficit.reduce(
    (acc, c) => acc + (c.gastado - c.presupuesto),
    0
  );
  const totalSobrante = categoriasConSobrante.reduce(
    (acc, c) => acc + (c.presupuesto - c.gastado),
    0
  );

  // Solo se muestra si hay al menos una categoría en déficit y sobrante positivo en otras
  const hayDesajuste = categoriasEnDeficit.length > 0 && totalSobrante > 0;

  if (!hayDesajuste && !reajustadoExito) {
    return null;
  }

  const handleEjecutarReajuste = () => {
    const transferible = Math.min(totalDeficit, totalSobrante);
    const nuevas = categorias.map((c) => ({ ...c }));

    // 1. Deducir proporcionalmente del margen de las categorías holgadas
    let acumuladoDeducido = 0;
    categoriasConSobrante.forEach((c, idx) => {
      const margen = c.presupuesto - c.gastado;
      const prop = totalSobrante > 0 ? margen / totalSobrante : 0;
      const deduccion =
        idx === categoriasConSobrante.length - 1
          ? Math.round((transferible - acumuladoDeducido) * 100) / 100
          : Math.round(transferible * prop * 100) / 100;
      acumuladoDeducido += deduccion;

      const catTarget = nuevas.find((n) => n.id === c.id);
      if (catTarget) {
        catTarget.presupuesto = Math.max(
          0,
          Math.round((catTarget.presupuesto - deduccion) * 100) / 100
        );
      }
    });

    // 2. Incrementar proporcionalmente el presupuesto de las categorías con déficit
    let acumuladoAnadido = 0;
    categoriasEnDeficit.forEach((c, idx) => {
      const exceso = c.gastado - c.presupuesto;
      const prop = totalDeficit > 0 ? exceso / totalDeficit : 0;
      const aumento =
        idx === categoriasEnDeficit.length - 1
          ? Math.round((transferible - acumuladoAnadido) * 100) / 100
          : Math.round(transferible * prop * 100) / 100;
      acumuladoAnadido += aumento;

      const catTarget = nuevas.find((n) => n.id === c.id);
      if (catTarget) {
        catTarget.presupuesto = Math.round((catTarget.presupuesto + aumento) * 100) / 100;
      }
    });

    onReajustarPresupuestos(nuevas);
    setReajustadoExito(true);
    setTimeout(() => {
      setReajustadoExito(false);
    }, 4500);
  };

  if (reajustadoExito) {
    return (
      <div className="rounded-2xl p-3 bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300 animate-fadeIn">
        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
        <div>
          <span className="font-semibold">¡Modo Supervivencia activado!</span> Presupuestos reajustados
          automáticamente para sanear el ciclo sin tocar tu ahorro.
        </div>
      </div>
    );
  }

  const nombresDeficit = categoriasEnDeficit.map((c) => c.nombre).join(', ');

  return (
    <div className="rounded-2xl p-3.5 bg-gradient-to-r from-amber-500/10 via-zinc-900/80 to-zinc-900/60 border border-amber-500/30 shadow-lg shadow-amber-950/20 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25 mt-0.5">
          <ShieldAlert size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-amber-300">
              Desajuste en categorías detectado
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-xs font-semibold text-zinc-300">Activar Modo Supervivencia</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 leading-normal">
            <strong className="text-zinc-200">{nombresDeficit}</strong> han superado su presupuesto ({formatearMoneda(totalDeficit)} en rojo), pero tienes{' '}
            <strong className="text-emerald-400">{formatearMoneda(totalSobrante)}</strong> de margen disponible en otras categorías.
          </p>
        </div>
      </div>

      <div className="pt-1 flex items-center justify-end">
        <button
          type="button"
          onClick={handleEjecutarReajuste}
          className="flex items-center gap-2 py-2 px-3.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-xl font-bold text-xs transition active:scale-[0.98] cursor-pointer"
        >
          <RefreshCw size={13} className="text-amber-400" />
          Reajustar presupuestos para este ciclo
        </button>
      </div>
    </div>
  );
};
