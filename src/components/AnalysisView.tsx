import React, { useState, useMemo } from 'react';
import type {
  CategoriaVariable,
  TransaccionVariable,
  CicloCerrado,
} from '../types';
import type { ResumenFinanciero } from '../utils/calculations';
import {
  formatearMoneda,
  formatearFechaMovimiento,
} from '../utils/calculations';
import { CategoryIcon } from './CategoryIcon';
import {
  Search,
  X,
  Sparkles,
  CheckCircle2,
  Bug,
  CalendarDays,
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  History,
  CalendarCheck2,
  ArrowRight,
} from 'lucide-react';

interface Props {
  transacciones: TransaccionVariable[];
  categorias: CategoriaVariable[];
  resumen: ResumenFinanciero;
  historialCiclos?: CicloCerrado[];
  onEditarTransaccion?: (tx: TransaccionVariable) => void;
  onAbrirWrapped?: () => void;
  onAbrirCierreCiclo?: () => void;
  onGenerarCiclosEjemplo?: () => void;
}

export const AnalysisView: React.FC<Props> = ({
  transacciones,
  categorias,
  resumen,
  historialCiclos = [],
  onEditarTransaccion,
  onAbrirWrapped,
  onAbrirCierreCiclo,
  onGenerarCiclosEjemplo,
}) => {
  // 1. Estados para el Buscador Spotlight
  const [terminoBusqueda, setTerminoBusqueda] = useState('');

  // 2. Transacciones del ciclo actual (solo confirmadas)
  const transaccionesCiclo = useMemo(() => {
    const inicio = resumen.ciclo.fechaInicio.getTime();
    const fin = resumen.ciclo.fechaFin.getTime();
    return transacciones.filter((tx) => {
      if (!tx.fecha || tx.confirmado === false) return false;
      const t = new Date(tx.fecha).getTime();
      return t >= inicio && t <= fin;
    });
  }, [transacciones, resumen.ciclo]);

  // Transacciones de gasto del ciclo
  const gastosCiclo = useMemo(() => {
    return transaccionesCiclo.filter((tx) => tx.tipo === 'gasto');
  }, [transaccionesCiclo]);

  // Map de categorías por ID para lookups rápidos
  const categoriasMap = useMemo(() => {
    const map = new Map<string, CategoriaVariable>();
    categorias.forEach((c) => map.set(c.id, c));
    return map;
  }, [categorias]);

  const transaccionesValidas = useMemo(() => {
    return transacciones.filter((tx) => tx.confirmado !== false);
  }, [transacciones]);

  // -------------------------------------------------------------
  // HERRAMIENTA 1: BUSCADOR GLOBAL INSTANTÁNEO (SPOTLIGHT)
  // -------------------------------------------------------------
  const resultadosBusqueda = useMemo(() => {
    const q = terminoBusqueda.trim();
    if (!q) return [];

    // Chequear si es un filtro numérico con operador (> 50, < 10, >= 20, <= 15, = 30)
    const opMatch = q.match(/^([><]=?|=)\s*([0-9]+(?:[\.,][0-9]+)?)$/);
    if (opMatch) {
      const op = opMatch[1];
      const valor = parseFloat(opMatch[2].replace(',', '.'));
      if (!isNaN(valor)) {
        return transaccionesValidas.filter((tx) => {
          if (op === '>') return tx.importe > valor;
          if (op === '>=') return tx.importe >= valor;
          if (op === '<') return tx.importe < valor;
          if (op === '<=') return tx.importe <= valor;
          if (op === '=') return Math.abs(tx.importe - valor) < 0.01;
          return true;
        });
      }
    }

    // Chequear si es un número directo
    const numDirecto = parseFloat(q.replace(',', '.'));
    const esNumeroPuro = !isNaN(numDirecto) && (q === String(numDirecto) || q.endsWith('€') || q.endsWith('e'));

    // Chequear si es texto combinado con operador (ej. "Lidl > 20")
    const combinedMatch = q.match(/^(.*?)\s*([><]=?|=)\s*([0-9]+(?:[\.,][0-9]+)?)$/);
    if (combinedMatch) {
      const texto = combinedMatch[1].trim().toLowerCase();
      const op = combinedMatch[2];
      const valor = parseFloat(combinedMatch[3].replace(',', '.'));

      return transaccionesValidas.filter((tx) => {
        const cat = categoriasMap.get(tx.categoriaId);
        const catNombre = cat ? cat.nombre.toLowerCase() : '';
        const coincideTexto =
          tx.comercio.toLowerCase().includes(texto) || catNombre.includes(texto);
        let coincideNum = true;
        if (!isNaN(valor)) {
          if (op === '>') coincideNum = tx.importe > valor;
          else if (op === '>=') coincideNum = tx.importe >= valor;
          else if (op === '<') coincideNum = tx.importe < valor;
          else if (op === '<=') coincideNum = tx.importe <= valor;
          else if (op === '=') coincideNum = Math.abs(tx.importe - valor) < 0.01;
        }
        return coincideTexto && coincideNum;
      });
    }

    // Búsqueda por texto (comercio o categoría) o número directo
    const queryLower = q.toLowerCase();
    return transaccionesValidas.filter((tx) => {
      const cat = categoriasMap.get(tx.categoriaId);
      const catNombre = cat ? cat.nombre.toLowerCase() : '';
      const coincideTexto =
        tx.comercio.toLowerCase().includes(queryLower) ||
        catNombre.includes(queryLower);

      if (coincideTexto) return true;
      if (esNumeroPuro) {
        return Math.abs(tx.importe - numDirecto) < 0.01;
      }
      return false;
    });
  }, [terminoBusqueda, transaccionesValidas, categoriasMap]);

  const totalAcumuladoBusqueda = useMemo(() => {
    return resultadosBusqueda.reduce((acc, tx) => {
      return acc + (tx.tipo === 'gasto' ? tx.importe : -tx.importe);
    }, 0);
  }, [resultadosBusqueda]);

  // -------------------------------------------------------------
  // HERRAMIENTA 2: MAPA DE CALOR DEL CICLO (DEL DÍA 10 AL DÍA 9)
  // -------------------------------------------------------------
  const presupuestoDiarioMedio = useMemo(() => {
    if (resumen.presupuestoVariableTotal <= 0) return 20;
    return resumen.presupuestoVariableTotal / resumen.diasTotalesCiclo;
  }, [resumen.presupuestoVariableTotal, resumen.diasTotalesCiclo]);

  // Construcción de la matriz de días del ciclo
  const diasCicloData = useMemo(() => {
    const ahora = new Date();
    const hoyTimestamp = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
      12,
      0,
      0
    ).getTime();

    const inicio = new Date(resumen.ciclo.fechaInicio);
    const lista = [];

    for (let i = 0; i < resumen.ciclo.diasTotalesCiclo; i++) {
      const fecha = new Date(inicio);
      fecha.setDate(inicio.getDate() + i);

      const diaNum = fecha.getDate();
      const mesAbrev = fecha.toLocaleDateString('es-ES', { month: 'short' });
      const fechaMediodia = new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        fecha.getDate(),
        12,
        0,
        0
      ).getTime();

      const esHoy =
        fecha.getDate() === ahora.getDate() &&
        fecha.getMonth() === ahora.getMonth() &&
        fecha.getFullYear() === ahora.getFullYear();

      const esFuturo = fechaMediodia > hoyTimestamp;

      // Calcular gastos en este día específico
      const inicioDia = new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        fecha.getDate(),
        0,
        0,
        0,
        0
      ).getTime();
      const finDia = new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        fecha.getDate(),
        23,
        59,
        59,
        999
      ).getTime();

      const txsDelDia = gastosCiclo.filter((tx) => {
        const t = new Date(tx.fecha).getTime();
        return t >= inicioDia && t <= finDia;
      });

      const gastadoDia = txsDelDia.reduce((sum, tx) => sum + (Number(tx.importe) || 0), 0);

      // Estado semántico de calor
      let nivelCalor: 'cero' | 'esmeralda' | 'ambar' | 'rojo' | 'futuro' = 'futuro';

      if (!esFuturo) {
        if (gastadoDia === 0) {
          nivelCalor = 'cero';
        } else if (gastadoDia <= presupuestoDiarioMedio) {
          nivelCalor = 'esmeralda';
        } else if (gastadoDia <= presupuestoDiarioMedio * 1.5) {
          nivelCalor = 'ambar';
        } else {
          nivelCalor = 'rojo';
        }
      }

      lista.push({
        indiceCiclo: i + 1,
        fecha,
        diaNum,
        mesAbrev,
        esHoy,
        esFuturo,
        gastadoDia,
        txsDelDia,
        nivelCalor,
      });
    }

    return lista;
  }, [resumen.ciclo, gastosCiclo, presupuestoDiarioMedio]);

  // Día seleccionado en el mapa de calor (por defecto hoy o el último día activo)
  const [diaSeleccionadoIndice, setDiaSeleccionadoIndice] = useState<number>(() => {
    return Math.min(resumen.diaEnCiclo, resumen.diasTotalesCiclo);
  });

  const diaSeleccionado = useMemo(() => {
    return (
      diasCicloData.find((d) => d.indiceCiclo === diaSeleccionadoIndice) ||
      diasCicloData[0]
    );
  }, [diasCicloData, diaSeleccionadoIndice]);

  // -------------------------------------------------------------
  // HERRAMIENTA 3: RANKING DE VAMPIROS DE DINERO (TOP COMERCIOS)
  // -------------------------------------------------------------
  const rankingVampiros = useMemo(() => {
    const mapaComercios = new Map<
      string,
      {
        nombre: string;
        visitas: number;
        totalGastado: number;
        categoriaId: string;
      }
    >();

    gastosCiclo.forEach((tx) => {
      const nombreNorm = (tx.comercio || 'Comercio').trim().toUpperCase();
      const actual = mapaComercios.get(nombreNorm) || {
        nombre: tx.comercio || 'Comercio',
        visitas: 0,
        totalGastado: 0,
        categoriaId: tx.categoriaId,
      };

      actual.visitas += 1;
      actual.totalGastado += Number(tx.importe) || 0;
      mapaComercios.set(nombreNorm, actual);
    });

    const lista = Array.from(mapaComercios.values()).map((item) => ({
      ...item,
      ticketMedio: item.visitas > 0 ? item.totalGastado / item.visitas : 0,
    }));

    lista.sort((a, b) => b.totalGastado - a.totalGastado);

    const maxGasto = lista.length > 0 ? lista[0].totalGastado : 1;

    return lista.slice(0, 5).map((item, idx) => ({
      ...item,
      posicion: idx + 1,
      porcentajeRelativo: Math.min(100, Math.max(5, (item.totalGastado / maxGasto) * 100)),
    }));
  }, [gastosCiclo]);

  // -------------------------------------------------------------
  // HERRAMIENTA 4: DETECTOR DE GASTOS HORMIGA (<= 5.00 €)
  // -------------------------------------------------------------
  const datosHormiga = useMemo(() => {
    const microTxs = gastosCiclo.filter((tx) => (Number(tx.importe) || 0) <= 5.0);

    const totalHormiga = microTxs.reduce((sum, tx) => sum + (Number(tx.importe) || 0), 0);
    const numHormiga = microTxs.length;

    const totalGastadoCiclo = resumen.gastadoVariableAcumulado;
    const porcentajeDelGasto =
      totalGastadoCiclo > 0 ? (totalHormiga / totalGastadoCiclo) * 100 : 0;

    // Top 3 comercios más frecuentes en gastos hormiga
    const mapaMicro = new Map<string, { nombre: string; count: number; total: number }>();
    microTxs.forEach((tx) => {
      const norm = (tx.comercio || 'Comercio').trim().toUpperCase();
      const cur = mapaMicro.get(norm) || {
        nombre: tx.comercio || 'Comercio',
        count: 0,
        total: 0,
      };
      cur.count += 1;
      cur.total += Number(tx.importe) || 0;
      mapaMicro.set(norm, cur);
    });

    const topComerciosHormiga = Array.from(mapaMicro.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalHormiga,
      numHormiga,
      porcentajeDelGasto,
      topComerciosHormiga,
      microTxs,
    };
  }, [gastosCiclo, resumen.gastadoVariableAcumulado]);

  // -------------------------------------------------------------
  // HERRAMIENTA 5: RADAR DE INFLACIÓN POR CATEGORÍA
  // -------------------------------------------------------------
  const datosInflacionCategorias = useMemo(() => {
    const inicioActual = new Date(resumen.ciclo.fechaInicio);

    // Calcular ciclo anterior: 1 mes antes del inicio de este ciclo
    const inicioAnterior = new Date(inicioActual);
    inicioAnterior.setMonth(inicioAnterior.getMonth() - 1);

    const finAnterior = new Date(inicioActual.getTime() - 1);

    const tInicioAnt = inicioAnterior.getTime();
    const tFinAnt = finAnterior.getTime();

    // Transacciones de gasto del ciclo anterior
    const txCicloAnterior = transacciones.filter((tx) => {
      if (!tx.fecha || tx.tipo !== 'gasto') return false;
      const t = new Date(tx.fecha).getTime();
      return t >= tInicioAnt && t <= tFinAnt;
    });

    const hayHistorialPrevio = txCicloAnterior.length > 0;

    const lista = categorias.map((cat) => {
      const gastadoActual = gastosCiclo
        .filter((tx) => tx.categoriaId === cat.id)
        .reduce((sum, tx) => sum + (Number(tx.importe) || 0), 0);

      let gastoReferencia = 0;
      let tipoReferencia: 'ciclo_anterior' | 'ritmo_presupuesto' = 'ciclo_anterior';

      if (hayHistorialPrevio) {
        gastoReferencia = txCicloAnterior
          .filter((tx) => tx.categoriaId === cat.id)
          .reduce((sum, tx) => sum + (Number(tx.importe) || 0), 0);
        tipoReferencia = 'ciclo_anterior';
      } else {
        // Si aún no hay transacciones del mes anterior, calculamos la cuota esperada proporcional a hoy
        const ritmoProporcional = Math.max(0.1, resumen.porcentajeCicloTranscurrido / 100);
        gastoReferencia = Math.round(cat.presupuesto * ritmoProporcional * 100) / 100;
        tipoReferencia = 'ritmo_presupuesto';
      }

      const diferencia = Math.round((gastadoActual - gastoReferencia) * 100) / 100;
      const porcentaje =
        gastoReferencia > 0
          ? Math.round((diferencia / gastoReferencia) * 100)
          : gastadoActual > 0
          ? 100
          : 0;

      return {
        categoria: cat,
        gastadoActual,
        gastoReferencia,
        tipoReferencia,
        diferencia,
        porcentaje,
        tieneSubida: diferencia > 0 && gastadoActual > 0,
      };
    });

    // Ordenar de mayor sobreconsumo a menor
    lista.sort((a, b) => b.diferencia - a.diferencia);

    const conSubida = lista.filter((i) => i.tieneSubida);
    const sobrecosteTotal = conSubida.reduce((acc, i) => acc + i.diferencia, 0);

    return {
      hayHistorialPrevio,
      lista,
      conSubida,
      sobrecosteTotal,
    };
  }, [
    categorias,
    gastosCiclo,
    transacciones,
    resumen.ciclo.fechaInicio,
    resumen.porcentajeCicloTranscurrido,
  ]);

  return (
    <div className="space-y-5 pb-6">
      {/* Botón Destacado: Ver Konto Wrapped */}
      <button
        type="button"
        onClick={onAbrirWrapped}
        className="w-full p-4 rounded-3xl bg-gradient-to-r from-purple-950/80 via-zinc-900 to-emerald-950/80 border border-purple-500/30 hover:border-emerald-500/50 shadow-xl shadow-purple-950/30 transition-all active:scale-[0.99] flex items-center justify-between gap-3 text-left group cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20 group-hover:scale-105 transition">
            <Sparkles size={20} className="text-zinc-950 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-400 to-emerald-300 bg-clip-text text-transparent">
                Edición Especial
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono border border-emerald-500/30">
                Anual
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-white mt-0.5 truncate">
              Ver Konto Wrapped (Resumen Global/Anual)
            </h3>
            <p className="text-[11px] text-zinc-400 truncate">
              Tu historia financiera, récords y comercio #1
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-emerald-400">
          <span className="hidden sm:inline">Descubrir</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
        </div>
      </button>

      {/* --------------------------------------------------------- */}
      {/* 1. BUSCADOR GLOBAL INSTANTÁNEO SPOTLIGHT                  */}
      {/* --------------------------------------------------------- */}
      <section className="space-y-2.5">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            placeholder="Buscar por comercio, categoría o importe (ej. '> 50')..."
            className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-emerald-500 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition shadow-inner"
          />
          {terminoBusqueda && (
            <button
              type="button"
              onClick={() => setTerminoBusqueda('')}
              className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-200 rounded-md cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Atajos rápidos de filtro */}
        {!terminoBusqueda && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px] font-mono text-zinc-400">
            <span className="text-[10px] text-zinc-500 uppercase font-sans shrink-0 flex items-center gap-1">
              <Filter size={10} /> Filtros:
            </span>
            {['> 50', '< 10', 'Lidl', 'Coop', 'Restaurantes'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setTerminoBusqueda(chip)}
                className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 text-zinc-300 hover:text-white transition shrink-0 cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Tarjeta Resumen y Resultados de la Búsqueda Spotlight */}
        {terminoBusqueda.trim() !== '' && (
          <div className="rounded-2xl p-3.5 bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-3 animate-fadeIn">
            {/* Header de resultados */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                  Total acumulado búsqueda
                </span>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {formatearMoneda(totalAcumuladoBusqueda)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                  Resultados
                </span>
                <div className="text-sm font-bold font-mono text-zinc-200">
                  {resultadosBusqueda.length}{' '}
                  {resultadosBusqueda.length === 1 ? 'movimiento' : 'movimientos'}
                </div>
              </div>
            </div>

            {/* Lista de movimientos encontrados */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {resultadosBusqueda.length > 0 ? (
                resultadosBusqueda.slice(0, 15).map((tx) => {
                  const cat = categoriasMap.get(tx.categoriaId);
                  return (
                    <div
                      key={tx.id}
                      onClick={() => onEditarTransaccion && onEditarTransaccion(tx)}
                      className={`flex items-center justify-between p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/60 text-xs transition ${
                        onEditarTransaccion ? 'cursor-pointer hover:border-zinc-700 active:scale-[0.99]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {cat && (
                          <CategoryIcon icono={cat.icono} color={cat.color} size={13} />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-200 truncate">
                            {tx.comercio}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {formatearFechaMovimiento(tx.fecha)} • {cat?.nombre || 'General'}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`font-mono font-bold shrink-0 ${
                          tx.tipo === 'ingreso' ? 'text-emerald-400' : 'text-zinc-100'
                        }`}
                      >
                        {tx.tipo === 'ingreso' ? '+' : '-'}
                        {formatearMoneda(tx.importe)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-zinc-500">
                  No se encontraron movimientos que coincidan con &quot;{terminoBusqueda}&quot;.
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- */}
      {/* 2. MAPA DE CALOR DEL CICLO (DEL 10 AL 9)                  */}
      {/* --------------------------------------------------------- */}
      <section className="rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-4 border border-zinc-800/90 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CalendarDays size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100">Mapa de Calor del Ciclo</h3>
              <p className="text-[10px] text-zinc-500">
                {resumen.ciclo.etiquetaRango} • Ref. diaria: {formatearMoneda(presupuestoDiarioMedio)}
              </p>
            </div>
          </div>

          <div className="text-[10px] text-zinc-400 font-mono">
            Día {resumen.diaEnCiclo}/{resumen.diasTotalesCiclo}
          </div>
        </div>

        {/* Leyenda visual */}
        <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono px-1">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span>0€ Gasto</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>&lt; Límite</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>100-150%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>&gt;150%</span>
          </div>
        </div>

        {/* Cuadrícula compacta de días del ciclo (6 columnas) */}
        <div className="grid grid-cols-6 gap-1.5">
          {diasCicloData.map((d) => {
            const estaSeleccionado = d.indiceCiclo === diaSeleccionado.indiceCiclo;

            let estiloFondo = 'bg-zinc-950/40 border-zinc-800/40 text-zinc-600';
            if (d.nivelCalor === 'cero') {
              estiloFondo =
                'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
            } else if (d.nivelCalor === 'esmeralda') {
              estiloFondo = 'bg-emerald-950/70 border-emerald-700/50 text-emerald-400';
            } else if (d.nivelCalor === 'ambar') {
              estiloFondo = 'bg-amber-950/70 border-amber-600/50 text-amber-300';
            } else if (d.nivelCalor === 'rojo') {
              estiloFondo =
                'bg-rose-950/80 border-rose-600/60 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.2)]';
            }

            return (
              <button
                key={d.indiceCiclo}
                type="button"
                onClick={() => setDiaSeleccionadoIndice(d.indiceCiclo)}
                className={`relative flex flex-col items-center justify-between p-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer min-h-[52px] ${estiloFondo} ${
                  estaSeleccionado ? 'ring-2 ring-white scale-[1.04] z-10' : 'hover:opacity-90'
                }`}
                title={`Día ${d.diaNum} ${d.mesAbrev}: ${d.esFuturo ? 'Pendiente' : formatearMoneda(d.gastadoDia)}`}
              >
                {/* Cabecera del día */}
                <div className="flex items-center justify-between w-full text-[9px] font-mono leading-none">
                  <span className="font-bold">{d.diaNum}</span>
                  {d.esHoy && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  )}
                  {d.nivelCalor === 'cero' && !d.esFuturo && (
                    <Sparkles size={9} className="text-emerald-300" />
                  )}
                </div>

                {/* Importe gastado o estado */}
                <div className="mt-1 text-[9px] font-mono font-bold truncate max-w-full leading-none">
                  {d.esFuturo ? (
                    <span className="text-zinc-600 text-[8px]">-</span>
                  ) : d.gastadoDia === 0 ? (
                    <span className="text-emerald-300 text-[8px]">0€</span>
                  ) : (
                    <span>{formatearMoneda(d.gastadoDia, false, 0)}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Desglose interactivo del día seleccionado */}
        <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-200">
                {diaSeleccionado.diaNum}{' '}
                {diaSeleccionado.fecha.toLocaleDateString('es-ES', { month: 'long', weekday: 'short' })}
              </span>
              {diaSeleccionado.esHoy && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-mono border border-cyan-500/30">
                  Hoy
                </span>
              )}
            </div>

            <div className="text-xs font-mono font-bold text-zinc-100">
              {diaSeleccionado.esFuturo
                ? 'Día no transcurrido'
                : `Total: ${formatearMoneda(diaSeleccionado.gastadoDia)}`}
            </div>
          </div>

          {/* Estado del día */}
          {!diaSeleccionado.esFuturo && (
            <div className="text-[11px] text-zinc-400">
              {diaSeleccionado.nivelCalor === 'cero' && (
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 size={13} />
                  <span>¡Día de Gasto Cero! No registraste ningún gasto variable.</span>
                </div>
              )}
              {diaSeleccionado.nivelCalor === 'esmeralda' && (
                <div className="text-emerald-400">
                  ● Gasto moderado (por debajo del límite diario de {formatearMoneda(presupuestoDiarioMedio)}).
                </div>
              )}
              {diaSeleccionado.nivelCalor === 'ambar' && (
                <div className="text-amber-400">
                  ▲ Ritmo acelerado ({formatearMoneda(diaSeleccionado.gastadoDia)} vs {formatearMoneda(presupuestoDiarioMedio)} de límite).
                </div>
              )}
              {diaSeleccionado.nivelCalor === 'rojo' && (
                <div className="text-rose-400">
                  ■ Exceso notable sobre la media diaria.
                </div>
              )}
            </div>
          )}

          {/* Lista de gastos de ese día */}
          {diaSeleccionado.txsDelDia && diaSeleccionado.txsDelDia.length > 0 ? (
            <div className="space-y-1.5 pt-1 border-t border-zinc-800/60 max-h-36 overflow-y-auto pr-1">
              {diaSeleccionado.txsDelDia.map((tx) => {
                const cat = categoriasMap.get(tx.categoriaId);
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-900/60"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {cat && <CategoryIcon icono={cat.icono} color={cat.color} size={12} />}
                      <span className="text-zinc-200 truncate">{tx.comercio}</span>
                    </div>
                    <span className="font-mono font-bold text-zinc-100 shrink-0">
                      -{formatearMoneda(tx.importe)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : !diaSeleccionado.esFuturo ? (
            <div className="text-[11px] text-zinc-500 italic">Sin movimientos registrados.</div>
          ) : null}
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* 3. RANKING DE VAMPIROS DE DINERO (TOP COMERCIOS)          */}
      {/* --------------------------------------------------------- */}
      <section className="rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-4 border border-zinc-800/90 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <TrendingDown size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100">Vampiros de Dinero (Top Comercios)</h3>
              <p className="text-[10px] text-zinc-500">Comercios donde más dinero se ha ido este ciclo</p>
            </div>
          </div>

          <span className="text-[10px] font-mono text-zinc-400 uppercase">Top 5</span>
        </div>

        {rankingVampiros.length > 0 ? (
          <div className="space-y-2.5 pt-1">
            {rankingVampiros.map((vamp) => {
              const cat = categoriasMap.get(vamp.categoriaId);

              return (
                <div
                  key={vamp.nombre}
                  className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Medalla de posición */}
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono shrink-0 ${
                          vamp.posicion === 1
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            : vamp.posicion === 2
                            ? 'bg-zinc-700/40 text-zinc-300 border border-zinc-600/30'
                            : vamp.posicion === 3
                            ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        #{vamp.posicion}
                      </span>

                      <div className="min-w-0">
                        <div className="font-bold text-xs text-zinc-200 truncate">
                          {vamp.nombre}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
                          <span>{vamp.visitas} {vamp.visitas === 1 ? 'compra' : 'compras'}</span>
                          <span>•</span>
                          <span>Ticket medio: {formatearMoneda(vamp.ticketMedio)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-rose-400">
                        {formatearMoneda(vamp.totalGastado)}
                      </div>
                      {cat && (
                        <div className="text-[9px] text-zinc-500 truncate">{cat.nombre}</div>
                      )}
                    </div>
                  </div>

                  {/* Barra proporcional visual */}
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        vamp.posicion === 1
                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                          : vamp.posicion === 2
                          ? 'bg-amber-500'
                          : 'bg-zinc-500'
                      }`}
                      style={{ width: `${vamp.porcentajeRelativo}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-zinc-500">
            No hay gastos registrados en el ciclo actual.
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- */}
      {/* 4. DETECTOR DE GASTOS HORMIGA (<= 5.00 €)                 */}
      {/* --------------------------------------------------------- */}
      <section className="rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-4 border border-zinc-800/90 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
              <Bug size={15} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-zinc-100">Detector de Gastos Hormiga</h3>
                <span className="px-1.5 py-0.2 rounded-full bg-teal-500/10 text-teal-300 text-[9px] font-mono border border-teal-500/20">
                  ≤ 5,00 €
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">Pequeños desembolsos casi invisibles</p>
            </div>
          </div>
        </div>

        {/* Tarjeta de métricas agregadas */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">
              Total Fuga Hormiga
            </span>
            <div className="text-xl font-extrabold font-mono text-teal-300 mt-0.5">
              {formatearMoneda(datosHormiga.totalHormiga)}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              {datosHormiga.porcentajeDelGasto.toFixed(1)}% de tu gasto variable
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">
              Micro-compras
            </span>
            <div className="text-xl font-extrabold font-mono text-zinc-200 mt-0.5">
              {datosHormiga.numHormiga}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              menores a 5,00 €
            </div>
          </div>
        </div>

        {/* Comercios más frecuentes en gastos hormiga */}
        {datosHormiga.topComerciosHormiga.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold px-1">
              Comercios habituales de gasto hormiga
            </span>
            <div className="space-y-1.5">
              {datosHormiga.topComerciosHormiga.map((c, idx) => (
                <div
                  key={c.nombre}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-mono text-zinc-500 font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-zinc-200 font-semibold truncate">{c.nombre}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      ({c.count} {c.count === 1 ? 'vez' : 'veces'})
                    </span>
                  </div>

                  <span className="font-mono font-bold text-teal-400 shrink-0">
                    {formatearMoneda(c.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tip inteligente de ahorro */}
        <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-300 leading-normal flex items-start gap-2">
          <Sparkles size={14} className="text-teal-400 shrink-0 mt-0.5" />
          <span>
            Si redujeras estas micro-compras a la mitad, blindarías{' '}
            <strong className="text-white font-mono">
              +{formatearMoneda(datosHormiga.totalHormiga / 2)}
            </strong>{' '}
            adicionales directamente en tu Hucha Konto.
          </span>
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* 5. RADAR DE INFLACIÓN POR CATEGORÍA                       */}
      {/* --------------------------------------------------------- */}
      <section className="rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-4 border border-zinc-800/90 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <TrendingUp size={15} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-zinc-100">Inflación por Categoría</h3>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-300 text-[9px] font-mono border border-rose-500/20">
                  {datosInflacionCategorias.hayHistorialPrevio ? 'vs Ciclo Anterior' : 'vs Ritmo Presupuesto'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">
                {datosInflacionCategorias.hayHistorialPrevio
                  ? 'Variación acumulada respecto al mes anterior'
                  : 'Desviación frente al ritmo previsto de gasto'}
              </p>
            </div>
          </div>
        </div>

        {/* Tarjeta de métricas agregadas */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">
              Presión Inflacionaria
            </span>
            <div className="text-xl font-extrabold font-mono text-rose-400 mt-0.5">
              +{formatearMoneda(datosInflacionCategorias.sobrecosteTotal)}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              en {datosInflacionCategorias.conSubida.length}{' '}
              {datosInflacionCategorias.conSubida.length === 1 ? 'categoría' : 'categorías'}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">
              Categorías en Control
            </span>
            <div className="text-xl font-extrabold font-mono text-emerald-400 mt-0.5">
              {datosInflacionCategorias.lista.length - datosInflacionCategorias.conSubida.length} /{' '}
              {datosInflacionCategorias.lista.length}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              gasto igual o menor
            </div>
          </div>
        </div>

        {/* Lista de Categorías con comparador */}
        <div className="space-y-2">
          {datosInflacionCategorias.lista.map((item) => {
            const esSubida = item.diferencia > 0;
            const esNeutro = Math.abs(item.diferencia) < 0.01;

            return (
              <div
                key={item.categoria.id}
                className={`p-3 rounded-2xl border transition-all ${
                  esSubida
                    ? 'bg-zinc-950/70 border-rose-500/20'
                    : 'bg-zinc-950/40 border-zinc-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${item.categoria.color}15`,
                        borderColor: `${item.categoria.color}35`,
                      }}
                    >
                      <CategoryIcon
                        icono={item.categoria.icono}
                        color={item.categoria.color}
                        size={14}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-zinc-200 truncate">
                          {item.categoria.nombre}
                        </span>
                        {esSubida && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded-md">
                            <ArrowUpRight size={10} /> +{item.porcentaje}%
                          </span>
                        )}
                        {!esSubida && !esNeutro && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-md">
                            <ArrowDownRight size={10} /> {item.porcentaje}%
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        Ref: {formatearMoneda(item.gastoReferencia)} • Actual:{' '}
                        {formatearMoneda(item.gastadoActual)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-mono font-bold ${
                        esSubida
                          ? 'text-rose-400'
                          : esNeutro
                          ? 'text-zinc-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {esSubida
                        ? `+${formatearMoneda(item.diferencia)}`
                        : formatearMoneda(item.diferencia)}
                    </div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">
                      {esSubida ? 'Sobreconsumo' : esNeutro ? 'Sin variación' : 'Ahorro'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* 6. HISTORIAL DE CICLOS PASADOS                            */}
      {/* --------------------------------------------------------- */}
      <section className="rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-4 border border-zinc-800/90 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <History size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100">Historial de Ciclos Pasados</h3>
              <p className="text-[10px] text-zinc-500">Archivo oficial de nóminas del 10 al 9</p>
            </div>
          </div>

          {onAbrirCierreCiclo && (
            <button
              type="button"
              onClick={onAbrirCierreCiclo}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer"
            >
              + Cerrar ciclo actual
            </button>
          )}
        </div>

        {historialCiclos && historialCiclos.length > 0 ? (
          <div className="space-y-2.5">
            {historialCiclos.map((ciclo) => (
              <div
                key={ciclo.id}
                className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2 hover:border-zinc-700/80 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CalendarCheck2 size={13} className="text-emerald-400" />
                      <span>{ciclo.etiquetaRango}</span>
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Cerrado el {new Date(ciclo.cerradoEn).toLocaleDateString('es-ES')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black font-mono text-emerald-400">
                      +{formatearMoneda(ciclo.ahorroRealConseguido)}
                    </span>
                    <span className="text-[9px] text-zinc-500 block uppercase font-mono">
                      Ahorrado (Obj: {formatearMoneda(ciclo.ahorroObjetivo)})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-900 text-center font-mono">
                  <div className="p-1.5 rounded-lg bg-zinc-900/60">
                    <span className="text-[9px] text-zinc-500 block uppercase">Gasto Var.</span>
                    <span className="text-[11px] font-bold text-zinc-300">
                      {formatearMoneda(ciclo.gastoVariableTotal)}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-zinc-900/60">
                    <span className="text-[9px] text-zinc-500 block uppercase">Días Cero</span>
                    <span className="text-[11px] font-bold text-emerald-400">
                      {ciclo.diasGastoCero} días
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-zinc-900/60 truncate">
                    <span className="text-[9px] text-zinc-500 block uppercase">Top Comercio</span>
                    <span className="text-[11px] font-bold text-purple-300 truncate block">
                      {ciclo.topComercio?.nombre || '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center space-y-2.5">
            <p className="text-xs text-zinc-500">
              Aún no tienes ciclos archivados en el historial.
            </p>
            {onGenerarCiclosEjemplo && (
              <button
                type="button"
                onClick={onGenerarCiclosEjemplo}
                className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition cursor-pointer"
              >
                + Generar 4 ciclos de ejemplo
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
