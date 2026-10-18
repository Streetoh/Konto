import React, { useState, useRef, useEffect } from 'react';
import type {
  ConfiguracionMensual,
  CategoriaVariable,
  GastoFijo,
  TransaccionVariable,
  DiccionarioReglas,
  ReglaMapeo,
  EstadoHucha,
  CicloCerrado,
} from '../types';
import { CategoryIcon } from './CategoryIcon';
import { CategoryModal } from './CategoryModal';
import { formatearMoneda } from '../utils/calculations';
import {
  Settings,
  Sliders,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  FileJson,
  Layers,
  Smartphone,
  Radio,
  BookOpen,
  Trash2,
  Sparkles,
  Search,
  Camera,
  CalendarCheck2,
  BatteryCharging,
  Info,
} from 'lucide-react';
import type { NotificacionCruda } from '../types';

interface Props {
  config: ConfiguracionMensual;
  categorias: CategoriaVariable[];
  gastosFijos: GastoFijo[];
  transacciones: TransaccionVariable[];
  diccionario: DiccionarioReglas;
  notificacionesCrudas: NotificacionCruda[];
  presupuestoVariableTotal: number;
  hucha?: EstadoHucha;
  rachaDiasVerdes?: number;
  historialCiclos?: CicloCerrado[];
  onAbrirAjustesRapidos: () => void;
  onAbrirImportarCaptura?: () => void;
  onAbrirCierreCiclo?: () => void;
  onGuardarCategoria: (cat: Omit<CategoriaVariable, 'id'>, idExistente?: string) => void;
  onEliminarCategoria: (id: string) => void;
  onGuardarRegla: (palabraClave: string, regla: string | ReglaMapeo) => void;
  onEliminarRegla: (palabraClave: string) => void;
  onRestablecerReglas: () => void;
  onImportarBackupCompleto: (data: {
    config?: ConfiguracionMensual;
    gastosFijos?: GastoFijo[];
    categorias?: CategoriaVariable[];
    transacciones?: TransaccionVariable[];
    diccionario?: DiccionarioReglas;
    hucha?: EstadoHucha;
    rachaDiasVerdes?: number;
    historialCiclos?: CicloCerrado[];
  }) => void;
  onResetearTodo: () => void;
  onVolverAInicio: () => void;
}

