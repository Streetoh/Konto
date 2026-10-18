import React from 'react';
import { Plus } from 'lucide-react';

interface Props {
  onClick: () => void;
}

export const FloatingAddButton: React.FC<Props> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      aria-label="Añadir gasto rápido"
      className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-zinc-950 flex items-center justify-center shadow-[0_10px_25px_rgba(16,185,129,0.45)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-emerald-300/40"
      style={{
        maxWidth: '430px',
      }}
    >
      <Plus size={28} className="stroke-[2.8]" />
    </button>
  );
};
