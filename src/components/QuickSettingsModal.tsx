import React, { useState } from 'react';
import type { ConfiguracionMensual } from '../types';
import { X, Save, RotateCcw, AlertTriangle, CalendarRange } from 'lucide-react';

interface Props {
  abierto: boolean;
  config: ConfiguracionMensual;
  onCerrar: () => void;
  onGuardar: (nuevaConfig: ConfiguracionMensual) => void;
  onResetearValores: () => void;
}

export const QuickSettingsModal: React.FC<Props> = ({
  abierto,
  config,
  onCerrar,
  onGuardar,
  onResetearValores,
}) => {
  const [nombreApp, setNombreApp] = useState(config.nombreApp || 'Konto');
  const [nombreTitular, setNombreTitular] = useState(config.nombreTitular || '');
  const [ingresos, setIngresos] = useState(String(config.ingresosMensuales));
  const [ahorro, setAhorro] = useState(String(config.objetivoAhorro));
  const [diaInicioCiclo, setDiaInicioCiclo] = useState(Number(config.diaInicioCiclo) || 10);
  const [mostrarConfirmReset, setMostrarConfirmReset] = useState(false);

  const [prevAbierto, setPrevAbierto] = useState(abierto);

  if (abierto !== prevAbierto) {
    setPrevAbierto(abierto);
    if (abierto) {
      setNombreApp(config.nombreApp || 'Konto');
      setNombreTitular(config.nombreTitular || '');
      setIngresos(String(config.ingresosMensuales));
      setAhorro(String(config.objetivoAhorro));
      setDiaInicioCiclo(Number(config.diaInicioCiclo) || 10);
      setMostrarConfirmReset(false);
    }
  }

  if (!abierto) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ingresosNum = parseFloat(ingresos) || 0;
    const ahorroNum = parseFloat(ahorro) || 0;
    const diaNum = Math.max(1, Math.min(28, diaInicioCiclo || 10));

    onGuardar({
      ...config,
      nombreApp: nombreApp.trim() || 'Konto',
      nombreTitular: nombreTitular.trim(),
      ingresosMensuales: ingresosNum,
      objetivoAhorro: ahorroNum,
      diaInicioCiclo: diaNum,
    });
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-[430px] bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <h2 className="text-base font-bold text-zinc-100">Ajustes de Presupuesto y Ciclo</h2>
          <button
            onClick={onCerrar}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* App Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Nombre de la Aplicación
            </label>
            <input
              type="text"
              value={nombreApp}
              onChange={(e) => setNombreApp(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-medium"
              placeholder="Konto"
            />
          </div>

          {/* Titular para filtrar redondeos / microahorros */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Titular de la cuenta (para excluir redondeos a cuenta secundaria)
            </label>
            <input
              type="text"
              value={nombreTitular}
              onChange={(e) => setNombreTitular(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-medium placeholder-zinc-600"
              placeholder="Ej. Juan Pérez García"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Descarte automático de transferencias a tu propia hucha/segunda cuenta en capturas de pantalla.
            </p>
          </div>

          {/* Ciclo de cobro personalizado (Día de nómina) */}
          <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <CalendarRange size={14} className="text-emerald-400" />
                <span>Día de Inicio de Ciclo (Nómina)</span>
              </label>
              <span className="font-mono text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                Día {diaInicioCiclo}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="28"
                value={diaInicioCiclo}
                onChange={(e) => setDiaInicioCiclo(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-0.5">
              <span>Día 1</span>
              <span className="text-zinc-300 font-medium">
                {diaInicioCiclo === 1
                  ? 'Mes natural: del día 1 al final del mes'
                  : `Ciclo: día ${diaInicioCiclo} al día ${diaInicioCiclo - 1} del mes sgte.`}
              </span>
              <span>Día 28</span>
            </div>
          </div>

          {/* Monthly Income */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Ingresos Mensuales / Por Ciclo (€)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={ingresos}
                onChange={(e) => setIngresos(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono font-semibold"
                placeholder="2200"
                required
              />
              <span className="absolute right-3 top-2 text-sm font-mono text-zinc-500">€</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Sueldo neto esperado al inicio de cada ciclo.
            </p>
          </div>

          {/* Savings Target */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Objetivo de Ahorro Mensual (€)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={ahorro}
                onChange={(e) => setAhorro(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono font-semibold"
                placeholder="400"
                required
              />
              <span className="absolute right-3 top-2 text-sm font-mono text-zinc-500">€</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Ahorro reservado automáticamente al comenzar el ciclo.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-98 transition cursor-pointer"
            >
              <Save size={15} />
              <span>Guardar Configuración</span>
            </button>
            <button
              type="button"
              onClick={onCerrar}
              className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-800 transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>

        {/* Reset defaults section */}
        <div className="mt-5 pt-3 border-t border-zinc-900">
          {!mostrarConfirmReset ? (
            <button
              type="button"
              onClick={() => setMostrarConfirmReset(true)}
              className="w-full text-center text-[11px] text-zinc-500 hover:text-rose-400 flex items-center justify-center gap-1 transition cursor-pointer py-1"
            >
              <RotateCcw size={12} />
              <span>Restablecer datos iniciales de Konto</span>
            </button>
          ) : (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium">
                <AlertTriangle size={14} />
                <span>¿Restablecer todos los datos a los valores iniciales de Konto?</span>
              </div>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetearValores();
                    setMostrarConfirmReset(false);
                    onCerrar();
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Sí, reiniciar
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarConfirmReset(false)}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