export const SettingsView: React.FC<Props> = ({
  config,
  categorias,
  gastosFijos,
  transacciones,
  diccionario,
  notificacionesCrudas,
  presupuestoVariableTotal,
  hucha,
  rachaDiasVerdes = 0,
  historialCiclos = [],
  onAbrirAjustesRapidos,
  onAbrirImportarCaptura,
  onAbrirCierreCiclo,
  onGuardarCategoria,
  onEliminarCategoria,
  onGuardarRegla,
  onEliminarRegla,
  onRestablecerReglas,
  onImportarBackupCompleto,
  onResetearTodo,
  onVolverAInicio,
}) => {
  const [modalCategoriaAbierto, setModalCategoriaAbierto] = useState(false);
  const [categoriaAEditar, setCategoriaAEditar] = useState<CategoriaVariable | null>(null);
  const [mostrarModalImportar, setMostrarModalImportar] = useState(false);
  const [textoJsonImportar, setTextoJsonImportar] = useState('');
  const [mensajeImportacion, setMensajeImportacion] = useState<{ texto: string; error: boolean } | null>(null);
  const [mensajeExportacionExito, setMensajeExportacionExito] = useState<string | null>(null);
  const [mostrarConfirmReset, setMostrarConfirmReset] = useState(false);
  const [mensajeResetExitoso, setMensajeResetExitoso] = useState(false);
  const [mensajeAndroid, setMensajeAndroid] = useState<string | null>(null);

  // Estados para el Diccionario de Reglas Aprendidas
  const [nuevaPalabraRegla, setNuevaPalabraRegla] = useState('');
  const [categoriaReglaSeleccionada, setCategoriaReglaSeleccionada] = useState(
    categorias[0]?.id || 'cat-supermercado'
  );
  const [nuevoAliasRegla, setNuevoAliasRegla] = useState('');
  const [gastoFijoAsociadoId, setGastoFijoAsociadoId] = useState('');
  const [filtroReglas, setFiltroReglas] = useState('');

  const handleCrearRegla = (e: React.FormEvent) => {
    e.preventDefault();
    const palabra = nuevaPalabraRegla.trim().toUpperCase();
    if (!palabra) return;
    const alias = nuevoAliasRegla.trim();
    const gastoFijoId = gastoFijoAsociadoId.trim();

    if (alias || gastoFijoId) {
      onGuardarRegla(palabra, {
        categoriaId: categoriaReglaSeleccionada,
        aliasComercio: alias || undefined,
        gastoFijoId: gastoFijoId || undefined,
      });
    } else {
      onGuardarRegla(palabra, categoriaReglaSeleccionada);
    }

    setNuevaPalabraRegla('');
    setNuevoAliasRegla('');
    setGastoFijoAsociadoId('');
  };

  const clavesReglas = Object.keys(diccionario).filter((k) =>
    k.toLowerCase().includes(filtroReglas.toLowerCase())
  );

  const [permisoConcedido, setPermisoConcedido] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.AndroidBridge) {
      if (typeof window.AndroidBridge.isNotificationAccessGranted === 'function') {
        return Boolean(window.AndroidBridge.isNotificationAccessGranted());
      }
      if (typeof window.AndroidBridge.isNotificationPermissionGranted === 'function') {
        return Boolean(window.AndroidBridge.isNotificationPermissionGranted());
      }
    }
    return false;
  });

  useEffect(() => {
    const verificarPermiso = () => {
      if (typeof window !== 'undefined' && window.AndroidBridge) {
        let concedido = false;
        if (typeof window.AndroidBridge.isNotificationAccessGranted === 'function') {
          concedido = Boolean(window.AndroidBridge.isNotificationAccessGranted());
        } else if (typeof window.AndroidBridge.isNotificationPermissionGranted === 'function') {
          concedido = Boolean(window.AndroidBridge.isNotificationPermissionGranted());
        }
        setPermisoConcedido(concedido);
      }
    };

    verificarPermiso();
    window.addEventListener('focus', verificarPermiso);
    window.onPermissionStatusChecked = (granted: boolean) => {
      setPermisoConcedido(Boolean(granted));
    };

    return () => {
      window.removeEventListener('focus', verificarPermiso);
      delete window.onPermissionStatusChecked;
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Comparativa visual de presupuestos
  const sumaPresupuestosCategorias = categorias.reduce(
    (acc, cat) => acc + (Number(cat.presupuesto) || 0),
    0
  );

  const diferenciaPresupuesto = sumaPresupuestosCategorias - presupuestoVariableTotal;
  const haySobreasignacion = diferenciaPresupuesto > 0;
  const porcentajeAsignado =
    presupuestoVariableTotal > 0
      ? (sumaPresupuestosCategorias / presupuestoVariableTotal) * 100
      : 0;

  // 2. Exportación directa a archivo JSON (Descarga directa en Android y Web)
  const handleExportarJson = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const nombreArchivo = `konto_backup_${year}_${month}_${day}.json`;

    const datosBackup = {
      app: 'Konto',
      version: '2.0',
      fechaExportacion: now.toISOString(),
      config,
      gastosFijos,
      categorias,
      transacciones,
      diccionario,
      hucha,
      huchaSobrante: hucha,
      rachaDiasVerdes,
      historialCiclos,
    };

    const jsonStr = JSON.stringify(datosBackup, null, 2);

    // 1. Si estamos en Android nativo, descargar directamente en la carpeta Descargas del móvil
    if (window.AndroidBridge && typeof window.AndroidBridge.downloadJsonFile === 'function') {
      try {
        window.AndroidBridge.downloadJsonFile(nombreArchivo, jsonStr);
        setMensajeExportacionExito(`¡Descargado en tu carpeta de Descargas: ${nombreArchivo}!`);
        setTimeout(() => setMensajeExportacionExito(null), 5000);
        return;
      } catch (e) {
        console.warn('Error llamando downloadJsonFile de AndroidBridge:', e);
      }
    }

    // 2. Descarga directa en navegador web
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMensajeExportacionExito(`¡Archivo descargado: ${nombreArchivo}!`);
      setTimeout(() => setMensajeExportacionExito(null), 5000);
    } catch (e) {
      console.warn('Descarga por Blob no disponible:', e);
    }
  };

  // 3. Importación desde archivo o texto
  const procesarObjetoImportado = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        throw new Error('El archivo no contiene un formato JSON válido.');
      }

      onImportarBackupCompleto({
        config: data.config,
        gastosFijos: data.gastosFijos,
        categorias: data.categorias,
        transacciones: data.transacciones,
        diccionario: data.diccionario,
        hucha: data.hucha || data.huchaSobrante,
        rachaDiasVerdes: data.rachaDiasVerdes,
        historialCiclos: data.historialCiclos,
      });

      setMensajeImportacion({
        texto: '¡Copia de seguridad restaurada correctamente!',
        error: false,
      });

      setTimeout(() => {
        setMostrarModalImportar(false);
        setMensajeImportacion(null);
        setTextoJsonImportar('');
      }, 1500);
    } catch {
      setMensajeImportacion({
        texto: 'Error: El contenido no es un JSON válido de Konto.',
        error: true,
      });
    }
  };

  const handleSubirArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        procesarObjetoImportado(content);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
            <Settings className="text-zinc-400" size={18} />
            <span>Ajustes &amp; Datos</span>
          </h2>
          <p className="text-[11px] text-zinc-400">
            Personalización de categorías, presupuestos y copias de seguridad
          </p>
        </div>
        <button
          onClick={onVolverAInicio}
          className="text-xs text-emerald-400 hover:underline cursor-pointer"
        >
          Volver a Inicio
        </button>
      </div>

      {/* TARJETA: CONEXIÓN CON SWEDBANK (ANDROID) */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-3xl p-4 border border-amber-500/30 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Smartphone size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100">Conexión con Swedbank (Android)</h3>
              <p className="text-[10px] text-zinc-400">Captura automática de notificaciones</p>
            </div>
          </div>

          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            <Radio size={10} className="animate-pulse" />
            <span>{typeof window !== 'undefined' && window.AndroidBridge ? 'Android Nativo' : 'Bridge Web/URL'}</span>
          </span>
        </div>

        {/* Botón Activar Permiso / Estado Concedido */}
        {permisoConcedido ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} className="stroke-[2.5]" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-300">Permiso Activo y Conectado</div>
                <div className="text-[10px] text-zinc-400">Konto está escuchando Swedbank en vivo</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.AndroidBridge?.openNotificationSettings) {
                  window.AndroidBridge.openNotificationSettings();
                }
              }}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer px-2 py-1"
            >
              Ajustes
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.AndroidBridge?.openNotificationSettings) {
                  window.AndroidBridge.openNotificationSettings();
                } else {
                  setMensajeAndroid(
                    'Si estás en la app APK en Android, este botón abrirá la pantalla del sistema. Ruta: Ajustes > Aplicaciones > Acceso especial > Acceso a notificaciones > Activa Konto.'
                  );
                }
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-98 transition cursor-pointer"
            >
              <Smartphone size={14} className="stroke-[2.5]" />
              <span>Activar permiso de lectura de notificaciones</span>
            </button>

            {mensajeAndroid && (
              <div className="mt-2 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[11px] text-zinc-300 leading-relaxed">
                <p>{mensajeAndroid}</p>
                <button
                  type="button"
                  onClick={() => setMensajeAndroid(null)}
                  className="mt-1 text-[10px] text-amber-400 hover:underline cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            )}
          </div>
        )}

        {/* Optimización de Batería y Ajustes Restringidos */}
        <div className="space-y-2 pt-1 border-t border-zinc-800/60">
          <button
            type="button"
            onClick={() => {
              if (window.AndroidBridge && typeof window.AndroidBridge.requestIgnoreBatteryOptimizations === 'function') {
                window.AndroidBridge.requestIgnoreBatteryOptimizations();
              } else {
                alert('Disponible en la app Android para permitir ejecución 24/7 sin que el sistema duerma la escucha de notificaciones.');
              }
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
          >
            <BatteryCharging size={15} className="text-emerald-400" />
            <span>Desactivar ahorro de batería (Mantener activo 24/7)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.AndroidBridge && typeof window.AndroidBridge.openAppInfoSettings === 'function') {
                window.AndroidBridge.openAppInfoSettings();
              }
            }}
            className="w-full py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Info size={13} className="text-zinc-400" />
            <span>Abrir Información de la Aplicación</span>
          </button>

          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-[11px] text-zinc-400 leading-relaxed">
            <span className="font-bold text-zinc-200">ℹ️ En Android 13/14/15:</span> Si el acceso a notificaciones aparece bloqueado en gris, pulsa en <strong className="text-zinc-200">Abrir Información de la Aplicación</strong>, toca los <strong className="text-white">3 puntos superiores (⋮)</strong> y selecciona <strong className="text-emerald-300">«Permitir ajustes restringidos»</strong>.
          </div>
        </div>

        {/* Registro de últimas 3 notificaciones brutas detectadas */}
        <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
          <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>Últimas 3 notificaciones brutas detectadas</span>
            <span className="font-mono text-zinc-500">{notificacionesCrudas.length} total</span>
          </div>

          <div className="space-y-1.5">
            {notificacionesCrudas.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic p-2 bg-zinc-950/70 rounded-xl border border-zinc-900 text-center">
                Aún no han llegado notificaciones brutas desde Android o URL.
              </p>
            ) : (
              notificacionesCrudas.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-2 bg-zinc-950 rounded-xl border border-zinc-800/80 text-[10px] space-y-1 font-mono"
                >
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-amber-400/90 font-semibold">{item.packageName || 'ee.swedbank.mobile'}</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString('es-ES')}</span>
                  </div>
                  <div className="text-zinc-200 break-words leading-tight">
                    {item.texto}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Botón rápido para importar captura de pantalla */}
        {onAbrirImportarCaptura && (
          <div className="pt-2 border-t border-zinc-800/60">
            <button
              type="button"
              onClick={onAbrirImportarCaptura}
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Camera size={14} className="text-emerald-400" />
              <span>Importar movimientos desde Captura de Pantalla</span>
            </button>
          </div>
        )}
      </div>

      {/* SECCIÓN 1: CONFIGURACIÓN GENERAL DEL CICLO */}
      <div className="bg-zinc-900/60 rounded-3xl p-4 border border-zinc-800 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Sliders size={14} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100">Parámetros del Ciclo de Nómina</h3>
              <p className="text-[10px] text-zinc-400">Día de cobro y reservas</p>
            </div>
          </div>

          <button
            onClick={onAbrirAjustesRapidos}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer bg-zinc-800/80 px-2.5 py-1 rounded-xl border border-zinc-700/60"
          >
            <Pencil size={12} />
            <span>Editar</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/70">
            <span className="text-[10px] text-zinc-400 uppercase font-medium">Ciclo Salarial</span>
            <div className="font-bold text-zinc-200 mt-0.5">Día {config.diaInicioCiclo} de cada mes</div>
          </div>
          <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/70">
            <span className="text-[10px] text-zinc-400 uppercase font-medium">Sueldo / Ciclo</span>
            <div className="font-mono font-bold text-emerald-400 mt-0.5">
              {formatearMoneda(config.ingresosMensuales)}
            </div>
          </div>
          <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/70">
            <span className="text-[10px] text-zinc-400 uppercase font-medium">Objetivo Ahorro</span>
            <div className="font-mono font-bold text-teal-400 mt-0.5">
              {formatearMoneda(config.objetivoAhorro)}
            </div>
          </div>
          <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/70">
            <span className="text-[10px] text-zinc-400 uppercase font-medium">Presupuesto Variable</span>
            <div className="font-mono font-bold text-zinc-100 mt-0.5">
              {formatearMoneda(presupuestoVariableTotal)}
            </div>
          </div>
        </div>

        {/* Botón Cierre de Ciclo / Resumen del Día 9 */}
        {onAbrirCierreCiclo && (
          <div className="pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onAbrirCierreCiclo}
              className="w-full py-2.5 px-3 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <CalendarCheck2 size={15} className="text-indigo-400" />
              <span>Cerrar ciclo actual / Resumen del Día 9 (Previsualizar)</span>
            </button>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: PERSONALIZACIÓN DE CATEGORÍAS & COMPARATIVA VISUAL */}
      <div className="bg-zinc-900/60 rounded-3xl p-4 border border-zinc-800 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <PieChart size={14} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100">Categorías y Presupuestos Asignados</h3>
              <p className="text-[10px] text-zinc-400">Distribución de tu presupuesto variable</p>
            </div>
          </div>

          <button
            onClick={() => {
              setCategoriaAEditar(null);
              setModalCategoriaAbierto(true);
            }}
            className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 px-2.5 py-1 rounded-xl shadow-md shadow-purple-600/20 flex items-center gap-1 transition cursor-pointer"
          >
            <Plus size={13} className="stroke-[3]" />
            <span>Añadir</span>
          </button>
        </div>

        {/* Comparativa Visual: Suma Categorías vs Presupuesto Variable Total */}
        <div className="bg-zinc-950/90 rounded-2xl p-3 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Presupuesto total asignado:</span>
            <div className="font-mono text-right">
              <span className={`font-bold ${haySobreasignacion ? 'text-rose-400' : 'text-zinc-100'}`}>
                {formatearMoneda(sumaPresupuestosCategorias)}
              </span>{' '}
              <span className="text-zinc-500">/ {formatearMoneda(presupuestoVariableTotal)}</span>
            </div>
          </div>

          {/* Progress Bar of allocation */}
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                haySobreasignacion ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, porcentajeAsignado))}%` }}
            />
          </div>

          {/* Alert Message */}
          {haySobreasignacion ? (
            <div className="flex items-start gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                Has asignado <strong>{formatearMoneda(diferenciaPresupuesto)}</strong> más a tus categorías que el presupuesto real disponible ({formatearMoneda(presupuestoVariableTotal)}).
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={12} />
                Asignación correcta ({porcentajeAsignado.toFixed(0)}%)
              </span>
              <span className="font-mono text-zinc-400">
                Libre sin asignar: {formatearMoneda(Math.abs(diferenciaPresupuesto))}
              </span>
            </div>
          )}
        </div>

        {/* Lista de Categorías */}
        <div className="space-y-2">
          {categorias.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CategoryIcon icono={cat.icono} color={cat.color} size={15} />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-zinc-200 truncate">{cat.nombre}</h4>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Presupuesto: {formatearMoneda(cat.presupuesto)}/ciclo
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    setCategoriaAEditar(cat);
                    setModalCategoriaAbierto(true);
                  }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
                  title="Editar categoría"
                >
                  <Pencil size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 3: DICCIONARIO INTELIGENTE DE REGLAS APRENDIDAS */}
      <div className="bg-zinc-900/60 rounded-3xl p-4 border border-zinc-800 space-y-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <BookOpen size={14} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100">Diccionario de Reglas Aprendidas</h3>
              <p className="text-[10px] text-zinc-400">
                {Object.keys(diccionario).length} palabras clave asociadas a categorías
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRestablecerReglas}
            className="text-[10px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
            title="Restablecer reglas por defecto"
          >
            <RotateCcw size={11} />
            <span>Restablecer</span>
          </button>
        </div>

        {/* Formulario para añadir nueva regla manual */}
        <form
          onSubmit={handleCrearRegla}
          className="p-3 bg-zinc-950/90 rounded-2xl border border-zinc-800 space-y-2.5"
        >
          <div className="text-[10px] font-semibold text-zinc-300 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Plus size={12} className="text-emerald-400" />
              <span>Añadir regla de comercio manual</span>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">Fusión & Alias</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5">Texto en banco / extracto</label>
              <input
                type="text"
                value={nuevaPalabraRegla}
                onChange={(e) => setNuevaPalabraRegla(e.target.value)}
                placeholder="Ej. VIRUMAA"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs uppercase font-mono text-zinc-100 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5">Categoría asignada</label>
              <select
                value={categoriaReglaSeleccionada}
                onChange={(e) => setCategoriaReglaSeleccionada(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5">Nombre amigable / Alias (opcional)</label>
              <input
                type="text"
                value={nuevoAliasRegla}
                onChange={(e) => setNuevoAliasRegla(e.target.value)}
                placeholder="Ej. COOP"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500 placeholder-zinc-600"
              />
            </div>

            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5">Vincular a Gasto Fijo (opcional)</label>
              <select
                value={gastoFijoAsociadoId}
                onChange={(e) => setGastoFijoAsociadoId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
              >
                <option value="">(Ninguno)</option>
                {gastosFijos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 active:scale-98 transition cursor-pointer flex items-center justify-center gap-1"
          >
            <Sparkles size={13} />
            <span>Guardar Regla</span>
          </button>
        </form>

        {/* Buscador y Lista de Reglas */}
        <div className="space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={filtroReglas}
              onChange={(e) => setFiltroReglas(e.target.value)}
              placeholder="Buscar comercios en el diccionario..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {clavesReglas.length === 0 ? (
              <p className="text-center text-xs text-zinc-500 py-3">No hay reglas coincidentes.</p>
            ) : (
              clavesReglas.map((clave) => {
                const entrada = diccionario[clave];
                const catId = typeof entrada === 'string' ? entrada : entrada?.categoriaId;
                const alias = typeof entrada === 'object' ? entrada?.aliasComercio : undefined;
                const gastoFijoId = typeof entrada === 'object' ? entrada?.gastoFijoId : undefined;
                const gastoFijoVinculado = gastosFijos.find((g) => g.id === gastoFijoId);

                const cat = categorias.find((c) => c.id === catId) || {
                  nombre: 'General',
                  icono: 'ShoppingBag',
                  color: 'zinc',
                };

                return (
                  <div
                    key={clave}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <CategoryIcon
                        icono={cat.icono}
                        color={cat.color}
                        size={12}
                        className="p-1 shrink-0"
                      />
                      <span className="font-mono font-bold text-zinc-200 truncate">
                        {clave}
                      </span>
                      {alias && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold text-[10px] border border-emerald-500/30">
                          → {alias}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400 truncate">
                        ({cat.nombre})
                      </span>
                      {gastoFijoVinculado && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[9px] border border-blue-500/30 truncate">
                          🏠 {gastoFijoVinculado.nombre}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onEliminarRegla(clave)}
                      className="p-1 text-zinc-400 hover:text-rose-400 rounded-md hover:bg-zinc-900 transition cursor-pointer shrink-0"
                      title="Eliminar regla"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: EXPORTAR E IMPORTAR COPIA DE SEGURIDAD (JSON) */}
      <div className="bg-zinc-900/60 rounded-3xl p-4 border border-zinc-800 space-y-3 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <FileJson size={14} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-100">Copia de Seguridad (Backup JSON)</h3>
            <p className="text-[10px] text-zinc-400">Guarda o restaura todos tus datos en 1 clic</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Botón Exportar */}
          <button
            type="button"
            onClick={handleExportarJson}
            className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer shadow-sm"
          >
            <Download size={14} className="text-emerald-400" />
            <span>Exportar Backup</span>
          </button>

          {/* Botón Importar */}
          <button
            type="button"
            onClick={() => setMostrarModalImportar(true)}
            className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer shadow-sm"
          >
            <Upload size={14} className="text-blue-400" />
            <span>Importar Backup</span>
          </button>
        </div>

        {mensajeExportacionExito && (
          <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{mensajeExportacionExito}</span>
          </div>
        )}

        {/* Input oculto para archivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleSubirArchivo}
          className="hidden"
        />

        <div className="text-[10px] text-zinc-500 flex items-center gap-1 pt-0.5">
          <Layers size={11} />
          <span>Incluye configuración, gastos fijos, transacciones y diccionario inteligente.</span>
        </div>
      </div>

      {/* SECCIÓN 4: REINICIO DE FÁBRICA */}
      <div className="pt-1">
        {!mostrarConfirmReset ? (
          <button
            type="button"
            onClick={() => setMostrarConfirmReset(true)}
            className="w-full text-center text-xs text-zinc-500 hover:text-rose-400 flex items-center justify-center gap-1.5 transition cursor-pointer py-2"
          >
            <RotateCcw size={13} />
            <span>Restablecer datos de fábrica</span>
          </button>
        ) : (
          <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-bold">
              <AlertTriangle size={15} />
              <span>¿Restablecer todo a 0€ y borrar movimientos?</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Se eliminarán todas las transacciones, gastos fijos y notificaciones, dejándote la app completamente limpia para empezar con tus finanzas reales.
            </p>
            <div className="flex justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onResetearTodo();
                  setMostrarConfirmReset(false);
                  setMensajeResetExitoso(true);
                  setTimeout(() => setMensajeResetExitoso(false), 4000);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-md shadow-rose-600/20 active:scale-95"
              >
                Sí, borrar todo y empezar a 0€
              </button>
              <button
                type="button"
                onClick={() => setMostrarConfirmReset(false)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs cursor-pointer transition active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {mensajeResetExitoso && (
          <div className="mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5 animate-in fade-in duration-200">
            <CheckCircle2 size={14} />
            <span>¡Datos restablecidos a 0€! La aplicación está completamente limpia.</span>
          </div>
        )}
      </div>

      {/* Modal para Crear/Editar Categoría */}
      <CategoryModal
        abierto={modalCategoriaAbierto}
        categoriaInicial={categoriaAEditar}
        onCerrar={() => {
          setModalCategoriaAbierto(false);
          setCategoriaAEditar(null);
        }}
        onGuardar={onGuardarCategoria}
        onEliminar={onEliminarCategoria}
        puedeEliminar={categorias.length > 1}
      />

      {/* Modal para Importar Backup (Subir archivo o pegar JSON) */}
      {mostrarModalImportar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-[430px] bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Upload size={16} className="text-blue-400" />
                <span>Importar Copia de Seguridad</span>
              </h3>
              <button
                onClick={() => {
                  setMostrarModalImportar(false);
                  setMensajeImportacion(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Opción 1: Archivo */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-300 font-medium">Opción A: Subir archivo .json</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-blue-500 bg-zinc-900/60 hover:bg-zinc-900 text-xs text-zinc-300 font-medium transition cursor-pointer flex items-center justify-center gap-2"
              >
                <FileJson size={16} className="text-blue-400" />
                <span>Seleccionar archivo konto_backup.json</span>
              </button>
            </div>

            {/* Opción 2: Pegar texto */}
            <div className="space-y-1.5 pt-1">
              <p className="text-xs text-zinc-300 font-medium">Opción B: Pegar contenido JSON</p>
              <textarea
                value={textoJsonImportar}
                onChange={(e) => setTextoJsonImportar(e.target.value)}
                placeholder="Pega aquí el contenido JSON del backup..."
                rows={5}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-[11px] font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {mensajeImportacion && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  mensajeImportacion.error
                    ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold'
                }`}
              >
                {mensajeImportacion.error ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                <span>{mensajeImportacion.texto}</span>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => procesarObjetoImportado(textoJsonImportar)}
                disabled={!textoJsonImportar.trim()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Restaurar Datos
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalImportar(false);
                  setMensajeImportacion(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
