import React, { useMemo } from 'react';
import type {
  CategoriaVariable,
  TransaccionVariable,
  EstadoHucha,
  CicloCerrado,
} from '../types';
import type { ResumenFinanciero } from '../utils/calculations';
import { formatearMoneda } from '../utils/calculations';
import {
  X,
  Sparkles,
  TrendingDown,
  CalendarCheck2,
  CheckCircle2,
  ShieldCheck,
  Award,
  ArrowRight,
  Flame,
  Store,
} from 'lucide-react';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  resumen: ResumenFinanciero;
  categorias: CategoriaVariable[];
  transacciones: TransaccionVariable[];
  hucha: EstadoHucha;
  rachaDiasVerdes: number;
  esDiaDeCierreReal?: boolean;
  onConfirmarCierreCiclo: (ciclo: CicloCerrado) => void;
}

export const CierreCicloModal: React.FC<Props> = ({
  abierto,
  onCerrar,
  resumen,
  categorias,
  transacciones,
  hucha,
  rachaDiasVerdes,
  esDiaDeCierreReal = false,
  onConfirmarCierreCiclo,
}) => {
  // Transacciones de gasto del ciclo actual
  const gastosCiclo = useMemo(() => {
    const inicio = resumen.ciclo.fechaInicio.getTime();
    const fin = resumen.ciclo.fechaFin.getTime();
    return transacciones.filter((tx) => {
      if (!tx.fecha || tx.tipo !== 'gasto') return false;
      const t = new Date(tx.fecha).getTime();
      return t >= inicio && t <= fin;
    });
  }, [transacciones, resumen.ciclo]);

  // Cálculos de métricas del ciclo
  const metricasCierre = useMemo(() => {
    const ingresosTotales =
      resumen.ingresosMensuales + (resumen.ingresosExtraCiclo || 0);
    const gastosFijosTotales = resumen.impactoGastosFijos;
    const gastoVariableTotal = resumen.gastadoVariableAcumulado;
    const ahorroObjetivo = resumen.objetivoAhorro;

    // Ahorro real conseguido: Saldo que no ha salido del bolsillo
    const ahorroRealConseguido = Math.max(
      0,
      Math.round((ingresosTotales - gastosFijosTotales - gastoVariableTotal) * 100) / 100
    );

    // Calcular días con gasto cero y días en verde dentro del ciclo
    const mapaGastoPorDia = new Map<string, number>();
    const unDiaMs = 24 * 60 * 60 * 1000;
    const inicioMs = resumen.ciclo.fechaInicio.getTime();
    const finMs = Math.min(Date.now(), resumen.ciclo.fechaFin.getTime());

    // Inicializar días transcurridos a 0
    let curTime = inicioMs;
    while (curTime <= finMs) {
      const d = new Date(curTime);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      mapaGastoPorDia.set(k, 0);
      curTime += unDiaMs;
    }

    gastosCiclo.forEach((tx) => {
      const d = new Date(tx.fecha);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      if (mapaGastoPorDia.has(k)) {
        mapaGastoPorDia.set(k, (mapaGastoPorDia.get(k) || 0) + (Number(tx.importe) || 0));
      }
    });

    const limiteDiarioMedio =
      resumen.diasTotalesCiclo > 0
        ? resumen.presupuestoVariableTotal / resumen.diasTotalesCiclo
        : 0;

    let diasGastoCero = 0;
    let diasVerdes = 0;

    mapaGastoPorDia.forEach((gastoDia) => {
      if (gastoDia === 0) {
        diasGastoCero += 1;
      }
      if (gastoDia <= limiteDiarioMedio) {
        diasVerdes += 1;
      }
    });

    // Top comercio del ciclo
    const mapaComercios = new Map<string, { total: number; visitas: number; nombre: string }>();
    gastosCiclo.forEach((tx) => {
      const norm = (tx.comercio || 'Comercio').trim().toUpperCase();
      const actual = mapaComercios.get(norm) || {
        nombre: tx.comercio || 'Comercio',
        total: 0,
        visitas: 0,
      };
      actual.total += Number(tx.importe) || 0;
      actual.visitas += 1;
      mapaComercios.set(norm, actual);
    });

    const comerciosArray = Array.from(mapaComercios.values()).sort(
      (a, b) => b.total - a.total
    );
    const topComercio = comerciosArray[0] || {
      nombre: 'Sin gastos',
      total: 0,
      visitas: 0,
    };

    // Desglose de categorías: más controlada vs mayor desvío
    const catAnalisis = categorias.map((c) => {
      const gastado = gastosCiclo
        .filter((tx) => tx.categoriaId === c.id)
        .reduce((sum, tx) => sum + (Number(tx.importe) || 0), 0);
      const desviacion = Math.round((gastado - c.presupuesto) * 100) / 100;
      const ratio = c.presupuesto > 0 ? gastado / c.presupuesto : 1;
      return {
        id: c.id,
        nombre: c.nombre,
        color: c.color,
        icono: c.icono,
        gastado,
        presupuesto: c.presupuesto,
        desviacion,
        ratio,
      };
    });

    // Ordenar de mejor a peor ratio de gasto
    catAnalisis.sort((a, b) => a.ratio - b.ratio);
    const categoriaMejor = catAnalisis[0];
    const categoriaPeor = catAnalisis[catAnalisis.length - 1];

    return {
      ingresosTotales,
      gastosFijosTotales,
      gastoVariableTotal,
      ahorroObjetivo,
      ahorroRealConseguido,
      diasGastoCero,
      diasVerdes,
      topComercio,
      categoriaMejor,
      categoriaPeor,
      superoObjetivo: ahorroRealConseguido >= ahorroObjetivo,
      sobranteHuchaCiclo: resumen.netoHuchaCiclo,
    };
  }, [resumen, gastosCiclo, categorias]);

  if (!abierto) return null;

  const handleCerrarCicloConfirmado = () => {
    const nuevoCiclo: CicloCerrado = {
      id: `ciclo-${resumen.ciclo.etiquetaRango.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
      mes: resumen.ciclo.etiquetaRango,
      etiquetaRango: resumen.ciclo.etiquetaRango,
      fechaInicio: resumen.ciclo.fechaInicio.toISOString(),
      fechaFin: resumen.ciclo.fechaFin.toISOString(),
      cerradoEn: new Date().toISOString(),
      ingresosTotales: metricasCierre.ingresosTotales,
      gastosFijosTotales: metricasCierre.gastosFijosTotales,
      gastoVariableTotal: metricasCierre.gastoVariableTotal,
      ahorroObjetivo: metricasCierre.ahorroObjetivo,
      ahorroRealConseguido: metricasCierre.ahorroRealConseguido,
      diasGastoCero: metricasCierre.diasGastoCero,
      diasVerdes: metricasCierre.diasVerdes,
      topComercio: metricasCierre.topComercio,
      categoriaMejor: metricasCierre.categoriaMejor
        ? {
            nombre: metricasCierre.categoriaMejor.nombre,
            gastado: metricasCierre.categoriaMejor.gastado,
            presupuesto: metricasCierre.categoriaMejor.presupuesto,
            desviacion: metricasCierre.categoriaMejor.desviacion,
          }
        : undefined,
      categoriaPeor: metricasCierre.categoriaPeor
        ? {
            nombre: metricasCierre.categoriaPeor.nombre,
            gastado: metricasCierre.categoriaPeor.gastado,
            presupuesto: metricasCierre.categoriaPeor.presupuesto,
            desviacion: metricasCierre.categoriaPeor.desviacion,
          }
        : undefined,
    };

    onConfirmarCierreCiclo(nuevoCiclo);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-zinc-900 via-zinc-950 to-black rounded-3xl border border-zinc-800 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Botón cerrar */}
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Encabezado */}
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                esDiaDeCierreReal
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              }`}
            >
              <CalendarCheck2 size={12} />
              {esDiaDeCierreReal ? '¡Hoy es Día 9 • Cierre Oficial!' : 'Previsualización Día 9'}
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-white mt-1.5">
            Resumen de Cierre de Ciclo
          </h2>
          <p className="text-xs text-zinc-400 font-mono">
            {resumen.ciclo.etiquetaRango}
          </p>
        </div>

        {/* 1. Tarjeta Reina: Ahorro Objetivo vs Ahorro Real */}
        <div
          className={`p-4 rounded-2xl border transition shadow-lg ${
            metricasCierre.superoObjetivo
              ? 'bg-gradient-to-br from-emerald-950/60 via-zinc-900/90 to-zinc-950 border-emerald-500/40'
              : 'bg-gradient-to-br from-amber-950/40 via-zinc-900/90 to-zinc-950 border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Ahorro Real Conseguido
            </span>
            <div className="flex items-center gap-1 text-xs font-bold">
              {metricasCierre.superoObjetivo ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={14} /> ¡Superado!
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <TrendingDown size={14} /> Por debajo
                </span>
              )}
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold font-mono text-white">
              {formatearMoneda(metricasCierre.ahorroRealConseguido)}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              / Obj: {formatearMoneda(metricasCierre.ahorroObjetivo)}
            </span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>En Hucha Konto: +{formatearMoneda(hucha.saldo)}</span>
            <span
              className={
                metricasCierre.ahorroRealConseguido >= metricasCierre.ahorroObjetivo
                  ? 'text-emerald-400 font-bold'
                  : 'text-amber-400 font-bold'
              }
            >
              {metricasCierre.ahorroRealConseguido >= metricasCierre.ahorroObjetivo ? '+' : ''}
              {formatearMoneda(
                metricasCierre.ahorroRealConseguido - metricasCierre.ahorroObjetivo
              )}
            </span>
          </div>
        </div>

        {/* 2. Tarjetas de Días en Verde y No-Spend Days */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-zinc-950/90 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
              <Sparkles size={12} className="text-emerald-400" />
              No-Spend Days
            </span>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">
              {metricasCierre.diasGastoCero}
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">0€ gastados en el día</p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/90 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
              <ShieldCheck size={12} className="text-blue-400" />
              Días en Verde
            </span>
            <div className="text-2xl font-extrabold font-mono text-blue-400 mt-1">
              {metricasCierre.diasVerdes}
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Bajo presupuesto • Racha: {rachaDiasVerdes}d
            </p>
          </div>
        </div>

        {/* 3. Categoría más controlada vs Mayor desvío */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 px-1">
            Rendimiento por Categorías
          </span>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Mejor */}
            {metricasCierre.categoriaMejor && (
              <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase">
                  <Award size={12} /> Más Controlada
                </div>
                <div className="text-xs font-bold text-zinc-100 mt-1 truncate">
                  {metricasCierre.categoriaMejor.nombre}
                </div>
                <div className="text-[11px] font-mono font-semibold text-emerald-300 mt-0.5">
                  {formatearMoneda(metricasCierre.categoriaMejor.gastado)} /{' '}
                  {formatearMoneda(metricasCierre.categoriaMejor.presupuesto)}
                </div>
              </div>
            )}

            {/* Peor */}
            {metricasCierre.categoriaPeor && (
              <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/30">
                <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold uppercase">
                  <Flame size={12} /> Mayor Desvío
                </div>
                <div className="text-xs font-bold text-zinc-100 mt-1 truncate">
                  {metricasCierre.categoriaPeor.nombre}
                </div>
                <div className="text-[11px] font-mono font-semibold text-rose-300 mt-0.5">
                  {formatearMoneda(metricasCierre.categoriaPeor.gastado)} /{' '}
                  {formatearMoneda(metricasCierre.categoriaPeor.presupuesto)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Top Comercio del Ciclo */}
        {metricasCierre.topComercio.total > 0 && (
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                <Store size={15} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                  Top Comercio del Ciclo
                </span>
                <span className="text-xs font-bold text-zinc-100 truncate block">
                  {metricasCierre.topComercio.nombre}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {metricasCierre.topComercio.visitas} compras
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-sm font-extrabold font-mono text-purple-300">
                {formatearMoneda(metricasCierre.topComercio.total)}
              </div>
            </div>
          </div>
        )}

        {/* 5. Acciones Principales */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleCerrarCicloConfirmado}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
          >
            <span>Guardar en Historial e Iniciar Nuevo Ciclo (10 al 9)</span>
            <ArrowRight size={15} />
          </button>

          <button
            type="button"
            onClick={onCerrar}
            className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold border border-zinc-800 transition cursor-pointer text-center"
          >
            Cerrar previsualización
          </button>
        </div>
      </div>
    </div>
  );
};
