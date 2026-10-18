import React from 'react';
import type { GastoFijo } from '../types';
import { formatearMoneda } from '../utils/calculations';
import { BellRing, ChevronRight, AlertOctagon } from 'lucide-react';

interface Props {
  gastosFijos: GastoFijo[];
  onAbrirFijos?: () => void;
}

export const RadarSuscripcionesBanner: React.FC<Props> = ({
  gastosFijos,
  onAbrirFijos,
}) => {
  const ahora = new Date();
  const hoyMidnight = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate()
  ).getTime();

  // Filtrar suscripciones en radar
  const suscripcionesEnRadar = gastosFijos.filter((g) => {
    if (g.avisoCancelar) return true;
    if (g.fechaRenovacion) {
      const partes = g.fechaRenovacion.split('-').map(Number);
      if (partes.length >= 3) {
        const renoDate = new Date(partes[0], partes[1] - 1, partes[2]).getTime();
        const diffDias = Math.ceil((renoDate - hoyMidnight) / (1000 * 60 * 60 * 24));
        return diffDias <= 7;
      }
    }
    return false;
  });

  if (suscripcionesEnRadar.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 animate-fadeIn">
      {suscripcionesEnRadar.map((gasto) => {
        let textoPlazo = '';
        let dias = 999;

        if (gasto.fechaRenovacion) {
          const partes = gasto.fechaRenovacion.split('-').map(Number);
          if (partes.length >= 3) {
            const renoDate = new Date(partes[0], partes[1] - 1, partes[2]).getTime();
            dias = Math.ceil((renoDate - hoyMidnight) / (1000 * 60 * 60 * 24));

            if (dias < 0) {
              textoPlazo = `venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
            } else if (dias === 0) {
              textoPlazo = 'se renueva HOY';
            } else if (dias === 1) {
              textoPlazo = 'se renueva MAÑANA';
            } else {
              textoPlazo = `se renueva en ${dias} días`;
            }
          }
        }

        const esUrgente = gasto.avisoCancelar || dias <= 3;

        return (
          <div
            key={gasto.id}
            onClick={onAbrirFijos}
            className={`p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] flex items-center justify-between gap-3 shadow-lg ${
              esUrgente
                ? 'bg-gradient-to-r from-rose-500/20 via-zinc-900/90 to-zinc-900/70 border-rose-500/40 shadow-rose-950/20'
                : 'bg-gradient-to-r from-amber-500/15 via-zinc-900/90 to-zinc-900/70 border-amber-500/40 shadow-amber-950/20'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  esUrgente
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {esUrgente ? <AlertOctagon size={16} /> : <BellRing size={16} />}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-md border ${
                      esUrgente
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    Radar de Suscripción
                  </span>
                  {gasto.avisoCancelar && (
                    <span className="text-[10px] text-amber-300 font-medium">
                      • Marcada para cancelar/revisar
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold text-zinc-100 mt-0.5 truncate">
                  <strong className="text-white">{gasto.nombre}</strong>{' '}
                  {textoPlazo ? `${textoPlazo}` : 'en seguimiento'}{' '}
                  <span className="font-mono text-zinc-300">({formatearMoneda(gasto.importeTotal)})</span>
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-200">
              <span className="hidden sm:inline">Gestionar</span>
              <ChevronRight size={16} className="text-zinc-500" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
