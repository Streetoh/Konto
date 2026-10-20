import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type {
  ConfiguracionMensual,
  GastoFijo,
  CategoriaVariable,
  TransaccionVariable,
  DiccionarioReglas,
  ReglaMapeo,
  NotificacionCruda,
  TabType,
  EstadoHucha,
  MovimientoHucha,
  CicloCerrado,
} from './types';
import {
  loadConfig,
  saveConfig,
  loadGastosFijos,
  saveGastosFijos,
  loadCategorias,
  saveCategorias,
  loadTransacciones,
  saveTransacciones,
  loadDiccionario,
  saveDiccionario,
  loadNotificacionesCrudas,
  saveNotificacionesCrudas,
  loadHucha,
  saveHucha,
  loadRacha,
  saveRacha,
  loadHistorialCiclos,
  saveHistorialCiclos,
  generarCiclosEjemplo,
  resetToDefaults,
  DEFAULT_CONFIG,
  DEFAULT_CATEGORIAS,
  DEFAULT_DICCIONARIO,
  DEFAULT_HUCHA,
} from './utils/storage';
import {
  calcularResumenFinanciero,
  obtenerCicloActivoHoy,
  calcularRachaDiasVerdes,
  ejecutarRolloverDiarioAutomatico,
} from './utils/calculations';
import { procesarTextoNotificacion, extraerPalabraClaveParaAprender } from './utils/notificationParser';
import { Header } from './components/Header';
import { MainHeroCard } from './components/MainHeroCard';
import { SimuladorPermitir } from './components/SimuladorPermitir';
import { ModoSupervivenciaBanner } from './components/ModoSupervivenciaBanner';
import { HuchaCard } from './components/HuchaCard';
import { BudgetProgressBar } from './components/BudgetProgressBar';
import { CategoriesList } from './components/CategoriesList';
import { RecentTransactions } from './components/RecentTransactions';
import { AnalysisView } from './components/AnalysisView';
import { BottomNav } from './components/BottomNav';
import { QuickSettingsModal } from './components/QuickSettingsModal';
import { AddTransactionModal } from './components/AddTransactionModal';
import { QuickExpenseSheet } from './components/QuickExpenseSheet';
import { FloatingAddButton } from './components/FloatingAddButton';
import { FixedExpensesView } from './components/FixedExpensesView';
import { PendingNotificationsInbox } from './components/PendingNotificationsInbox';
import { SettingsView } from './components/SettingsView';
import { NotificationToast, type ToastData } from './components/NotificationToast';
import { ScreenshotImportModal } from './components/ScreenshotImportModal';
import { RadarSuscripcionesBanner } from './components/RadarSuscripcionesBanner';
import { CierreCicloModal } from './components/CierreCicloModal';
import { KontoWrappedModal } from './components/KontoWrappedModal';
import { ModifyCategoryModal } from './components/ModifyCategoryModal';
import { Camera, Plus, CalendarCheck2 } from 'lucide-react';
import { vibrate } from './utils/haptics';
import type { GastoDetectadoPayload } from './types';

