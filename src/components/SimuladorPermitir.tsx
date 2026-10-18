import React, { useState } from 'react';
import type { ResumenFinanciero } from '../utils/calculations';
import { formatearMoneda } from '../utils/calculations';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  X,
} from 'lucide-react';

interface Props {
  resumen: ResumenFinanciero;
}

export const SimuladorPermitir: React.FC<Props> = ({ resumen }) => {
  const [abierto, setAbierto] = useState(false);
  const [importeTexto, setImporteTexto] = useState('');

  const diasRestantes = Math.max(1, resumen.diasRestantesCiclo);
  const disponibleRestante = resumen.disponibleMensualRestante;

  // Disponible diario actual para los días restantes del ciclo
  const diarioActual = disponibleRestante > 0 ? disponibleRestante / diasRestantes : 0;

  const importeHipotetico = parseFloat(importeTexto.replace(',', '.')) || 0;
  const tieneImporte = importeHipotetico > 0;

  // Nuevo disponible tras la compra hipotética
  const nuevoRestante = disponibleRestante - importeHipotetico;
  const nuevoDiario = nuevoRestante / diasRestantes;

  // Determinación semántica del impacto
  let estadoSemantico: 'verde' | 'ambar' | 'rojo' = 'verde';
  let porcentajeReduccion = 0;

  if (nuevoRestante < 0) {
    estadoSemantico = 'rojo';
  } else if (diarioActual > 0) {
    porcentajeReduccion = ((diarioActual - nuevoDiario) / diarioActual) * 100;
    if (porcentajeReduccion > 25) {
      estadoSemantico = 'ambar';
    } else {
      estadoSemantico = 'verde';
    }
  } else {
    estadoSemantico = 'rojo';
  }

  const handleSumarPreset = (cantidad: number) => {
    const actual = parseFloat(importeTexto.replace(',', '.')) || 0;
    setImporteTexto(String(Math.round((actual + cantidad) * 100) / 100));
  };

  const handleLimpiar = () => {
    setImporteTexto('');
  };

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 transition-all overflow-hidden">
      {/* Botón Cabecera Desplegable */}
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-zinc-800/40 transition active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <HelpCircle size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-200">¿Me lo puedo permitir?</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                Simulador
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              {abierto
                ? 'Simula una compra y evalúa su impacto en tu presupuesto'
                : 'Calcula en tiempo real antes de comprar sin guardar nada'}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-zinc-400 ml-2">
          {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Contenido desplegado */}
      {abierto && (
        <div className="p-3.5 pt-0 border-t border-zinc-800/60 space-y-3.5 animate-fadeIn">
          {/* Input de importe con selector rápido */}
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1.5 font-medium">
              Importe de la compra que estás pensando:
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                step="0.01"
                min="0"
                value={importeTexto}
                onChange={(e) => setImporteTexto(e.target.value)}
                placeholder="Ej. 85.00"
                className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-zinc-100 text-sm font-mono placeholder:text-zinc-600 focus:outline-none pr-16"
              />
              <div className="absolute right-3 flex items-center gap-1.5">
                {tieneImporte && (
                  <button
                    type="button"
                    onClick={handleLimpiar}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    title="Limpiar importe"
                  >
                    <X size={14} />
                  </button>
                )}
                <span className="text-xs font-mono font-bold text-zinc-400">€</span>
              </div>
            </div>

            {/* Presets rápidos */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5 no-scrollbar">
              {[15, 30, 50, 85, 120].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSumarPreset(preset)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-mono border border-zinc-700/50 transition cursor-pointer shrink-0"
                >
                  +{preset}€
                </button>
              ))}
            </div>
          </div>

          {/* Resultado de la simulación */}
          {tieneImporte ? (
            <div
              className={`p-3 rounded-xl border transition-all ${
                estadoSemantico === 'verde'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : estadoSemantico === 'ambar'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              {/* Badge semántico */}
              <div className="flex items-center gap-1.5 mb-2 font-semibold text-xs">
                {estadoSemantico === 'verde' && (
                  <>
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">Impacto bajo • Compra asumible</span>
                  </>
                )}
                {estadoSemantico === 'ambar' && (
                  <>
                    <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                    <span className="text-amber-300">
                      Reduce tu margen un {porcentajeReduccion.toFixed(0)}% • Precaución
                    </span>
                  </>
                )}
                {estadoSemantico === 'rojo' && (
                  <>
                    <AlertOctagon size={15} className="text-rose-400 shrink-0" />
                    <span className="text-rose-300">Te deja en negativo • Riesgo de déficit</span>
                  </>
                )}
              </div>

              {/* Frase exacta de impacto requerida */}
              <p className="text-xs leading-relaxed font-sans text-zinc-100">
                Si compras esto hoy, tu Disponible Diario para los{' '}
                <strong className="text-white font-mono">{diasRestantes} días restantes</strong> del ciclo
                bajará de{' '}
                <strong className="font-mono text-white">{formatearMoneda(diarioActual)}/día</strong> a{' '}
                <strong
                  className={`font-mono ${
                    estadoSemantico === 'rojo'
                      ? 'text-rose-300 font-bold'
                      : estadoSemantico === 'ambar'
                      ? 'text-amber-300 font-bold'
                      : 'text-emerald-300 font-bold'
                  }`}
                >
                  {formatearMoneda(nuevoDiario)}/día
                </strong>
                .
              </p>

              {/* Explicación de contexto */}
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-300">
                <span>Disponible ciclo restante:</span>
                <span className={nuevoRestante < 0 ? 'text-rose-400 font-bold' : 'text-zinc-200 font-bold'}>
                  {formatearMoneda(nuevoRestante)}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-center">
              <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs mb-1">
                <Sparkles size={13} className="text-emerald-400" />
                <span>Simulación en vivo sin persistencia</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Escribe una cantidad (ej. 85 €) o toca un botón rápido para ver al instante cómo afecta a tus
                próximos días.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
