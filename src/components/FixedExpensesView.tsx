import React, { useState } from 'react';
import type { GastoFijo } from '../types';
import {
  calcularImpactoMensualGastoFijo,
  formatearMoneda,
} from '../utils/calculations';
import {
  ShieldCheck,
  CheckCircle2,
  Circle,
  Calendar,
  Layers,
  RotateCcw,
  Plus,
  Pencil,
  PiggyBank,
  TrendingUp,
  BellRing,
} from 'lucide-react';
import { GastoFijoModal } from './GastoFijoModal';
import { RadarSuscripcionesBanner } from './RadarSuscripcionesBanner';

interface Props {
  gastosFijos: GastoFijo[];
  onTogglePagado: (id: string) => void;
  onToggleTocaEsteMes: (id: string) => void;
  onCambiarModoCalculo: (id: string, nuevoModo: 'prorrateado' | 'mes_cobro') => void;
  onReiniciarChecksCiclo: () => void;
  onGuardarGastoFijo: (gasto: Omit<GastoFijo, 'id'>, idExistente?: string) => void;
  onEliminarGastoFijo: (id: string) => void;
  onVolverAInicio: () => void;
}

export const FixedExpensesView: React.FC<Props> = ({
  gastosFijos,
  onTogglePagado,
  onToggleTocaEsteMes,
  onReiniciarChecksCiclo,
  onGuardarGastoFijo,
  onEliminarGastoFijo,
  onVolverAInicio,
}) => {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [gastoAEditar, setGastoAEditar] = useState<GastoFijo | null>(null);

  // 1. Impacto en presupuesto este ciclo
  const impactoTotalPresupuesto = gastosFijos.reduce(
    (acc, g) => acc + calcularImpactoMensualGastoFijo(g),
    0
  );

  // 2. Desembolso real en el banco este ciclo
  const desembolsoRealBanco = gastosFijos.reduce(
    (acc, g) => acc + (g.tocaEsteMes ? g.importeTotal : 0),
    0
  );

  const pagadoBanco = gastosFijos.reduce(
    (acc, g) => acc + (g.tocaEsteMes && g.pagado ? g.importeTotal : 0),
    0
  );

  const pendienteBanco = Math.max(0, desembolsoRealBanco - pagadoBanco);

  const handleAbrirCrear = () => {
    setGastoAEditar(null);
    setModalAbierto(true);
  };

  const handleAbrirEditar = (gasto: GastoFijo) => {
    setGastoAEditar(gasto);
    setModalAbierto(true);
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
            <ShieldCheck className="text-blue-400" size={18} />
            <span>Fijos y Periódicos</span>
          </h2>
          <p className="text-[11px] text-zinc-400">
            Checklist de pagos del ciclo y reservas periódicas
          </p>
        </div>
        <button
          onClick={onVolverAInicio}
          className="text-xs text-emerald-400 hover:underline cursor-pointer"
        >
          Volver a Inicio
        </button>
      </div>

      {/* Radar de Suscripciones y Avisos de Cancelación */}
      <RadarSuscripcionesBanner gastosFijos={gastosFijos} />

      {/* Top 2 Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Impacto en presupuesto */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-3.5 rounded-2xl border border-zinc-800 shadow-md">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">
            Impacto en presupuesto
          </span>
          <div className="text-lg font-extrabold font-mono text-zinc-100 mt-1">
            {formatearMoneda(impactoTotalPresupuesto)}
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
            Resta fija al sueldo + prorrata periódica
          </p>
        </div>

        {/* Card 2: Desembolso real este ciclo */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-3.5 rounded-2xl border border-blue-900/30 shadow-md">
          <span className="text-[10px] text-blue-400 uppercase font-semibold tracking-wider">
            Desembolso real banco
          </span>
          <div className="text-lg font-extrabold font-mono text-blue-400 mt-1">
            {formatearMoneda(desembolsoRealBanco)}
          </div>
          <div className="text-[10px] flex items-center gap-1.5 mt-0.5 font-mono text-zinc-400">
            <span className="text-emerald-400">{formatearMoneda(pagadoBanco)} pag.</span>
            <span>•</span>
            <span className="text-amber-400">{formatearMoneda(pendienteBanco)} pend.</span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          onClick={handleAbrirCrear}
          className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 active:scale-98 transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Plus size={14} className="stroke-[3]" />
          <span>Añadir Fijo / Periódico</span>
        </button>

        <button
          onClick={onReiniciarChecksCiclo}
          title="Reiniciar checks para el nuevo ciclo de cobro"
          className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 text-xs font-medium active:scale-95 transition cursor-pointer flex items-center gap-1.5"
        >
          <RotateCcw size={13} />
          <span>Nuevo ciclo</span>
        </button>
      </div>

      {/* Expenses Checklist */}
      <div className="space-y-3">
        {gastosFijos.length === 0 ? (
          <div className="bg-zinc-900/40 rounded-2xl p-6 text-center border border-zinc-800/60">
            <p className="text-xs text-zinc-400">No tienes gastos fijos registrados.</p>
            <button
              onClick={handleAbrirCrear}
              className="mt-2 text-xs text-blue-400 font-medium hover:underline cursor-pointer"
            >
              + Crear primer gasto fijo
            </button>
          </div>
        ) : (
          gastosFijos.map((gasto) => {
            const impacto = calcularImpactoMensualGastoFijo(gasto);
            const esProrrateado = gasto.modoCalculo === 'prorrateado';
            const esPeriodico = gasto.frecuenciaMeses > 1;

            return (
              <div
                key={gasto.id}
                className={`bg-zinc-900/60 rounded-2xl p-4 border transition-all ${
                  gasto.tocaEsteMes && gasto.pagado
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : gasto.tocaEsteMes && !gasto.pagado
                    ? 'border-amber-500/30'
                    : 'border-zinc-800/80 opacity-90'
                }`}
              >
                {/* Header row of card */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-100 truncate">
                        {gasto.nombre}
                      </h3>
                      <button
                        onClick={() => handleAbrirEditar(gasto)}
                        className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
                        title="Editar"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>

                    {/* Frequency & Proration tag */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {esPeriodico ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-zinc-800/90 text-zinc-300 px-2 py-0.5 rounded-lg border border-zinc-700/60">
                          <Calendar size={11} className="text-blue-400" />
                          {esProrrateado
                            ? `Cada ${gasto.frecuenciaMeses} meses • Reserva ${impacto.toFixed(2)}€/mes`
                            : `Cada ${gasto.frecuenciaMeses} meses • Cobro íntegro`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-zinc-800/70 text-zinc-400 px-2 py-0.5 rounded-lg">
                          <Calendar size={11} /> Mensual
                        </span>
                      )}

                      {!gasto.tocaEsteMes && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-lg font-medium">
                          <PiggyBank size={11} /> En reserva
                        </span>
                      )}

                      {gasto.avisoCancelar && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-lg font-bold">
                          <BellRing size={10} className="text-rose-400" /> Cancelar / Revisar
                        </span>
                      )}

                      {gasto.fechaRenovacion && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg font-mono">
                          Renueva: {gasto.fechaRenovacion}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold font-mono text-zinc-100">
                      {formatearMoneda(gasto.importeTotal)}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400">
                      Impacto: {formatearMoneda(impacto)}/ciclo
                    </div>
                  </div>
                </div>

                {/* Alerta de Inflación Personal */}
                {gasto.importeAnterior && gasto.importeTotal > gasto.importeAnterior && (
                  <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-medium">
                    <TrendingUp size={13} className="shrink-0 text-amber-400" />
                    <span>
                      Subida detectada: +{formatearMoneda(gasto.importeTotal - gasto.importeAnterior)} (+
                      {Math.round(
                        ((gasto.importeTotal - gasto.importeAnterior) / gasto.importeAnterior) * 100
                      )}%) respecto al registro anterior ({formatearMoneda(gasto.importeAnterior)})
                    </span>
                  </div>
                )}

                {/* Switch: Toca pagar vs En reserva */}
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleTocaEsteMes(gasto.id)}
                      className={`text-xs px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition cursor-pointer font-medium ${
                        gasto.tocaEsteMes
                          ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                          : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400'
                      }`}
                    >
                      <Layers size={12} />
                      <span>{gasto.tocaEsteMes ? 'Toca pagar en este ciclo' : 'En reserva (no toca ahora)'}</span>
                    </button>
                  </div>

                  {/* If tocaEsteMes is true: Big interactive checkbox Pagado / Pendiente */}
                  {gasto.tocaEsteMes ? (
                    <button
                      type="button"
                      onClick={() => onTogglePagado(gasto.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm ${
                        gasto.pagado
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-emerald-500/10'
                          : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {gasto.pagado ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <Circle size={16} className="text-amber-400" />
                      )}
                      <span>{gasto.pagado ? 'Pagado' : 'Pendiente'}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-500 italic">Sin cobro este mes</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal para Crear o Editar */}
      <GastoFijoModal
        abierto={modalAbierto}
        gastoInicial={gastoAEditar}
        onCerrar={() => {
          setModalAbierto(false);
          setGastoAEditar(null);
        }}
        onGuardar={onGuardarGastoFijo}
        onEliminar={onEliminarGastoFijo}
      />
    </div>
  );
};
