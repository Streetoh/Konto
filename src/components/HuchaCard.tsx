import React, { useState } from 'react';
import type { EstadoHucha } from '../types';
import { formatearMoneda, formatearFechaMovimiento } from '../utils/calculations';
import {
  PiggyBank,
  Flame,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  History,
  X,
  CheckCircle2,
  Moon,
} from 'lucide-react';

interface Props {
  hucha: EstadoHucha;
  rachaDiasVerdes: number;
  disponibleHoy: number;
  asignacionDiariaHoy: number;
  gastadoHoy: number;
  onGuardarSobrante: (importe: number) => void;
  onRetirarHucha: (importe: number, concepto: string) => void;
  onToggleAutoRollover?: (habilitado: boolean) => void;
}

export const HuchaCard: React.FC<Props> = ({
  hucha,
  rachaDiasVerdes,
  disponibleHoy,
  asignacionDiariaHoy,
  gastadoHoy,
  onGuardarSobrante,
  onRetirarHucha,
  onToggleAutoRollover,
}) => {
  const [modalRetirarAbierto, setModalRetirarAbierto] = useState(false);
  const [importeRetirar, setImporteRetirar] = useState('');
  const [conceptoRetirar, setConceptoRetirar] = useState('Respaldo para gastos del ciclo');
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Sobrante de hoy calculable: lo que queda disponible de la asignación diaria de hoy
  const sobranteDisponibleHoy = Math.max(0, Math.round(disponibleHoy * 100) / 100);
  const puedeGuardarSobrante = sobranteDisponibleHoy > 0;

  const handleGuardarSobranteClick = () => {
    if (!puedeGuardarSobrante) return;
    onGuardarSobrante(sobranteDisponibleHoy);
    setMensajeExito(`¡Guardado! Has blindado ${formatearMoneda(sobranteDisponibleHoy)} en tu Hucha Konto 🎉`);
    setTimeout(() => {
      setMensajeExito(null);
    }, 4500);
  };

  const handleConfirmarRetirada = (e: React.FormEvent) => {
    e.preventDefault();
    const importeNum = parseFloat(importeRetirar.replace(',', '.')) || 0;
    if (importeNum <= 0 || importeNum > hucha.saldo) return;

    onRetirarHucha(importeNum, conceptoRetirar.trim() || 'Retirada a presupuesto disponible');
    setImporteRetirar('');
    setModalRetirarAbierto(false);
    setMensajeExito(`Has transferido ${formatearMoneda(importeNum)} de la Hucha a tu presupuesto disponible.`);
    setTimeout(() => {
      setMensajeExito(null);
    }, 4500);
  };

  // Nivel de racha gamificado
  const obtenerEtiquetaRacha = (dias: number) => {
    if (dias === 0) return { texto: 'Comienza hoy', color: 'text-zinc-400' };
    if (dias < 3) return { texto: '🌱 Racha activa', color: 'text-emerald-400' };
    if (dias < 7) return { texto: '🔥 En buena racha', color: 'text-amber-400' };
    if (dias < 14) return { texto: '⚡ Maestro del ahorro', color: 'text-teal-300' };
    return { texto: '💎 Hábito blindado', color: 'text-cyan-300' };
  };

  const etiquetaRacha = obtenerEtiquetaRacha(rachaDiasVerdes);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-950 p-4 border border-zinc-800/90 shadow-xl">
      {/* Resplandores de fondo */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Cabecera de la tarjeta: Título e Insignia de Racha */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <PiggyBank size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-100">Hucha Konto</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-mono border border-amber-500/20">
                Rollover
              </span>
              {onToggleAutoRollover ? (
                <button
                  type="button"
                  onClick={() => onToggleAutoRollover(!(hucha.autoRolloverHabilitado ?? true))}
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono border flex items-center gap-0.5 cursor-pointer transition ${
                    (hucha.autoRolloverHabilitado ?? true)
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-750'
                  }`}
                  title={
                    (hucha.autoRolloverHabilitado ?? true)
                      ? 'Rollover automático activo a medianoche (Pulsar para pausar)'
                      : 'Rollover automático pausado (Pulsar para activar)'
                  }
                >
                  <Moon size={9} />
                  <span>{(hucha.autoRolloverHabilitado ?? true) ? 'Auto 00:00' : 'Pausado'}</span>
                </button>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-mono border border-emerald-500/20 flex items-center gap-0.5">
                  <Moon size={9} />
                  <span>Auto 00:00</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 font-medium">Ahorro activo y gamificado</p>
          </div>
        </div>

        {/* Contador Gamificado de Racha Verde */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/80 border border-zinc-800 text-right">
          <Flame
            size={14}
            className={
              rachaDiasVerdes > 0
                ? 'text-amber-400 animate-pulse'
                : 'text-zinc-600'
            }
          />
          <div className="text-[11px] font-mono font-bold text-zinc-200">
            {rachaDiasVerdes} {rachaDiasVerdes === 1 ? 'día' : 'días'}
          </div>
        </div>
      </div>

      {/* Métricas Principales de la Hucha */}
      <div className="my-2.5 flex items-baseline justify-between">
        <div>
          <span className="text-[11px] text-zinc-400 uppercase font-medium tracking-wider">
            Dinero extra acumulado
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-amber-300">
              {formatearMoneda(hucha.saldo)}
            </span>
            <span className="text-xs text-zinc-400 font-mono">blindados</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
            <span>Hoy: {formatearMoneda(asignacionDiariaHoy)} límite</span>
            <span>•</span>
            <span>{formatearMoneda(gastadoHoy)} gastado</span>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-[11px] font-bold ${etiquetaRacha.color}`}>
            {etiquetaRacha.texto}
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            {rachaDiasVerdes > 0
              ? 'gastando en verde'
              : 'gastando bajo límite'}
          </span>
        </div>
      </div>

      {/* Nota Informativa de Auto-Rollover */}
      <div className="my-2 p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Moon size={12} className="text-amber-400 shrink-0" />
          <span>Auto-guardado al finalizar el día:</span>
        </div>
        <span className="font-mono font-bold text-amber-300">
          {puedeGuardarSobrante ? `+${formatearMoneda(sobranteDisponibleHoy)} hoy` : '0,00 €'}
        </span>
      </div>

      {/* Mensaje de Éxito Temporal */}
      {mensajeExito && (
        <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 animate-fadeIn">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span className="leading-tight">{mensajeExito}</span>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-zinc-800/80">
        {/* Botón 1: Guardar Sobrante de Hoy */}
        <button
          type="button"
          onClick={handleGuardarSobranteClick}
          disabled={!puedeGuardarSobrante}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition active:scale-[0.98] ${
            puedeGuardarSobrante
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-md shadow-amber-950/20 cursor-pointer'
              : 'bg-zinc-900 text-zinc-600 border border-zinc-800/60 cursor-not-allowed opacity-60'
          }`}
          title={
            puedeGuardarSobrante
              ? `Aportar ${formatearMoneda(sobranteDisponibleHoy)} a la Hucha Konto`
              : 'No queda sobrante disponible para guardar hoy'
          }
        >
          <Sparkles size={13} className={puedeGuardarSobrante ? 'text-amber-400' : 'text-zinc-600'} />
          <span className="truncate">
            {puedeGuardarSobrante
              ? `Guardar sobrante (+${formatearMoneda(sobranteDisponibleHoy, false, 0)})`
              : 'Sobrante guardado'}
          </span>
        </button>

        {/* Botón 2: Retirar Saldo de la Hucha */}
        <button
          type="button"
          onClick={() => setModalRetirarAbierto(true)}
          disabled={hucha.saldo <= 0}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-xs transition active:scale-[0.98] ${
            hucha.saldo > 0
              ? 'bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 cursor-pointer'
              : 'bg-zinc-900 text-zinc-600 border border-zinc-800/60 cursor-not-allowed opacity-60'
          }`}
        >
          <ArrowDownLeft size={13} className={hucha.saldo > 0 ? 'text-emerald-400' : 'text-zinc-600'} />
          <span>Retirar saldo</span>
        </button>
      </div>

      {/* Toggle para ver historial de la Hucha */}
      {hucha.historial && hucha.historial.length > 0 && (
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => setMostrarHistorial((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition font-mono cursor-pointer"
          >
            <History size={11} />
            <span>{mostrarHistorial ? 'Ocultar historial' : `Ver historial (${hucha.historial.length})`}</span>
          </button>
        </div>
      )}

      {/* Historial desplegable de movimientos de la Hucha */}
      {mostrarHistorial && hucha.historial && hucha.historial.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-zinc-800/60 space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {hucha.historial.slice(0, 5).map((mov) => (
            <div
              key={mov.id}
              className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-zinc-950/50 border border-zinc-800/40"
            >
              <div className="flex items-center gap-1.5 truncate">
                {mov.tipo === 'ingreso' ? (
                  <ArrowUpRight size={12} className="text-amber-400 shrink-0" />
                ) : (
                  <ArrowDownLeft size={12} className="text-emerald-400 shrink-0" />
                )}
                <span className="text-zinc-300 truncate">{mov.concepto}</span>
                {mov.esAutomatico && (
                  <span className="px-1 py-0.2 rounded text-[8px] bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0">
                    Auto
                  </span>
                )}
                <span className="text-[10px] text-zinc-500 font-mono">
                  {formatearFechaMovimiento(mov.fecha)}
                </span>
              </div>
              <span
                className={`font-mono font-bold shrink-0 ${
                  mov.tipo === 'ingreso' ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {mov.tipo === 'ingreso' ? '+' : '-'}
                {formatearMoneda(mov.importe)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Retirar Saldo de la Hucha */}
      {modalRetirarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <PiggyBank size={15} />
                </div>
                <h3 className="text-sm font-bold text-zinc-100">Retirar de la Hucha</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalRetirarAbierto(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-normal">
              El importe retirado volverá a sumarse a tu presupuesto disponible de este ciclo.
            </p>

            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Saldo disponible en Hucha:</span>
              <span className="text-sm font-bold font-mono text-amber-300">
                {formatearMoneda(hucha.saldo)}
              </span>
            </div>

            <form onSubmit={handleConfirmarRetirada} className="space-y-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Importe a retirar:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={hucha.saldo}
                    value={importeRetirar}
                    onChange={(e) => setImporteRetirar(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    required
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-zinc-100 text-sm font-mono focus:outline-none pr-10"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-zinc-500">
                    €
                  </span>
                </div>
              </div>

              {/* Botón para retirar todo */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setImporteRetirar(String(hucha.saldo))}
                  className="text-[11px] font-mono text-amber-400 hover:underline cursor-pointer"
                >
                  Retirar el total ({formatearMoneda(hucha.saldo)})
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Motivo / Concepto:
                </label>
                <input
                  type="text"
                  value={conceptoRetirar}
                  onChange={(e) => setConceptoRetirar(e.target.value)}
                  placeholder="Ej. Imprevisto o gasto extra"
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-xl px-3.5 py-2 text-zinc-100 text-xs focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalRetirarAbierto(false)}
                  className="py-2 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    !importeRetirar ||
                    parseFloat(importeRetirar) <= 0 ||
                    parseFloat(importeRetirar) > hucha.saldo
                  }
                  className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-950/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Confirmar Retirada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
