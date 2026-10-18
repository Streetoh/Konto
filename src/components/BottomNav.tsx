import React from 'react';
import type { TabType } from '../types';
import {
  LayoutDashboard,
  BarChart2,
  CalendarClock,
  Settings,
} from 'lucide-react';

interface Props {
  tabActiva: TabType;
  onCambiarTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<Props> = ({ tabActiva, onCambiarTab }) => {
  const tabs: { id: TabType; etiqueta: string; icono: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'inicio', etiqueta: 'Inicio', icono: LayoutDashboard },
    { id: 'analisis', etiqueta: 'Análisis', icono: BarChart2 },
    { id: 'fijos', etiqueta: 'Fijos', icono: CalendarClock },
    { id: 'ajustes', etiqueta: 'Ajustes', icono: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-[430px] mx-auto bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/80 px-2 py-2">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icono;
          const activa = tabActiva === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onCambiarTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer relative ${
                activa
                  ? 'text-emerald-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
            >
              {activa && (
                <span className="absolute -top-2 w-8 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              )}
              <Icon size={20} className={activa ? 'stroke-[2.3]' : 'stroke-[1.7]'} />
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">
                {tab.etiqueta}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
