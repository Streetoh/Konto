import type { ResumenFinanciero } from '../utils/calculations';
import { formatearMoneda } from '../utils/calculations';
import { CalendarDays, ShieldCheck, PiggyBank, Flame, AlertCircle, Wallet } from 'lucide-react';

interface Props {
  resumen: ResumenFinanciero;
  onAbrirFijos?: () => void;
  onAbrirAjustes?: () => void;
}

export const MainHeroCard: React.FC<Props> = ({
  resumen,
  onAbrirFijos,
  onAbrirAjustes,
}) => {
  const {
    disponibleHoy,
    disponibleMensualRestante,
    presupuestoVariableTotal,
    impactoGastosFijos,
    objetivoAhorro,
  } = resumen;

  const esDeficit = disponibleMensualRestante < 0;
  const esDeficitHoy = disponibleHoy <= 0;
  const totalIngresos = resumen.ingresosMensuales + (resumen.ingresosExtraCiclo || 0);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-5 border border-zinc-800/90 shadow-2xl">
      {/* Background glow effects */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Pill */}
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 text-[11px] font-medium">
          <Flame size={12} className={esDeficitHoy ? 'text-rose-400' : 'text-amber-400'} />
          <span>Métrica Reina · Safe-to-Spend</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
          <CalendarDays size={12} className="text-zinc-500" />
          <span>
            Día {resumen.diaEnCiclo}/{resumen.diasTotalesCiclo} de ciclo ({resumen.diasRestantesCiclo}d rest.)
          </span>
        </div>
      </div>

      {/* Primary Metric: Safe to Spend Today */}
      <div className="my-2">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase font-medium tracking-wider text-zinc-400">
            Disponible para gastar hoy
          </p>
          <span className="text-[11px] text-zinc-400 font-mono">
            {resumen.diasRestantesCiclo} días hasta próximo cobro
          </span>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <span
            className={`text-4xl font-extrabold tracking-tight font-mono ${
              esDeficitHoy
                ? 'text-rose-400'
                : disponibleHoy > 35
                ? 'text-emerald-400'
                : 'text-zinc-100'
            }`}
          >
            {formatearMoneda(disponibleHoy)}
          </span>
          <span className="text-xs text-zinc-400 font-medium">para hoy</span>
        </div>

        {/* Detalle transparente del cálculo diario */}
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
          <span>Límite diario: {formatearMoneda(resumen.asignacionDiariaHoy)}</span>
          {resumen.gastadoHoy > 0 && (
            <>
              <span>•</span>
              <span className="text-amber-400">Gastado hoy: {formatearMoneda(resumen.gastadoHoy)}</span>
            </>
          )}
        </div>

        {esDeficitHoy && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-xl">
            <AlertCircle size={14} className="shrink-0" />
            <span>Has superado el límite diario en {formatearMoneda(Math.abs(disponibleHoy))}.</span>
          </div>
        )}
      </div>

      {/* Secondary Metric: Total Monthly Variable Remaining */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-medium">
            Disponible variable total del mes
          </span>
          <span
            className={`text-base font-bold font-mono ${
              esDeficit ? 'text-rose-400' : 'text-zinc-200'
            }`}
          >
            {formatearMoneda(disponibleMensualRestante)}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Presupuesto variable asignado:{' '}
          <span className="font-mono text-zinc-200 font-semibold">
            {formatearMoneda(presupuestoVariableTotal)}
          </span>{' '}
          <span className="text-[10px] text-zinc-500">(Sueldo - Fijos - Ahorro)</span>
        </p>
      </div>

      {/* Desglose en 3 tarjetas: Ingresos, Gastos Fijos y Ahorro */}
      <div className="mt-3.5 grid grid-cols-3 gap-1.5 pt-1">
        <button
          onClick={onAbrirAjustes}
          type="button"
          className="flex flex-col p-2 rounded-xl bg-zinc-950/70 hover:bg-zinc-800/60 border border-zinc-800/80 transition text-left cursor-pointer active:scale-98 min-w-0"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Wallet size={11} />
            </div>
            <span className="text-[9px] text-zinc-400 uppercase font-semibold truncate">Ingresos</span>
          </div>
          <div className="text-[11px] font-bold font-mono text-zinc-200 truncate">
            {formatearMoneda(totalIngresos)}
          </div>
        </button>

        <button
          onClick={onAbrirFijos}
          type="button"
          className="flex flex-col p-2 rounded-xl bg-zinc-950/70 hover:bg-zinc-800/60 border border-zinc-800/80 transition text-left cursor-pointer active:scale-98 min-w-0"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <ShieldCheck size={11} />
            </div>
            <span className="text-[9px] text-zinc-400 uppercase font-semibold truncate">Fijos</span>
          </div>
          <div className="text-[11px] font-bold font-mono text-zinc-200 truncate">
            -{formatearMoneda(impactoGastosFijos)}
          </div>
        </button>

        <button
          onClick={onAbrirAjustes}
          type="button"
          className="flex flex-col p-2 rounded-xl bg-zinc-950/70 hover:bg-zinc-800/60 border border-zinc-800/80 transition text-left cursor-pointer active:scale-98 min-w-0"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
              <PiggyBank size={11} />
            </div>
            <span className="text-[9px] text-zinc-400 uppercase font-semibold truncate">Ahorro</span>
          </div>
          <div className="text-[11px] font-bold font-mono text-zinc-200 truncate">
            -{formatearMoneda(objetivoAhorro)}
          </div>
        </button>
      </div>
    </div>
  );
};
