import React, { useState } from 'react';
import type { GastoFijo, ModoCalculoGastoFijo } from '../types';
import { X, Save, ShieldCheck, Trash2, BellRing } from 'lucide-react';
import { formatearMoneda } from '../utils/calculations';

interface Props {
  abierto: boolean;
  gastoInicial?: GastoFijo | null;
  onCerrar: () => void;
  onGuardar: (gasto: Omit<GastoFijo, 'id'>, idExistente?: string) => void;
  onEliminar?: (id: string) => void;
}

export const GastoFijoModal: React.FC<Props> = ({
  abierto,
  gastoInicial,
  onCerrar,
  onGuardar,
  onEliminar,
}) => {
  const [nombre, setNombre] = useState(gastoInicial ? gastoInicial.nombre : '');
  const [importe, setImporte] = useState(gastoInicial ? String(gastoInicial.importeTotal) : '');
  const [frecuencia, setFrecuencia] = useState<number>(gastoInicial ? gastoInicial.frecuenciaMeses : 1);
  const [modoCalculo, setModoCalculo] = useState<ModoCalculoGastoFijo>(
    gastoInicial ? gastoInicial.modoCalculo : 'prorrateado'
  );
  const [tocaEsteMes, setTocaEsteMes] = useState<boolean>(
    gastoInicial ? gastoInicial.tocaEsteMes : true
  );
  const [fechaRenovacion, setFechaRenovacion] = useState(
    gastoInicial?.fechaRenovacion ? gastoInicial.fechaRenovacion.split('T')[0] : ''
  );
  const [avisoCancelar, setAvisoCancelar] = useState<boolean>(
    gastoInicial?.avisoCancelar ?? false
  );

  if (!abierto) return null;

  const frecuenciasPredefinidas = [
    { label: 'Mensual (1 mes)', meses: 1 },
    { label: 'Cada 2 meses', meses: 2 },
    { label: 'Cada 3 meses (Trimestral)', meses: 3 },
    { label: 'Cada 6 meses (Semestral)', meses: 6 },
    { label: 'Anual (12 meses)', meses: 12 },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const impNum = parseFloat(importe);
    if (isNaN(impNum) || impNum <= 0 || !nombre.trim()) return;

    onGuardar(
      {
        nombre: nombre.trim(),
        importeTotal: impNum,
        frecuenciaMeses: Math.max(1, frecuencia),
        modoCalculo,
        tocaEsteMes,
        pagado: gastoInicial ? gastoInicial.pagado : false,
        fechaRenovacion: fechaRenovacion.trim() || undefined,
        avisoCancelar,
        importeAnterior: gastoInicial?.importeAnterior,
      },
      gastoInicial ? gastoInicial.id : undefined
    );
    onCerrar();
  };

  const importeNum = parseFloat(importe) || 0;
  const impactoEstimado =
    modoCalculo === 'prorrateado'
      ? importeNum / (frecuencia || 1)
      : tocaEsteMes
      ? importeNum
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[430px] bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-400" />
            <span>{gastoInicial ? 'Editar Gasto Fijo / Periódico' : 'Nuevo Gasto Fijo / Periódico'}</span>
          </h2>
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
              Nombre del Gasto o Recibo
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Alquiler, Gimnasio, Seguro Coche..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
              required
            />
          </div>

          {/* Importe Total del Recibo */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Importe Total del Recibo (€)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-base font-bold font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
                required
              />
              <span className="absolute right-3 top-2 text-sm font-mono text-zinc-500">€</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Importe completo cada vez que el banco cobra este recibo.
            </p>
          </div>

          {/* Frecuencia de cobro */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Frecuencia de Cobro
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {frecuenciasPredefinidas.map((item) => (
                <button
                  key={item.meses}
                  type="button"
                  onClick={() => setFrecuencia(item.meses)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-medium border text-left transition cursor-pointer ${
                    frecuencia === item.meses
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Número personalizado de meses */}
            <div className="mt-2 flex items-center gap-2 bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80">
              <span className="text-xs text-zinc-400">O cada</span>
              <input
                type="number"
                min="1"
                max="60"
                value={frecuencia}
                onChange={(e) => setFrecuencia(parseInt(e.target.value, 10) || 1)}
                className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-center font-mono text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-zinc-400">meses</span>
            </div>
          </div>

          {/* Modo de Impacto en Presupuesto */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Modo de Impacto en tu Presupuesto
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModoCalculo('prorrateado')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  modoCalculo === 'prorrateado'
                    ? 'bg-purple-500/15 border-purple-500/50 text-purple-200 shadow-sm'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <span className="text-xs font-bold">Prorratear ciclo a ciclo</span>
                <span className="text-[10px] text-zinc-400 mt-1">
                  (Recomendado) Reserva {(importeNum / (frecuencia || 1)).toFixed(2)}€ cada mes para que nunca te pille por sorpresa.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModoCalculo('mes_cobro')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  modoCalculo === 'mes_cobro'
                    ? 'bg-blue-500/15 border-blue-500/50 text-blue-200 shadow-sm'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <span className="text-xs font-bold">Descontar solo al cobrar</span>
                <span className="text-[10px] text-zinc-400 mt-1">
                  Resta {formatearMoneda(importeNum)} solo en el ciclo que se carga al banco.
                </span>
              </button>
            </div>
          </div>

          {/* Toca pagar en este ciclo */}
          <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-200">¿Toca pagar en este ciclo?</span>
              <p className="text-[10px] text-zinc-400">
                {tocaEsteMes
                  ? 'Sí, saldrá dinero del banco en este ciclo'
                  : 'No, está en período de acumulación/reserva'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTocaEsteMes(!tocaEsteMes)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                tocaEsteMes ? 'bg-blue-500 justify-end' : 'bg-zinc-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Radar de Suscripciones y Avisos de Cancelación */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <BellRing size={14} className="text-amber-400" />
              <span>Radar de Suscripción (Opcional)</span>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                Próximo cobro o fin de prueba gratuita:
              </label>
              <input
                type="date"
                value={fechaRenovacion}
                onChange={(e) => setFechaRenovacion(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="pr-2">
                <span className="text-xs font-medium text-zinc-200">
                  Marcar para revisar o cancelar
                </span>
                <p className="text-[10px] text-zinc-500">
                  Activa alertas preventivas en Inicio y Fijos antes de la renovación
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAvisoCancelar(!avisoCancelar)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                  avisoCancelar ? 'bg-amber-500 justify-end' : 'bg-zinc-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>

          {/* Preview del Impacto */}
          <div className="p-2.5 bg-zinc-900/40 rounded-xl border border-zinc-800/60 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Impacto este ciclo:</span>
            <span className="font-bold text-emerald-400">{formatearMoneda(impactoEstimado)}</span>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/25 active:scale-98 transition cursor-pointer"
            >
              <Save size={15} />
              <span>{gastoInicial ? 'Guardar Cambios' : 'Crear Gasto Fijo'}</span>
            </button>

            {gastoInicial && onEliminar && (
              <button
                type="button"
                onClick={() => {
                  onEliminar(gastoInicial.id);
                  onCerrar();
                }}
                className="p-2.5 rounded-xl bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition cursor-pointer"
                title="Eliminar gasto fijo"
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