export function App() {
  // 1. Estados inicializados desde localStorage
  const [config, setConfig] = useState<ConfiguracionMensual>(() => {
    const loaded = loadConfig();
    if (!loaded.mesActual) {
      loaded.mesActual = obtenerCicloActivoHoy(loaded.diaInicioCiclo || 10);
    }
    return loaded;
  });

  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>(loadGastosFijos);
  const [categorias, setCategorias] = useState<CategoriaVariable[]>(loadCategorias);
  const [transacciones, setTransacciones] = useState<TransaccionVariable[]>(loadTransacciones);
  const [diccionario, setDiccionario] = useState<DiccionarioReglas>(loadDiccionario);
  const [notificacionesCrudas, setNotificacionesCrudas] = useState<NotificacionCruda[]>(
    loadNotificacionesCrudas
  );
  const [hucha, setHucha] = useState<EstadoHucha>(loadHucha);
  const [rachaDiasVerdes, setRachaDiasVerdes] = useState<number>(loadRacha);
  const [historialCiclos, setHistorialCiclos] = useState<CicloCerrado[]>(loadHistorialCiclos);

  // Estados de interfaz y modales
  const [tabActiva, setTabActiva] = useState<TabType>('inicio');
  const [modalAjustesAbierto, setModalAjustesAbierto] = useState(false);
  const [modalNuevaTxAbierto, setModalNuevaTxAbierto] = useState(false);
  const [modalRapidoAbierto, setModalRapidoAbierto] = useState(false);
  const [modalImportarCapturaAbierto, setModalImportarCapturaAbierto] = useState(false);
  const [modalCierreCicloAbierto, setModalCierreCicloAbierto] = useState(false);
  const [modalWrappedAbierto, setModalWrappedAbierto] = useState(false);
  const [txParaModificarCategoria, setTxParaModificarCategoria] = useState<TransaccionVariable | null>(null);
  const [toastNotificacion, setToastNotificacion] = useState<ToastData | null>(null);

  // Referencias mutables para el Android Bridge Hook
  const diccionarioRef = useRef(diccionario);
  const categoriasRef = useRef(categorias);
  const pendingModifyTxIdRef = useRef<string | null>(null);
  const ultimosGastosDetectadosRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    diccionarioRef.current = diccionario;
  }, [diccionario]);

  useEffect(() => {
    categoriasRef.current = categorias;
  }, [categorias]);

  // 2. Persistencia reactiva a localStorage
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  useEffect(() => {
    saveGastosFijos(gastosFijos);
  }, [gastosFijos]);

  useEffect(() => {
    saveCategorias(categorias);
  }, [categorias]);

  useEffect(() => {
    saveTransacciones(transacciones);
  }, [transacciones]);

  useEffect(() => {
    saveDiccionario(diccionario);
  }, [diccionario]);

  useEffect(() => {
    saveNotificacionesCrudas(notificacionesCrudas);
  }, [notificacionesCrudas]);

  useEffect(() => {
    saveHucha(hucha);
  }, [hucha]);

  useEffect(() => {
    saveRacha(rachaDiasVerdes);
  }, [rachaDiasVerdes]);

  useEffect(() => {
    saveHistorialCiclos(historialCiclos);
  }, [historialCiclos]);

  // 3. Motor de cálculo de nómina y ciclo en tiempo real (con impacto de Hucha)
  const resumen = useMemo(() => {
    return calcularResumenFinanciero(
      config.ingresosMensuales,
      config.objetivoAhorro,
      gastosFijos,
      transacciones,
      config.mesActual,
      config.diaInicioCiclo || 10,
      hucha
    );
  }, [
    config.ingresosMensuales,
    config.objetivoAhorro,
    config.mesActual,
    config.diaInicioCiclo,
    gastosFijos,
    transacciones,
    hucha,
  ]);

  // Racha verde activa calculada/sincronizada
  const rachaActiva = useMemo(() => {
    return calcularRachaDiasVerdes(
      transacciones,
      resumen.ciclo,
      resumen.asignacionDiariaHoy,
      rachaDiasVerdes
    );
  }, [transacciones, resumen.ciclo, resumen.asignacionDiariaHoy, rachaDiasVerdes]);

  // Transacciones pendientes para la bandeja 1-Toque
  const transaccionesPendientes = useMemo(() => {
    return transacciones.filter((tx) => !tx.confirmado);
  }, [transacciones]);

  // Manejadores de Ciclo y Presupuesto
  const handleCambiarMes = (nuevoMes: string) => {
    setConfig((prev) => ({ ...prev, mesActual: nuevoMes }));
  };

  const handleGuardarConfig = (nuevaConfig: ConfiguracionMensual) => {
    const diaModificado = nuevaConfig.diaInicioCiclo !== config.diaInicioCiclo;
    const configFinal = diaModificado
      ? { ...nuevaConfig, mesActual: obtenerCicloActivoHoy(nuevaConfig.diaInicioCiclo) }
      : nuevaConfig;
    setConfig(configFinal);
  };

  const handleResetearValores = () => {
    resetToDefaults();
    setConfig(DEFAULT_CONFIG);
    setGastosFijos([]);
    setCategorias(DEFAULT_CATEGORIAS);
    setTransacciones([]);
    setDiccionario(DEFAULT_DICCIONARIO);
    setNotificacionesCrudas([]);
    setHucha(DEFAULT_HUCHA);
    setRachaDiasVerdes(0);
    setHistorialCiclos([]);
  };

  // Manejadores de Transacciones
  const handleNuevaTransaccion = (nueva: Omit<TransaccionVariable, 'id'>) => {
    const nuevaTx: TransaccionVariable = {
      ...nueva,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    setTransacciones((prev) => [nuevaTx, ...prev]);
  };

  const handleEditarTransaccion = (txActualizada: TransaccionVariable) => {
    setTransacciones((prev) =>
      prev.map((t) => (t.id === txActualizada.id ? txActualizada : t))
    );
  };

  const handleEliminarTransaccion = (id: string) => {
    setTransacciones((prev) => prev.filter((tx) => tx.id !== id));
  };

  // Confirmación en 1-Toque con Autoaprendizaje
  const handleConfirmarConCategoria = (
    txId: string,
    categoriaId: string,
    nombreComercio: string
  ) => {
    vibrate(15);
    // 1. Confirmar la transacción
    setTransacciones((prev) =>
      prev.map((t) =>
        t.id === txId ? { ...t, categoriaId, confirmado: true } : t
      )
    );

    // 2. Autoaprendizaje: asociar palabra clave al diccionario
    const palabraClave = extraerPalabraClaveParaAprender(nombreComercio);
    if (palabraClave) {
      setDiccionario((prev) => {
        const existente = prev[palabraClave];
        if (existente && typeof existente === 'object') {
          return {
            ...prev,
            [palabraClave]: {
              ...existente,
              categoriaId,
            },
          };
        }
        return {
          ...prev,
          [palabraClave]: categoriaId,
        };
      });
    }
  };

  // Simulación y procesado de notificaciones bancarias
  const handleSimularTextoNotificacion = useCallback((texto: string, packageName?: string) => {
    // 1. Registrar en lista de notificaciones crudas para auditoría en Ajustes
    setNotificacionesCrudas((prev) => [
      {
        id: `raw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        texto,
        packageName: packageName || 'ee.swedbank.mobile',
      },
      ...prev,
    ].slice(0, 10));

    // 2. Procesar con el motor inteligente
    const parsed = procesarTextoNotificacion(
      texto,
      diccionarioRef.current,
      categoriasRef.current
    );
    const catEncontrada = categoriasRef.current.find((c) => c.id === parsed.categoriaId);

    const nuevaTx: TransaccionVariable = {
      id: `tx-noti-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      fecha: new Date().toISOString(),
      importe: parsed.importe,
      tipo: parsed.tipo,
      comercio: parsed.comercio,
      categoriaId: parsed.categoriaId,
      confirmado: false, // para revisión en bandeja de 1 toque
      origenNotificacion: true,
    };

    setTransacciones((prev) => [nuevaTx, ...prev]);

    // 3. Disparar aviso tipo toast
    setToastNotificacion({
      id: nuevaTx.id,
      comercio: parsed.comercio,
      importe: parsed.importe,
      tipo: parsed.tipo,
      categoriaNombre: catEncontrada ? catEncontrada.nombre : 'Sin clasificar',
      categoriaSugerida: parsed.categoriaSugerida,
    });
  }, []);

  // 3.1 MOTOR DE ROLLOVER AUTOMÁTICO AL FINALIZAR EL DÍA (HUCHA KONTO)
  const ejecutarVerificacionRollover = useCallback(
    (notificar = true) => {
      setHucha((prevHucha) => {
        const res = ejecutarRolloverDiarioAutomatico(
          config,
          gastosFijos,
          transacciones,
          prevHucha,
          rachaDiasVerdes
        );

        if (res.huboCambios) {
          if (res.totalAportado > 0) {
            setRachaDiasVerdes(res.nuevaRacha);
            if (notificar) {
              setToastNotificacion({
                id: `toast-rollover-${Date.now()}`,
                comercio: 'Hucha Konto (Fin del día)',
                importe: res.totalAportado,
                tipo: 'ingreso',
                categoriaNombre: 'Rollover automático nocturno',
                categoriaSugerida: false,
              });
              vibrate(25);
              if (
                typeof window !== 'undefined' &&
                window.AndroidBridge &&
                typeof window.AndroidBridge.showRolloverNotification === 'function'
              ) {
                window.AndroidBridge.showRolloverNotification(
                  res.totalAportado,
                  res.diasProcesados.join(', ')
                );
              }
            }
          }
          return res.nuevoEstadoHucha;
        }
        return prevHucha;
      });
    },
    [config, gastosFijos, transacciones, rachaDiasVerdes]
  );

  const handleToggleAutoRollover = (habilitado: boolean) => {
    setHucha((prev) => ({
      ...prev,
      autoRolloverHabilitado: habilitado,
    }));
  };

  const handleEjecutarRolloverManual = () => {
    const res = ejecutarRolloverDiarioAutomatico(
      config,
      gastosFijos,
      transacciones,
      hucha,
      rachaDiasVerdes
    );

    if (res.huboCambios && res.totalAportado > 0) {
      setHucha(res.nuevoEstadoHucha);
      setRachaDiasVerdes(res.nuevaRacha);
      setToastNotificacion({
        id: `toast-rollover-manual-${Date.now()}`,
        comercio: 'Hucha Konto',
        importe: res.totalAportado,
        tipo: 'ingreso',
        categoriaNombre: 'Rollover completado',
        categoriaSugerida: false,
      });
      vibrate(25);
    } else {
      setToastNotificacion({
        id: `toast-rollover-aldia-${Date.now()}`,
        comercio: 'Hucha Konto al día',
        importe: 0,
        tipo: 'ingreso',
        categoriaNombre: 'No hay sobrantes pendientes de días anteriores',
        categoriaSugerida: false,
      });
    }
  };

  // 1. RECEPTOR POR URL PARAMETERS Y ATAJOS DE ANDROID (App Shortcuts & Notificaciones)
  useEffect(() => {
    try {
      const search = window.location.search;
      if (search) {
        const urlParams = new URLSearchParams(search);

        // Atajo de Android: Nuevo Gasto Rápido (?action=new_expense)
        if (urlParams.get('action') === 'new_expense') {
          setModalRapidoAbierto(true);
          urlParams.delete('action');
        }

        // Parámetro de notificación (?notif=...)
        const notifParam = urlParams.get('notif');
        if (notifParam) {
          const decoded = decodeURIComponent(notifParam);
          urlParams.delete('notif');
          if (decoded.trim()) {
            setTimeout(() => {
              handleSimularTextoNotificacion(decoded.trim(), 'url-parameter');
            }, 0);
          }
        }

        // Limpiar parámetros procesados de la URL sin recargar
        const newSearch = urlParams.toString();
        const cleanUrl =
          window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.error('Error al procesar parámetros de URL:', e);
    }

    // Receptor global para atajos cuando la app ya estaba abierta (onNewIntent)
    window.onKontoShortcutTriggered = (action: string) => {
      if (action === 'new_expense') {
        setModalRapidoAbierto(true);
      }
    };

    return () => {
      delete window.onKontoShortcutTriggered;
    };
  }, [handleSimularTextoNotificacion]);

  // 1.1 CONTROL DE GESTO / BOTÓN ATRÁS DE ANDROID PARA MODALES
  const algunModalAbierto =
    modalRapidoAbierto ||
    modalAjustesAbierto ||
    modalNuevaTxAbierto ||
    modalImportarCapturaAbierto ||
    modalCierreCicloAbierto ||
    modalWrappedAbierto ||
    txParaModificarCategoria !== null;

  const historyPushedRef = useRef(false);

  useEffect(() => {
    if (algunModalAbierto) {
      if (!historyPushedRef.current) {
        window.history.pushState({ modalOpen: true }, '');
        historyPushedRef.current = true;
      }
    } else {
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        if (window.history.state && window.history.state.modalOpen) {
          window.history.back();
        }
      }
    }
  }, [algunModalAbierto]);

  useEffect(() => {
    const handlePopState = () => {
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        setModalRapidoAbierto(false);
        setModalAjustesAbierto(false);
        setModalNuevaTxAbierto(false);
        setModalImportarCapturaAbierto(false);
        setModalCierreCicloAbierto(false);
        setModalWrappedAbierto(false);
        setTxParaModificarCategoria(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // 1.2 SINCRONIZACIÓN DE CATEGORÍAS Y DICCIONARIO A ANDROID NATIVO
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.syncCategoriesAndDictionary) {
      try {
        window.AndroidBridge.syncCategoriesAndDictionary(
          JSON.stringify(categorias),
          JSON.stringify(diccionario)
        );
      } catch (e) {
        console.warn('Error sincronizando categorías con Android:', e);
      }
    }
  }, [categorias, diccionario]);

  // 4. PUENTE GLOBAL PARA ANDROID (Bridge Hook)
  useEffect(() => {
    window.onBankNotificationReceived = (title = '', text = '', packageName = '') => {
      const lowerTitle = title.toLowerCase();
      const esPrefijoBanco =
        lowerTitle.includes('swedbank') ||
        lowerTitle.includes('banco') ||
        lowerTitle.includes('notification');

      let combined = text;
      // Combinar inteligentemente solo si title aporta información no redundante
      if (title && !esPrefijoBanco && !text.toLowerCase().includes(lowerTitle)) {
        combined = `${title}. ${text}`;
      }
      if (!combined.trim() && title.trim()) {
        combined = title.trim();
      }

      if (combined.trim()) {
        handleSimularTextoNotificacion(combined.trim(), packageName || 'ee.swedbank.mobile');
      }
    };

    // Gasto detectado enriquecido desde Android
    window.onKontoExpenseDetected = (data: GastoDetectadoPayload) => {
      // Evitar duplicados rápidos en React dentro de 10s
      const key = `${data.importe.toFixed(2)}_${data.comercio.toUpperCase()}`;
      const ahora = Date.now();
      const previo = ultimosGastosDetectadosRef.current.get(key) || 0;
      if (ahora - previo < 10000) {
        return;
      }
      ultimosGastosDetectadosRef.current.set(key, ahora);

      const nuevaTx: TransaccionVariable = {
        id: data.id,
        fecha: new Date().toISOString(),
        importe: data.importe,
        tipo: 'gasto',
        comercio: data.comercio,
        categoriaId: data.categoriaId,
        confirmado: Boolean(data.confirmado),
        origenNotificacion: true,
      };

      setTransacciones((prev) => {
        if (prev.some((t) => t.id === data.id)) return prev;
        return [nuevaTx, ...prev];
      });

      // Si el usuario pulsó "Modificar" y el modal estaba pendiente de esta tx
      if (pendingModifyTxIdRef.current === data.id) {
        setTxParaModificarCategoria(nuevaTx);
        pendingModifyTxIdRef.current = null;
      }

      setToastNotificacion({
        id: data.id,
        comercio: data.comercio,
        importe: data.importe,
        tipo: 'gasto',
        categoriaNombre: data.categoriaNombre,
        categoriaSugerida: true,
      });
    };

    // Confirmación rápida desde acción de la notificación ("✓ Aceptar")
    window.onKontoNotificationConfirmed = (txId: string) => {
      vibrate(20);
      setTransacciones((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, confirmado: true } : t))
      );
    };

    // Abrir modal de modificar categoría desde acción ("✎ Modificar")
    window.onKontoOpenModifyCategory = (txId: string) => {
      pendingModifyTxIdRef.current = txId;
      setTransacciones((prev) => {
        const encontrada = prev.find((t) => t.id === txId);
        if (encontrada) {
          setTxParaModificarCategoria(encontrada);
          pendingModifyTxIdRef.current = null;
        }
        return prev;
      });
    };

    // Confirmaciones acumuladas offline
    window.onKontoBatchConfirmTransactions = (txIds: string[]) => {
      if (!txIds || txIds.length === 0) return;
      const setIds = new Set(txIds);
      setTransacciones((prev) =>
        prev.map((t) => (setIds.has(t.id) ? { ...t, confirmado: true } : t))
      );
    };

    // Verificación de rollover invocada desde Android onResume
    window.onKontoCheckRollover = () => {
      ejecutarVerificacionRollover(true);
    };

    return () => {
      delete window.onBankNotificationReceived;
      delete window.onKontoExpenseDetected;
      delete window.onKontoNotificationConfirmed;
      delete window.onKontoOpenModifyCategory;
      delete window.onKontoBatchConfirmTransactions;
      delete window.onKontoCheckRollover;
    };
  }, [handleSimularTextoNotificacion, ejecutarVerificacionRollover]);

  // 4.1 EJECUCIÓN DEL ROLLOVER AUTOMÁTICO EN ARRANQUE
  useEffect(() => {
    ejecutarVerificacionRollover(true);
  }, [ejecutarVerificacionRollover]);

  // 4.2 PLANIFICADOR EXACTO DE CIERRE DE DÍA A MEDIANOCHE (00:00:02)
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const programarProximoCierreMedianoche = () => {
      const ahora = new Date();
      const manana = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate() + 1,
        0,
        0,
        2
      );
      const msHastaMedianoche = Math.max(1000, manana.getTime() - ahora.getTime());

      timerId = setTimeout(() => {
        ejecutarVerificacionRollover(true);
        programarProximoCierreMedianoche();
      }, msHastaMedianoche);
    };

    programarProximoCierreMedianoche();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [ejecutarVerificacionRollover]);

  // 4.3 DETECTOR DE CAMBIO DE DÍA AL VOLVER A LA APP (REACTIVACIÓN / FOCO)
  useEffect(() => {
    const handleReactivacion = () => {
      if (document.visibilityState === 'visible') {
        ejecutarVerificacionRollover(true);
      }
    };

    window.addEventListener('visibilitychange', handleReactivacion);
    window.addEventListener('focus', handleReactivacion);

    return () => {
      window.removeEventListener('visibilitychange', handleReactivacion);
      window.removeEventListener('focus', handleReactivacion);
    };
  }, [ejecutarVerificacionRollover]);

  const handleGuardarReglaDiccionario = (
    palabraClave: string,
    regla: string | ReglaMapeo
  ) => {
    setDiccionario((prev) => ({
      ...prev,
      [palabraClave.trim().toUpperCase()]: regla,
    }));
  };

  const handleEliminarReglaDiccionario = (palabraClave: string) => {
    setDiccionario((prev) => {
      const copy = { ...prev };
      delete copy[palabraClave];
      return copy;
    });
  };

  const handleRestablecerReglasDiccionario = () => {
    setDiccionario(DEFAULT_DICCIONARIO);
  };

  // Manejadores de Categorías Personalizadas
  const handleGuardarCategoria = (
    catData: Omit<CategoriaVariable, 'id'>,
    idExistente?: string
  ) => {
    if (idExistente) {
      setCategorias((prev) =>
        prev.map((c) => (c.id === idExistente ? { ...catData, id: idExistente } : c))
      );
    } else {
      const nuevaCat: CategoriaVariable = {
        ...catData,
        id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      setCategorias((prev) => [...prev, nuevaCat]);
    }
  };

  const handleEliminarCategoria = (id: string) => {
    if (categorias.length <= 1) return;
    setCategorias((prev) => prev.filter((c) => c.id !== id));
  };

  // Manejador de Backup Completo JSON
  const handleImportarBackupCompleto = (data: {
    config?: ConfiguracionMensual;
    gastosFijos?: GastoFijo[];
    categorias?: CategoriaVariable[];
    transacciones?: TransaccionVariable[];
    diccionario?: DiccionarioReglas;
    hucha?: EstadoHucha;
    rachaDiasVerdes?: number;
    historialCiclos?: CicloCerrado[];
  }) => {
    if (data.config) setConfig(data.config);
    if (data.gastosFijos) setGastosFijos(data.gastosFijos);
    if (data.categorias) setCategorias(data.categorias);
    if (data.transacciones) setTransacciones(data.transacciones);
    if (data.diccionario) setDiccionario(data.diccionario);
    if (data.hucha) setHucha(data.hucha);
    if (typeof data.rachaDiasVerdes === 'number') setRachaDiasVerdes(data.rachaDiasVerdes);
    if (data.historialCiclos) setHistorialCiclos(data.historialCiclos);
  };

  // Manejador de Cierre de Ciclo del Día 9
  const handleConfirmarCierreCiclo = (nuevoCiclo: CicloCerrado) => {
    // 1. Archivar en historial
    setHistorialCiclos((prev) => [nuevoCiclo, ...prev]);

    // 2. Reiniciar los checks de gastos fijos para el nuevo ciclo
    setGastosFijos((prev) => prev.map((g) => ({ ...g, pagado: false })));

    // 3. Avanzar al siguiente mes de ciclo (ej. 2026-10 -> 2026-11)
    const [y, m] = config.mesActual.split('-').map(Number);
    const siguienteFecha = new Date(y, m, 1);
    const siguienteMes = `${siguienteFecha.getFullYear()}-${String(
      siguienteFecha.getMonth() + 1
    ).padStart(2, '0')}`;
    setConfig((prev) => ({ ...prev, mesActual: siguienteMes }));

    // 4. Feedback toast
    setToastNotificacion({
      id: `toast-cierre-${Date.now()}`,
      comercio: '¡Ciclo Archivado con Éxito!',
      importe: nuevoCiclo.ahorroRealConseguido,
      tipo: 'ingreso',
      categoriaNombre: 'Historial Konto (Nuevo Ciclo 10 al 9)',
      categoriaSugerida: false,
    });
  };

  const handleGenerarCiclosEjemplo = () => {
    const demos = generarCiclosEjemplo();
    setHistorialCiclos((prev) => {
      const idsExistentes = new Set(prev.map((c) => c.id));
      const nuevos = demos.filter((d) => !idsExistentes.has(d.id));
      return [...nuevos, ...prev];
    });
  };

  // Manejadores de Hucha Konto y Rollover Gamificado
  const handleGuardarSobranteHucha = (importe: number) => {
    if (importe <= 0) return;
    const nuevoMov: MovimientoHucha = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fecha: new Date().toISOString(),
      tipo: 'ingreso',
      importe: Math.round(importe * 100) / 100,
      concepto: 'Sobrante diario guardado',
      ciclo: config.mesActual,
    };

    setHucha((prev) => ({
      saldo: Math.round((prev.saldo + nuevoMov.importe) * 100) / 100,
      historial: [nuevoMov, ...prev.historial],
    }));

    setRachaDiasVerdes((prev) => Math.max(prev + 1, rachaActiva + 1));
  };

  const handleRetirarHucha = (importe: number, concepto: string) => {
    if (importe <= 0) return;
    const importeReal = Math.min(importe, hucha.saldo);
    const nuevoMov: MovimientoHucha = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fecha: new Date().toISOString(),
      tipo: 'retirada',
      importe: Math.round(importeReal * 100) / 100,
      concepto: concepto || 'Retirada a presupuesto disponible',
      ciclo: config.mesActual,
    };

    setHucha((prev) => ({
      saldo: Math.max(0, Math.round((prev.saldo - importeReal) * 100) / 100),
      historial: [nuevoMov, ...prev.historial],
    }));
  };

  // Manejador del Modo Supervivencia (Reajuste automático de categorías)
  const handleReajustarPresupuestosSupervivencia = (nuevasCategorias: CategoriaVariable[]) => {
    setCategorias(nuevasCategorias);
  };

  // Manejadores de Gastos Fijos y Periódicos
  const handleTogglePagadoFijo = (id: string) => {
    vibrate(15);
    setGastosFijos((prev) =>
      prev.map((g) => (g.id === id ? { ...g, pagado: !g.pagado } : g))
    );
  };

  const handleToggleTocaEsteMesFijo = (id: string) => {
    setGastosFijos((prev) =>
      prev.map((g) => (g.id === id ? { ...g, tocaEsteMes: !g.tocaEsteMes } : g))
    );
  };

  const handleCambiarModoCalculoFijo = (
    id: string,
    nuevoModo: 'prorrateado' | 'mes_cobro'
  ) => {
    setGastosFijos((prev) =>
      prev.map((g) => (g.id === id ? { ...g, modoCalculo: nuevoModo } : g))
    );
  };

  const handleReiniciarChecksCiclo = () => {
    setGastosFijos((prev) => prev.map((g) => ({ ...g, pagado: false })));
  };

  const handleGuardarGastoFijo = (
    gastoData: Omit<GastoFijo, 'id'>,
    idExistente?: string
  ) => {
    if (idExistente) {
      setGastosFijos((prev) =>
        prev.map((g) => {
          if (g.id !== idExistente) return g;
          // Si el usuario edita el importe hacia arriba, guardamos automáticamente el importe previo
          const subida = gastoData.importeTotal > g.importeTotal;
          const importeAnterior = subida ? g.importeTotal : g.importeAnterior;
          return {
            ...gastoData,
            id: idExistente,
            importeAnterior,
          };
        })
      );
    } else {
      const nuevoFijo: GastoFijo = {
        ...gastoData,
        id: `fijo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      setGastosFijos((prev) => [...prev, nuevoFijo]);
    }
  };

  const handleEliminarGastoFijo = (id: string) => {
    setGastosFijos((prev) => prev.filter((g) => g.id !== id));
  };

  const handleCerrarToast = useCallback(() => {
    setToastNotificacion(null);
  }, []);

  const handleImportarTransacciones = useCallback((nuevasTx: TransaccionVariable[]) => {
    setTransacciones((prev) => {
      const actualizadas = [...nuevasTx, ...prev];
      saveTransacciones(actualizadas);
      return actualizadas;
    });
  }, []);

  const handleMarcarFijosPagados = useCallback((fijosIds: string[]) => {
    if (!fijosIds || fijosIds.length === 0) return;
    setGastosFijos((prev) => {
      const actualizados = prev.map((fijo) =>
        fijosIds.includes(fijo.id) ? { ...fijo, pagado: true } : fijo
      );
      saveGastosFijos(actualizados);
      return actualizados;
    });
  }, []);

  const handleActualizarNombreTitular = useCallback((nombreTitular: string) => {
    setConfig((prev) => {
      const actualizadas = { ...prev, nombreTitular };
      saveConfig(actualizadas);
      return actualizadas;
    });
  }, []);

  // Determinar si hoy es el último día del ciclo (Día 9)
  const esDiaDeCierre = resumen.diasRestantesCiclo <= 1;

  return (
    <div className="min-h-screen bg-black flex justify-center selection:bg-emerald-500 selection:text-zinc-950 font-sans">
      {/* Toast Flotante de Notificación Bancaria */}
      <NotificationToast
        toast={toastNotificacion}
        onCerrar={handleCerrarToast}
        onVerEnInicio={() => {
          setTabActiva('inicio');
          setToastNotificacion(null);
        }}
      />

      {/* Contenedor móvil centrado máximo 430px */}
      <div className="w-full max-w-[430px] min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative shadow-[0_0_60px_rgba(0,0,0,0.9)] border-x border-zinc-900/80">
        {/* Cabecera persistente con etiqueta de ciclo de nómina */}
        <Header
          nombreApp={config.nombreApp || 'Konto'}
          mesActual={config.mesActual}
          etiquetaRangoCiclo={resumen.ciclo.etiquetaRango}
          diasRestantesCiclo={resumen.diasRestantesCiclo}
          onCambiarMes={handleCambiarMes}
          onAbrirAjustesRapidos={() => setModalAjustesAbierto(true)}
        />

        {/* Contenido principal según la pestaña activa */}
        <main className="flex-1 px-4 py-4 space-y-4">
          {tabActiva === 'inicio' && (
            <>
              {/* Radar de Suscripciones y Avisos de Cancelación */}
              <RadarSuscripcionesBanner
                gastosFijos={gastosFijos}
                onAbrirFijos={() => setTabActiva('fijos')}
              />

              {/* Bandeja de Notificaciones Pendientes de Confirmar (solo si hay pendientes) */}
              <PendingNotificationsInbox
                transaccionesPendientes={transaccionesPendientes}
                categorias={categorias}
                onConfirmarConCategoria={handleConfirmarConCategoria}
                onDescartarNotificacion={handleEliminarTransaccion}
              />

              {/* Tarjeta Principal Destacada: Safe-to-Spend & Desglose */}
              <MainHeroCard
                resumen={resumen}
                onAbrirFijos={() => setTabActiva('fijos')}
                onAbrirAjustes={() => setModalAjustesAbierto(true)}
              />

              {/* 1. SIMULADOR RÁPIDO "¿ME LO PUEDO PERMITIR?" */}
              <SimuladorPermitir resumen={resumen} />

              {/* 3. HUCHA DE SOBRANTE DIARIO (ROLLOVER GAMIFICADO) */}
              <HuchaCard
                hucha={hucha}
                rachaDiasVerdes={rachaActiva}
                disponibleHoy={resumen.disponibleHoy}
                asignacionDiariaHoy={resumen.asignacionDiariaHoy}
                gastadoHoy={resumen.gastadoHoy}
                onGuardarSobrante={handleGuardarSobranteHucha}
                onRetirarHucha={handleRetirarHucha}
                onToggleAutoRollover={handleToggleAutoRollover}
              />

              {/* CIERRE Y RESUMEN DEL DÍA 9 (HISTORIAL DE CICLOS) */}
              {esDiaDeCierre ? (
                <div
                  onClick={() => setModalCierreCicloAbierto(true)}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600/30 via-teal-900/40 to-zinc-900 border border-emerald-500/50 shadow-lg shadow-emerald-950/40 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] animate-pulse"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                      <CalendarCheck2 size={16} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        ¡Hoy es Día 9 • Fin de Ciclo!
                      </div>
                      <div className="text-xs font-bold text-white">
                        Hacer Resumen del Día 9 y Guardar Historial
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-300">Cerrar →</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalCierreCicloAbierto(true)}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <CalendarCheck2 size={13} className="text-indigo-400" />
                  <span>Cerrar ciclo actual / Resumen del Día 9 (Previsualizar)</span>
                </button>
              )}

              {/* Barra de progreso horizontal del Presupuesto Variable con marcador del día de ciclo */}
              <BudgetProgressBar
                gastado={resumen.gastadoVariableAcumulado}
                totalPresupuesto={resumen.presupuestoVariableTotal}
                porcentajeMesTranscurrido={resumen.porcentajeCicloTranscurrido}
                diaActual={resumen.diaEnCiclo}
                diasTotalesMes={resumen.diasTotalesCiclo}
                estadoRitmo={resumen.estadoRitmoPresupuesto}
              />

              {/* Acciones Rápidas: Gasto Rápido y Captura Bancaria */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalRapidoAbierto(true)}
                  className="flex items-center justify-center gap-2 py-3 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-950/40 transition active:scale-[0.98] cursor-pointer"
                >
                  <Plus size={16} /> Gasto Rápido
                </button>
                <button
                  type="button"
                  onClick={() => setModalImportarCapturaAbierto(true)}
                  className="flex items-center justify-center gap-2 py-3 px-3.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 font-semibold text-xs rounded-2xl transition active:scale-[0.98] cursor-pointer"
                >
                  <Camera size={16} className="text-emerald-400" /> Importar Captura
                </button>
              </div>

              {/* 2. MODO SUPERVIVENCIA (REAJUSTE AUTOMÁTICO DE CATEGORÍAS) */}
              <ModoSupervivenciaBanner
                categorias={categorias}
                transacciones={transacciones}
                ciclo={resumen.ciclo}
                onReajustarPresupuestos={handleReajustarPresupuestosSupervivencia}
              />

              {/* Lista de las Categorías Variables con marcador de ritmo */}
              <CategoriesList
                categorias={categorias}
                transacciones={transacciones}
                ciclo={resumen.ciclo}
              />

              {/* Lista de Últimos Movimientos con edición y borrado rápido */}
              <RecentTransactions
                transacciones={transacciones}
                categorias={categorias}
                onNuevaTransaccion={() => setModalRapidoAbierto(true)}
                onEditarTransaccion={handleEditarTransaccion}
                onEliminarTransaccion={handleEliminarTransaccion}
              />
            </>
          )}

          {tabActiva === 'analisis' && (
            <AnalysisView
              transacciones={transacciones}
              categorias={categorias}
              resumen={resumen}
              historialCiclos={historialCiclos}
              onEditarTransaccion={handleEditarTransaccion}
              onAbrirWrapped={() => setModalWrappedAbierto(true)}
              onAbrirCierreCiclo={() => setModalCierreCicloAbierto(true)}
              onGenerarCiclosEjemplo={handleGenerarCiclosEjemplo}
            />
          )}

          {tabActiva === 'fijos' && (
            <FixedExpensesView
              gastosFijos={gastosFijos}
              onTogglePagado={handleTogglePagadoFijo}
              onToggleTocaEsteMes={handleToggleTocaEsteMesFijo}
              onCambiarModoCalculo={handleCambiarModoCalculoFijo}
              onReiniciarChecksCiclo={handleReiniciarChecksCiclo}
              onGuardarGastoFijo={handleGuardarGastoFijo}
              onEliminarGastoFijo={handleEliminarGastoFijo}
              onVolverAInicio={() => setTabActiva('inicio')}
            />
          )}

          {tabActiva === 'ajustes' && (
            <SettingsView
              config={config}
              categorias={categorias}
              gastosFijos={gastosFijos}
              transacciones={transacciones}
              diccionario={diccionario}
              notificacionesCrudas={notificacionesCrudas}
              presupuestoVariableTotal={resumen.presupuestoVariableTotal}
              hucha={hucha}
              rachaDiasVerdes={rachaActiva}
              historialCiclos={historialCiclos}
              onAbrirAjustesRapidos={() => setModalAjustesAbierto(true)}
              onAbrirImportarCaptura={() => setModalImportarCapturaAbierto(true)}
              onAbrirCierreCiclo={() => setModalCierreCicloAbierto(true)}
              onGuardarCategoria={handleGuardarCategoria}
              onEliminarCategoria={handleEliminarCategoria}
              onGuardarRegla={handleGuardarReglaDiccionario}
              onEliminarRegla={handleEliminarReglaDiccionario}
              onRestablecerReglas={handleRestablecerReglasDiccionario}
              onImportarBackupCompleto={handleImportarBackupCompleto}
              onResetearTodo={handleResetearValores}
              onVolverAInicio={() => setTabActiva('inicio')}
              onToggleAutoRollover={handleToggleAutoRollover}
              onEjecutarRolloverManual={handleEjecutarRolloverManual}
            />
          )}
        </main>

        {/* Botón Flotante (+) para Teclado Rápido de 3 Segundos */}
        <FloatingAddButton onClick={() => setModalRapidoAbierto(true)} />

        {/* Barra de Navegación Inferior Fija (4 pestañas) */}
        <BottomNav tabActiva={tabActiva} onCambiarTab={setTabActiva} />

        {/* Modal Ultra Rápido (Bottom Sheet) de 3 Segundos con Teclado Numérico de Pulgar */}
        <QuickExpenseSheet
          abierto={modalRapidoAbierto}
          categorias={categorias}
          onCerrar={() => setModalRapidoAbierto(false)}
          onGuardar={handleNuevaTransaccion}
        />

        {/* Modal Ajustes Rápidos de Nómina y Presupuesto */}
        <QuickSettingsModal
          abierto={modalAjustesAbierto}
          config={config}
          onCerrar={() => setModalAjustesAbierto(false)}
          onGuardar={handleGuardarConfig}
          onResetearValores={handleResetearValores}
        />

        {/* Modal Clásico Alternativo para Transacción Detallada */}
        <AddTransactionModal
          abierto={modalNuevaTxAbierto}
          categorias={categorias}
          onCerrar={() => setModalNuevaTxAbierto(false)}
          onGuardar={handleNuevaTransaccion}
        />

        {/* Modal de Importación de Gastos desde Captura de Pantalla Bancaria */}
        <ScreenshotImportModal
          abierto={modalImportarCapturaAbierto}
          onCerrar={() => setModalImportarCapturaAbierto(false)}
          categorias={categorias}
          reglas={diccionario}
          gastosFijos={gastosFijos}
          nombreTitularInicial={config.nombreTitular}
          onImportarTransacciones={handleImportarTransacciones}
          onMarcarFijosPagados={handleMarcarFijosPagados}
          onGuardarRegla={handleGuardarReglaDiccionario}
          onActualizarNombreTitular={handleActualizarNombreTitular}
        />

        {/* Modal de Resumen de Cierre de Ciclo del Día 9 */}
        <CierreCicloModal
          abierto={modalCierreCicloAbierto}
          onCerrar={() => setModalCierreCicloAbierto(false)}
          resumen={resumen}
          categorias={categorias}
          transacciones={transacciones}
          hucha={hucha}
          rachaDiasVerdes={rachaActiva}
          esDiaDeCierreReal={esDiaDeCierre}
          onConfirmarCierreCiclo={handleConfirmarCierreCiclo}
        />

        {/* Modal Especial de Konto Wrapped (Informe Anual de Alto Impacto) */}
        <KontoWrappedModal
          abierto={modalWrappedAbierto}
          onCerrar={() => setModalWrappedAbierto(false)}
          historialCiclos={historialCiclos}
          transacciones={transacciones}
          resumenActual={resumen}
          onGenerarCiclosEjemplo={handleGenerarCiclosEjemplo}
        />

        {/* Modal Interactivo para Modificar Categoría de Gasto Detectado */}
        <ModifyCategoryModal
          transaccion={txParaModificarCategoria}
          categorias={categorias}
          onCerrar={() => setTxParaModificarCategoria(null)}
          onAsignarCategoria={handleConfirmarConCategoria}
        />
      </div>
    </div>
  );
}

export default App;
