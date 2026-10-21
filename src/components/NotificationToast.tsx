import React, { useEffect } from 'react';
import { BellRing, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { formatearMoneda } from '../utils/calculations';

export interface ToastData {
  id: string;
  comercio: string;
  importe: number;
  tipo: 'gasto' | 'ingreso';
  categoriaNombre: string;
  categoriaSugerida: boolean;
  confirmado?: boolean;
}

interface Props {
  toast: ToastData | null;
  onCerrar: () => void;
  onVerEnInicio: () => void;
}

export const NotificationToast: React.FC<Props> = ({
  toast,
  onCerrar,
  onVerEnInicio,
}) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onCerrar();
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast, onCerrar]);

  if (!toast) return null;

  const esConfirmado = Boolean(toast.confirmado);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[390px] px-3 animate-in slide-in-from-top-4 fade-in duration-200">
      <div
        className={`bg-zinc-950/95 backdrop-blur-xl border rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 text-zinc-100 ${
          esConfirmado ? 'border-emerald-500/50' : 'border-amber-500/50'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
              esConfirmado
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}
          >
            {esConfirmado ? <CheckCircle2 size={16} /> : <BellRing size={16} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  esConfirmado ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {esConfirmado ? '✓ Gasto Confirmado' : 'Aviso Bancario Pendiente'}
              </span>
            </div>
            <div className="text-xs font-bold text-zinc-100 truncate">
              {toast.comercio}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              {toast.tipo === 'gasto' ? '-' : '+'}
              {formatearMoneda(toast.importe)} • {toast.categoriaNombre}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!esConfirmado && (
            <button
              onClick={onVerEnInicio}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <span>Bandeja</span>
              <ArrowRight size={10} />
            </button>
          )}
          <button
            onClick={onCerrar}
            className="p-1 text-zinc-500 hover:text-zinc-200 rounded-lg cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
