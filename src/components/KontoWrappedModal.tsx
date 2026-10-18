import React, { useState, useMemo } from 'react';
import type {
  CicloCerrado,
  TransaccionVariable,
} from '../types';
import type { ResumenFinanciero } from '../utils/calculations';
import { formatearMoneda } from '../utils/calculations';
import {
  X,
  Sparkles,
  Award,
  Store,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  historialCiclos: CicloCerrado[];
  transacciones: TransaccionVariable[];
  resumenActual: ResumenFinanciero;
  onGenerarCiclosEjemplo: () => void;
}

export const KontoWrappedModal: React.FC<Props> = ({
  abierto,
  onCerrar,
  historialCiclos,
  transacciones,
  resumenActual,
  onGenerarCiclosEjemplo,
}) => {
  const [tarjetaActual, setTarjetaActual] = useState(0);

  // Unificar ciclos cerrados + ciclo actual para cálculo anual completo
  const todosLosCiclos = useMemo(() => {
    // Si no hay ciclos pasados y no hay transacciones en el actual, devolvemos array vacío
    const copia = [...historialCiclos];
    // Añadir ciclo actual en progreso como referencia
    const actualAhorro = Math.max(
      0,
      resumenActual.ingresosMensuales +
        (resumenActual.ingresosExtraCiclo || 0) -
        resumenActual.impactoGastosFijos -
        resumenActual.gastadoVariableAcumulado
    );

    copia.push({
      id: 'ciclo-actual-en-progreso',
      mes: resumenActual.ciclo.etiquetaRango,
      etiquetaRango: `${resumenActual.ciclo.etiquetaRango} (En curso)`,
      fechaInicio: resumenActual.ciclo.fechaInicio.toISOString(),
      fechaFin: resumenActual.ciclo.fechaFin.toISOString(),
      cerradoEn: new Date().toISOString(),
      ingresosTotales:
        resumenActual.ingresosMensuales + (resumenActual.ingresosExtraCiclo || 0),
      gastosFijosTotales: resumenActual.impactoGastosFijos,
      gastoVariableTotal: resumenActual.gastadoVariableAcumulado,
      ahorroObjetivo: resumenActual.objetivoAhorro,
      ahorroRealConseguido: actualAhorro,
      diasGastoCero: 0,
      diasVerdes: 0,
    });

    return copia;
  }, [historialCiclos, resumenActual]);

  // Cálculos consolidados para el Wrapped
  const datosWrapped = useMemo(() => {
    const totalAhorrado = todosLosCiclos.reduce(
      (acc, c) => acc + (c.ahorroRealConseguido || 0),
      0
    );
    const totalIngresos = todosLosCiclos.reduce(
      (acc, c) => acc + (c.ingresosTotales || 0),
      0
    );
    const porcentajeSalvadado =
      totalIngresos > 0 ? Math.round((totalAhorrado / totalIngresos) * 100) : 0;

    // Total de Días de Gasto Cero acumulados
    const totalDiasCero = todosLosCiclos.reduce(
      (acc, c) => acc + (c.diasGastoCero || 0),
      0
    );

    // Mejor ciclo del año por ahorro
    let mejorCiclo: CicloCerrado | undefined = todosLosCiclos.length > 0 ? todosLosCiclos[0] : undefined;
    for (const c of todosLosCiclos) {
      if (!mejorCiclo || c.ahorroRealConseguido > mejorCiclo.ahorroRealConseguido) {
        mejorCiclo = c;
      }
    }

    // Top Comercio #1 de todo el año (agregado de transacciones históricas)
    const mapaComercios = new Map<string, { total: number; visitas: number; nombre: string }>();
    transacciones.forEach((tx) => {
      if (tx.tipo === 'gasto') {
        const norm = (tx.comercio || 'Comercio').trim().toUpperCase();
        const item = mapaComercios.get(norm) || {
          nombre: tx.comercio || 'Comercio',
          total: 0,
          visitas: 0,
        };
        item.total += Number(tx.importe) || 0;
        item.visitas += 1;
        mapaComercios.set(norm, item);
      }
    });

    const comerciosOrdenados = Array.from(mapaComercios.values()).sort(
      (a, b) => b.total - a.total
    );
    const topComercioAnual = comerciosOrdenados[0] || {
      nombre: 'Tus Comercios Habituales',
      total: 0,
      visitas: 0,
    };

    return {
      totalAhorrado,
      totalIngresos,
      porcentajeSalvadado,
      totalDiasCero,
      mejorCiclo,
      topComercioAnual,
      numCiclosContabilizados: todosLosCiclos.length,
    };
  }, [todosLosCiclos, transacciones]);

  if (!abierto) return null;

  const totalTarjetas = 4;

  const handleNext = () => {
    if (tarjetaActual < totalTarjetas - 1) {
      setTarjetaActual((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (tarjetaActual > 0) {
      setTarjetaActual((prev) => prev - 1);
    }
  };

  // Altura máxima para gráfica de barras comparativa
  const maxAhorroBarra = Math.max(
    ...todosLosCiclos.map((c) => c.ahorroRealConseguido),
    1
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-xl animate-fadeIn">
      {/* Contenedor estilo Historia de Instagram / Spotify Wrapped */}
      <div className="relative w-full max-w-[410px] h-[640px] max-h-[92vh] rounded-[36px] overflow-hidden flex flex-col justify-between border border-zinc-800/80 shadow-[0_0_80px_rgba(16,185,129,0.2)] bg-gradient-to-b from-purple-950 via-zinc-950 to-emerald-950 text-white select-none">
        {/* Barra superior de progreso estilo historias */}
        <div className="p-4 pb-0 z-20">
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-1 rounded-full overflow-hidden bg-white/20 transition-all"
              >
                <div
                  className={`h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-300 ${
                    idx <= tarjetaActual ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-black tracking-widest uppercase bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
                Konto Wrapped
              </span>
            </div>
            <button
              onClick={onCerrar}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Contenido Central de la Tarjeta Activa */}
        <div className="flex-1 px-6 py-4 flex flex-col justify-center items-center text-center relative z-10">
          {/* ========================================================= */}
          {/* TARJETA 1: Total Ahorrado y % de Ingresos Salvados       */}
          {/* ========================================================= */}
          {tarjetaActual === 0 && (
            <div className="space-y-6 animate-scaleUp">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40 border border-emerald-300/40">
                <Sparkles size={38} className="text-zinc-950 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <span className="text-xs uppercase tracking-widest font-extrabold text-emerald-400">
                  Tu Fortaleza Financiera
                </span>
                <h3 className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-md">
                  {formatearMoneda(datosWrapped.totalAhorrado)}
                </h3>
                <p className="text-xs text-zinc-300 font-medium">
                  Ahorro neto acumulado en tus ciclos
                </p>
              </div>

              <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
                <div className="text-3xl font-black font-mono text-emerald-300">
                  {datosWrapped.porcentajeSalvadado}%
                </div>
                <p className="text-xs text-zinc-300">
                  de todos tus ingresos fueron blindados y protegidos con éxito.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TARJETA 2: Comercio #1 del Año                            */}
          {/* ========================================================= */}
          {tarjetaActual === 1 && (
            <div className="space-y-6 animate-scaleUp">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/40 border border-purple-300/40">
                <Store size={38} className="text-white stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <span className="text-xs uppercase tracking-widest font-extrabold text-purple-400">
                  Tu Punto de Encuentro #1
                </span>
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md truncate max-w-[320px]">
                  {datosWrapped.topComercioAnual.nombre}
                </h3>
                <p className="text-xs text-zinc-300 font-medium">
                  El comercio donde más veces hiciste tus compras
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                    Visitas
                  </span>
                  <div className="text-2xl font-black font-mono text-purple-300 mt-0.5">
                    {datosWrapped.topComercioAnual.visitas}
                  </div>
                  <span className="text-[10px] text-zinc-400">compras totales</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                    Total Gastado
                  </span>
                  <div className="text-xl font-black font-mono text-white mt-0.5">
                    {formatearMoneda(datosWrapped.topComercioAnual.total)}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    ~
                    {datosWrapped.topComercioAnual.visitas > 0
                      ? formatearMoneda(
                          datosWrapped.topComercioAnual.total /
                            datosWrapped.topComercioAnual.visitas
                        )
                      : '0€'}
                    /visita
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TARJETA 3: Días de Gasto Cero y Mejor Ciclo               */}
          {/* ========================================================= */}
          {tarjetaActual === 2 && (
            <div className="space-y-6 animate-scaleUp">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-teal-400 to-blue-500 flex items-center justify-center mx-auto shadow-2xl shadow-teal-500/40 border border-teal-300/40">
                <Award size={38} className="text-zinc-950 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <span className="text-xs uppercase tracking-widest font-extrabold text-teal-300">
                  Disciplina de Titanio
                </span>
                <div className="text-5xl font-black font-mono text-white">
                  {datosWrapped.totalDiasCero}{' '}
                  <span className="text-xl font-bold text-teal-400">Días</span>
                </div>
                <p className="text-xs text-zinc-300 font-medium">
                  "No-Spend Days" con exactamente 0,00 € gastados
                </p>
              </div>

              {datosWrapped.mejorCiclo && (
                <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1 w-full text-left">
                  <div className="flex items-center gap-1.5 text-amber-400 text-[10px] uppercase font-bold tracking-wider">
                    <Flame size={13} /> Tu Mejor Ciclo del Año
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-sm font-bold text-white truncate">
                      {datosWrapped.mejorCiclo.etiquetaRango}
                    </span>
                    <span className="text-lg font-black font-mono text-emerald-400">
                      +{formatearMoneda(datosWrapped.mejorCiclo.ahorroRealConseguido)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Tu récord absoluto de dinero protegido en un solo mes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TARJETA 4: Gráfica Comparativa de Ahorro por Ciclo         */}
          {/* ========================================================= */}
          {tarjetaActual === 3 && (
            <div className="space-y-4 animate-scaleUp w-full">
              <div className="space-y-1 text-center">
                <span className="text-xs uppercase tracking-widest font-extrabold text-emerald-400">
                  Evolución de Ahorro
                </span>
                <h3 className="text-2xl font-black text-white">
                  Comparativa por Ciclos
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Dinero que se quedó en tu cuenta cada mes
                </p>
              </div>

              {/* Gráfica de Barras Visual */}
              <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="h-40 flex items-end justify-between gap-2 pt-4 px-1">
                  {todosLosCiclos.slice(-5).map((c, i) => {
                    const alturaPct = Math.min(
                      100,
                      Math.max(15, Math.round((c.ahorroRealConseguido / maxAhorroBarra) * 100))
                    );
                    const esUltimo = i === todosLosCiclos.slice(-5).length - 1;

                    return (
                      <div
                        key={c.id || i}
                        className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group"
                      >
                        <span className="text-[9px] font-mono font-bold text-emerald-300">
                          {Math.round(c.ahorroRealConseguido)}€
                        </span>
                        <div
                          style={{ height: `${alturaPct}%` }}
                          className={`w-full rounded-t-xl transition-all duration-500 shadow-lg ${
                            esUltimo
                              ? 'bg-gradient-to-t from-emerald-500 to-teal-300 shadow-emerald-500/30'
                              : 'bg-gradient-to-t from-purple-600 to-indigo-400'
                          }`}
                        />
                        <span className="text-[9px] font-mono text-zinc-400 truncate max-w-[50px]">
                          {c.etiquetaRango.split('–')[0]?.trim() || `C${i + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botón para cargar 4 ciclos de ejemplo */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onGenerarCiclosEjemplo}
                  className="w-full py-2 px-3 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={14} className="text-purple-400" />
                  <span>Cargar 4 ciclos de ejemplo pasados (Demo)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Navegación Inferior (Prev / Next) */}
        <div className="p-5 pt-0 flex items-center justify-between z-20">
          <button
            onClick={handlePrev}
            disabled={tarjetaActual === 0}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              tarjetaActual === 0
                ? 'opacity-30 border-transparent text-zinc-600 pointer-events-none'
                : 'bg-white/10 hover:bg-white/20 border-white/15 text-white active:scale-95'
            }`}
          >
            <ChevronLeft size={20} />
          </button>

          <span className="text-xs font-mono font-bold text-zinc-400">
            {tarjetaActual + 1} de {totalTarjetas}
          </span>

          {tarjetaActual < totalTarjetas - 1 ? (
            <button
              onClick={handleNext}
              className="py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 font-black text-xs shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Siguiente</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={onCerrar}
              className="py-3 px-5 rounded-2xl bg-white text-zinc-950 font-black text-xs shadow-lg hover:bg-zinc-200 active:scale-95 transition cursor-pointer"
            >
              ¡Cerrar Wrapped!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
