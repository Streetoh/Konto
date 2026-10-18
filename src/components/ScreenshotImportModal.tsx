import React, { useState, useRef, useEffect, useCallback } from 'react';
import type {
  CategoriaVariable,
  DiccionarioReglas,
  GastoFijo,
  TransaccionImportada,
  TransaccionVariable,
  OcrResultPayload,
} from '../types';
import {
  parsearCapturaExtracto,
  redimensionarImagenParaOcr,
} from '../utils/ocrParser';
import {
  Camera,
  Upload,
  X,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Zap,
  PiggyBank,
  AlertCircle,
  FileText,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Tag,
  Calendar,
  Building2,
} from 'lucide-react';

interface ScreenshotImportModalProps {
  abierto: boolean;
  onCerrar: () => void;
  categorias: CategoriaVariable[];
  reglas: DiccionarioReglas;
  gastosFijos: GastoFijo[];
  nombreTitularInicial?: string;
  onImportarTransacciones: (transacciones: TransaccionVariable[]) => void;
  onMarcarFijosPagados: (fijosIds: string[]) => void;
  onGuardarRegla: (palabraClave: string, categoriaId: string) => void;
  onActualizarNombreTitular: (nombreTitular: string) => void;
}

export const ScreenshotImportModal: React.FC<ScreenshotImportModalProps> = ({
  abierto,
  onCerrar,
  categorias,
  reglas,
  gastosFijos,
  nombreTitularInicial = '',
  onImportarTransacciones,
  onMarcarFijosPagados,
  onGuardarRegla,
  onActualizarNombreTitular,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de flujo
  const [paso, setPaso] = useState<'subir' | 'procesando' | 'comprobacion'>('subir');
  const [nombreTitular, setNombreTitular] = useState(nombreTitularInicial);
  const [errorOcr, setErrorOcr] = useState<string | null>(null);
  const [itemsImportados, setItemsImportados] = useState<TransaccionImportada[]>([]);
  const [mostrarDescartados, setMostrarDescartados] = useState(false);
  const [textoManual, setTextoManual] = useState('');
  const [modoManual, setModoManual] = useState(false);

  // Sincronizar nombre titular al abrir
  const [prevAbierto, setPrevAbierto] = useState(abierto);
  if (abierto !== prevAbierto) {
    setPrevAbierto(abierto);
    if (abierto) {
      setNombreTitular(nombreTitularInicial);
      setPaso('subir');
      setErrorOcr(null);
      setItemsImportados([]);
      setMostrarDescartados(false);
      setTextoManual('');
      setModoManual(false);
    }
  }

  // Procesar archivo seleccionado (PNG, JPEG, etc.)
  const procesarArchivoImagen = useCallback(
    async (file: File) => {
      setErrorOcr(null);
      setPaso('procesando');

      try {
        // 1. Redimensionar para velocidad y nitidez de OCR
        const base64Redimensionada = await redimensionarImagenParaOcr(file, 1400);

        // Guardar el nombre titular ingresado
        if (nombreTitular.trim() && nombreTitular !== nombreTitularInicial) {
          onActualizarNombreTitular(nombreTitular.trim());
        }

        // 2. Comprobar si estamos en Android con soporte nativo de ML Kit
        if (
          window.AndroidBridge &&
          typeof window.AndroidBridge.recognizeTextFromBase64 === 'function'
        ) {
          window.AndroidBridge.recognizeTextFromBase64(base64Redimensionada);
          return;
        }

        // 3. Fallback Web con Tesseract.js dinámico
        try {
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('eng+spa');
          const ret = await worker.recognize(base64Redimensionada);
          await worker.terminate();

          const textoOcr = ret.data.text;
          if (!textoOcr || textoOcr.trim().length === 0) {
            setErrorOcr(
              'No se extrajo texto de la imagen. Verifica que la captura sea legible.'
            );
            setPaso('subir');
            return;
          }

          const transacciones = parsearCapturaExtracto(
            textoOcr,
            reglas,
            gastosFijos,
            categorias,
            nombreTitular
          );

          if (transacciones.length === 0) {
            setErrorOcr(
              'No se reconocieron movimientos bancarios en la imagen. Puedes pegar el texto en modo manual.'
            );
            setPaso('subir');
          } else {
            setItemsImportados(transacciones);
            setPaso('comprobacion');
          }
        } catch (tessErr) {
          console.warn('Fallback Tesseract no disponible o falló:', tessErr);
          setErrorOcr(
            'El reconocedor web no pudo inicializarse. Puedes pegar el texto del extracto directamente.'
          );
          setPaso('subir');
        }
      } catch (err) {
        console.error('Error procesando imagen:', err);
        setErrorOcr('Ocurrió un error al leer la imagen seleccionada.');
        setPaso('subir');
      }
    },
    [categorias, gastosFijos, nombreTitular, nombreTitularInicial, onActualizarNombreTitular, reglas]
  );

  // Escuchar resultado OCR desde AndroidBridge
  useEffect(() => {
    if (!abierto) return;

    window.onOcrResult = (payload: OcrResultPayload) => {
      try {
        const transacciones = parsearCapturaExtracto(
          payload,
          reglas,
          gastosFijos,
          categorias,
          nombreTitular
        );
        if (transacciones.length === 0) {
          setErrorOcr(
            'No se detectaron movimientos legibles en la captura. Intenta con una imagen más nítida o pega el texto directamente.'
          );
          setPaso('subir');
        } else {
          setItemsImportados(transacciones);
          setPaso('comprobacion');
        }
      } catch (err) {
        console.error('Error parseando payload OCR:', err);
        setErrorOcr('Error interpretando los datos de la captura.');
        setPaso('subir');
      }
    };

    window.onOcrError = (errorMsg: string) => {
      setErrorOcr(`Error en reconocimiento óptico: ${errorMsg}`);
      setPaso('subir');
    };

    // Soporte para pegar captura directamente con Ctrl+V
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            void procesarArchivoImagen(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
      delete window.onOcrResult;
      delete window.onOcrError;
    };
  }, [abierto, reglas, gastosFijos, categorias, nombreTitular, procesarArchivoImagen]);

  if (!abierto) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void procesarArchivoImagen(file);
    }
  };

  const handleProcesarTextoManual = () => {
    if (!textoManual.trim()) return;
    setErrorOcr(null);
    setPaso('procesando');

    if (nombreTitular.trim() && nombreTitular !== nombreTitularInicial) {
      onActualizarNombreTitular(nombreTitular.trim());
    }

    const transacciones = parsearCapturaExtracto(
      textoManual,
      reglas,
      gastosFijos,
      categorias,
      nombreTitular
    );

    if (transacciones.length === 0) {
      setErrorOcr('No se identificaron importes ni empresas en el texto ingresado.');
      setPaso('subir');
    } else {
      setItemsImportados(transacciones);
      setPaso('comprobacion');
    }
  };

  // Cargar ejemplo típico de Swedbank para pruebas inmediatas
  const handleCargarEjemplo = () => {
    const ejemplo = `JOHVI MAKSIMARKET IDA-VIRUMAA -27.85 EUR
16.10.2026 17:28
Reserved

MAXIMA/MAXIMA NARVA MNJOHVI -1.74 EUR
000EE
16.10.2026 17:11 Reserved

MAXIMA/MAXIMA NARVA MNJOHVI -10.46 EUR
000EE
16.10.2026 17:09 Reserved

VIRUMAA -50.91 EUR
16.10.2026 19:02

WWW.AMAZON*B883Z7AU4 L2338 -39.13 EUR
LUXEMBOURG
16.10.2026 18:54

STEAMGAMES.COM 98004 BELLEVUE -5.00 EUR
16.10.2026 18:54

GOOGLE*GOOGLE ONE D02 R296 DUBLIN -1.99 EUR
16.10.2026 18:04

DANIEL JESUS REQUENA GORRIN -0.15 EUR
16.10.2026 17:28`;
    setTextoManual(ejemplo);
    setModoManual(true);
  };

  // Mutaciones en la lista de comprobación
  const handleToggleIncluir = (id: string) => {
    setItemsImportados((prev) =>
      prev.map((item) => (item.id === id ? { ...item, incluir: !item.incluir } : item))
    );
  };

  const handleCambiarComercio = (id: string, nuevoComercio: string) => {
    setItemsImportados((prev) =>
      prev.map((item) => (item.id === id ? { ...item, comercio: nuevoComercio } : item))
    );
  };

  const handleCambiarMonto = (id: string, nuevoMontoStr: string) => {
    const val = parseFloat(nuevoMontoStr) || 0;
    setItemsImportados((prev) =>
      prev.map((item) => (item.id === id ? { ...item, monto: Math.abs(val) } : item))
    );
  };

  const handleCambiarTipo = (id: string) => {
    setItemsImportados((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, tipo: item.tipo === 'gasto' ? 'ingreso' : 'gasto' }
          : item
      )
    );
  };

  const handleCambiarCategoria = (id: string, nuevaCategoriaId: string) => {
    setItemsImportados((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, categoriaId: nuevaCategoriaId, guardarEnDiccionario: true }
          : item
      )
    );
  };

  const handleToggleGuardarDiccionario = (id: string) => {
    setItemsImportados((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, guardarEnDiccionario: !item.guardarEnDiccionario }
          : item
      )
    );
  };

  const handleToggleMarcarFijo = (id: string) => {
    setItemsImportados((prev) =>
      prev.map((item) => {
        if (item.id === id && item.gastoFijoDetectado) {
          return {
            ...item,
            gastoFijoDetectado: {
              ...item.gastoFijoDetectado,
              marcarPagado: !item.gastoFijoDetectado.marcarPagado,
            },
          };
        }
        return item;
      })
    );
  };

  const handleMarcarTodos = (marcar: boolean) => {
    setItemsImportados((prev) =>
      prev.map((item) =>
        // Los redondeos secundarios no se marcan automáticamente al marcar todos
        item.esRedondeoSecundario && marcar ? item : { ...item, incluir: marcar }
      )
    );
  };

  // Confirmar e importar movimientos seleccionados
  const handleConfirmarImportacion = () => {
    const seleccionados = itemsImportados.filter((item) => item.incluir);
    if (seleccionados.length === 0) return;

    // 1. Convertir a TransaccionVariable (excluyendo los gastos fijos marcados como pagados para no descontarlos dos veces del presupuesto variable diario)
    const nuevasTransacciones: TransaccionVariable[] = seleccionados
      .filter((item) => !item.gastoFijoDetectado?.marcarPagado)
      .map((item) => ({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fecha: item.fechaHora,
        importe: item.monto,
        tipo: item.tipo,
        comercio: item.comercio,
        categoriaId: item.categoriaId,
        confirmado: true,
        origenNotificacion: false,
      }));

    // 2. Gastos fijos para marcar como pagados
    const fijosParaMarcar = seleccionados
      .filter((item) => item.gastoFijoDetectado?.marcarPagado)
      .map((item) => item.gastoFijoDetectado!.id);

    // 3. Reglas para guardar en diccionario
    seleccionados.forEach((item) => {
      if (item.guardarEnDiccionario && item.comercio.trim().length >= 3) {
        onGuardarRegla(item.comercio.trim(), item.categoriaId);
      }
    });

    // 4. Ejecutar callbacks
    if (nuevasTransacciones.length > 0) {
      onImportarTransacciones(nuevasTransacciones);
    }
    if (fijosParaMarcar.length > 0) {
      onMarcarFijosPagados(fijosParaMarcar);
    }
    if (nombreTitular.trim() && nombreTitular !== nombreTitularInicial) {
      onActualizarNombreTitular(nombreTitular.trim());
    }

    onCerrar();
  };

  const transaccionesActivas = itemsImportados.filter((it) => !it.esRedondeoSecundario);
  const redondeosDescartados = itemsImportados.filter((it) => it.esRedondeoSecundario);
  const seleccionadasCount = itemsImportados.filter((it) => it.incluir).length;
  const fijosDetectadosCount = itemsImportados.filter(
    (it) => it.incluir && it.gastoFijoDetectado
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-[430px] max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Camera size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Importar Captura Bancaria</h2>
              <p className="text-[11px] text-zinc-400">Swedbank y extractos bancarios</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Alertas de error */}
          {errorOcr && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{errorOcr}</p>
              </div>
            </div>
          )}

          {/* PASO 1: SELECCIONAR CAPTURA O PEGAR */}
          {paso === 'subir' && (
            <div className="space-y-4">
              {/* Campo para nombre titular (filtro de redondeos) */}
              <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <PiggyBank size={14} className="text-emerald-400" />
                    Titular para filtrar huchas/redondeos
                  </label>
                  <span className="text-[10px] text-zinc-500">Auto-descarte</span>
                </div>
                <input
                  type="text"
                  value={nombreTitular}
                  onChange={(e) => setNombreTitular(e.target.value)}
                  placeholder="Tu nombre completo (ej. Juan Pérez)"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-zinc-500 leading-tight">
                  Las transferencias hacia tu cuenta secundaria (ej. redondeos como -0.15 €) se identificarán y descartarán automáticamente.
                </p>
              </div>

              {/* Botón / Zona de arrastre para la imagen */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="group cursor-pointer p-6 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-3xl transition flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 text-zinc-300 flex items-center justify-center transition">
                  <Upload size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">
                    Seleccionar captura desde la galería
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    o pega la imagen con <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-300">Ctrl+V</kbd>
                  </p>
                </div>
                <span className="text-[11px] px-3 py-1 bg-zinc-800/70 border border-zinc-700/50 rounded-full text-zinc-400">
                  Formato Swedbank: empresa a la izquierda, monto a la derecha
                </span>
              </div>

              {/* Modo Texto de respaldo o prueba */}
              <div className="pt-2 border-t border-zinc-900">
                {!modoManual ? (
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setModoManual(true)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition"
                    >
                      <FileText size={13} />
                      ¿Prefieres pegar texto copiado?
                    </button>
                    <button
                      type="button"
                      onClick={handleCargarEjemplo}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition"
                    >
                      Probar con ejemplo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-300">
                        Pega aquí las líneas del extracto bancario:
                      </label>
                      <button
                        type="button"
                        onClick={() => setModoManual(false)}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300"
                      >
                        Ocultar
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      value={textoManual}
                      onChange={(e) => setTextoManual(e.target.value)}
                      placeholder="Rimi Baltic&#10;16.10.2026, 14:32&#10;-14.50 EUR..."
                      className="w-full p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleProcesarTextoManual}
                        disabled={!textoManual.trim()}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
                      >
                        Analizar Texto
                      </button>
                      <button
                        type="button"
                        onClick={handleCargarEjemplo}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl transition"
                      >
                        Ejemplo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 2: PROCESANDO OCR */}
          {paso === 'procesando' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <Sparkles size={20} className="absolute inset-0 m-auto text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-200">Analizando Captura de Pantalla...</p>
                <p className="text-xs text-zinc-400">
                  Extrayendo comercios, importes y cotejando con tu diccionario
                </p>
              </div>
            </div>
          )}

          {/* PASO 3: LISTA DE COMPROBACIÓN INTERACTIVA */}
          {paso === 'comprobacion' && (
            <div className="space-y-3.5">
              {/* Tarjeta resumen superior */}
              <div className="p-3.5 bg-zinc-900/70 border border-zinc-800/90 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">
                    {seleccionadasCount} de {itemsImportados.length} movimientos seleccionados
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleMarcarTodos(true)}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      Todos
                    </button>
                    <span className="text-zinc-600">•</span>
                    <button
                      type="button"
                      onClick={() => handleMarcarTodos(false)}
                      className="text-[11px] text-zinc-400 hover:underline"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {fijosDetectadosCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      <Zap size={10} /> {fijosDetectadosCount} gasto(s) fijo(s) detectado(s)
                    </span>
                  )}
                  {redondeosDescartados.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                      <PiggyBank size={10} /> {redondeosDescartados.length} redondeo(s) excluido(s)
                    </span>
                  )}
                </div>
              </div>

              {/* Listado de movimientos comprobables */}
              <div className="space-y-2.5">
                {transaccionesActivas.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      item.incluir
                        ? item.gastoFijoDetectado
                          ? 'bg-amber-950/15 border-amber-500/40'
                          : 'bg-zinc-900/60 border-zinc-800'
                        : 'bg-zinc-950/40 border-zinc-900 opacity-60'
                    }`}
                  >
                    {/* Fila 1: Checkbox, Nombre del Comercio y Monto */}
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleIncluir(item.id)}
                        className="mt-0.5 text-zinc-400 hover:text-zinc-100 transition shrink-0"
                      >
                        {item.incluir ? (
                          <CheckSquare size={18} className="text-emerald-400" />
                        ) : (
                          <Square size={18} className="text-zinc-600" />
                        )}
                      </button>

                      <div className="flex-1 space-y-1 min-w-0">
                        {/* Nombre editable del comercio */}
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-zinc-500 shrink-0" />
                          <input
                            type="text"
                            value={item.comercio}
                            onChange={(e) => handleCambiarComercio(item.id, e.target.value)}
                            className="w-full bg-transparent text-xs font-semibold text-zinc-100 border-b border-transparent hover:border-zinc-700 focus:border-emerald-500 focus:outline-none py-0.5"
                          />
                        </div>

                        {/* Fecha */}
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <Calendar size={11} />
                          <span>{new Date(item.fechaHora).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </div>

                      {/* Monto editable y tipo gasto/ingreso */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleCambiarTipo(item.id)}
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                              item.tipo === 'gasto'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {item.tipo === 'gasto' ? '-' : '+'}
                          </button>
                          <input
                            type="number"
                            step="0.01"
                            value={item.monto || ''}
                            onChange={(e) => handleCambiarMonto(item.id, e.target.value)}
                            className={`w-20 text-right bg-zinc-950/70 border border-zinc-800 rounded px-1.5 py-0.5 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 ${
                              item.tipo === 'gasto' ? 'text-zinc-100' : 'text-emerald-400'
                            }`}
                          />
                          <span className="text-xs text-zinc-400 font-mono">€</span>
                        </div>
                      </div>
                    </div>

                    {/* Fila 2: Selector de Categoría + Badges informativos */}
                    <div className="mt-2.5 pt-2.5 border-t border-zinc-800/60 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[10px] font-medium text-zinc-400 flex items-center gap-1">
                          <Tag size={11} /> Categoría asignada:
                        </label>
                        <select
                          value={item.categoriaId}
                          onChange={(e) => handleCambiarCategoria(item.id, e.target.value)}
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                        >
                          {categorias.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Coincidencias automáticas */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.coincidenciaDiccionario && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            <Sparkles size={10} /> Diccionario: "{item.coincidenciaDiccionario}"
                          </span>
                        )}

                        {item.guardarEnDiccionario && (
                          <label className="inline-flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.guardarEnDiccionario}
                              onChange={() => handleToggleGuardarDiccionario(item.id)}
                              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                            />
                            Recordar esta asignación para el futuro
                          </label>
                        )}
                      </div>

                      {/* Aviso especial si coincide con un Gasto Fijo mensual */}
                      {item.gastoFijoDetectado && (
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                            <Zap size={13} className="text-amber-400" />
                            <span>Gasto Fijo vinculado: {item.gastoFijoDetectado.nombre}</span>
                          </div>
                          <p className="text-[10px] text-amber-200/80 leading-relaxed">
                            Al estar vinculado a un gasto fijo, marcarlo como pagado actualizará tu checklist de Fijos <strong>sin restar dinero de tu presupuesto variable diario</strong> para no duplicar el gasto.
                          </p>
                          <label className="flex items-center gap-2 text-[11px] font-semibold text-amber-200 cursor-pointer pt-0.5">
                            <input
                              type="checkbox"
                              checked={item.gastoFijoDetectado.marcarPagado}
                              onChange={() => handleToggleMarcarFijo(item.id)}
                              className="rounded border-amber-500/40 bg-zinc-950 text-amber-500 focus:ring-0"
                            />
                            <span>Marcar como pagado en Gastos Fijos (no duplica en gastos diarios)</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sección colapsable de redondeos descartados */}
              {redondeosDescartados.length > 0 && (
                <div className="pt-2 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setMostrarDescartados(!mostrarDescartados)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/70 text-xs text-zinc-400 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <PiggyBank size={14} className="text-emerald-400" />
                      {redondeosDescartados.length} redondeo(s) a cuenta secundaria excluido(s)
                    </span>
                    {mostrarDescartados ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {mostrarDescartados && (
                    <div className="mt-2 space-y-2 pl-1">
                      <p className="text-[10px] text-zinc-500">
                        Detectados por coincidir con tu nombre o microahorro automático. No se importan a gastos salvo que los actives expresamente:
                      </p>
                      {redondeosDescartados.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleIncluir(item.id)}
                              className="text-zinc-500 hover:text-zinc-200"
                            >
                              {item.incluir ? (
                                <CheckSquare size={16} className="text-emerald-400" />
                              ) : (
                                <Square size={16} className="text-zinc-700" />
                              )}
                            </button>
                            <div>
                              <p className="font-semibold text-zinc-300">{item.comercio}</p>
                              <p className="text-[10px] text-zinc-500">{item.motivoDescarte}</p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-zinc-400">
                            -{item.monto.toFixed(2)} €
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barra inferior fija */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/60 shrink-0 flex gap-2.5">
          {paso === 'comprobacion' ? (
            <>
              <button
                type="button"
                onClick={() => setPaso('subir')}
                className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-2xl border border-zinc-800 transition flex items-center gap-1.5"
              >
                <RotateCcw size={14} /> Otra captura
              </button>
              <button
                type="button"
                onClick={handleConfirmarImportacion}
                disabled={seleccionadasCount === 0}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2"
              >
                <Check size={16} /> Importar {seleccionadasCount} {seleccionadasCount === 1 ? 'movimiento' : 'movimientos'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onCerrar}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-2xl border border-zinc-800 transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
