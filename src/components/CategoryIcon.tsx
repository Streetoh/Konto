import React from 'react';
import {
  ShoppingCart,
  Utensils,
  Car,
  ShoppingBag,
  HeartPulse,
  Gamepad2,
  Home,
  Coffee,
  Plane,
  Tag,
  HelpCircle,
} from 'lucide-react';
import type { CategoriaIcono, CategoriaColor } from '../types';

interface Props {
  icono: CategoriaIcono | string;
  color: CategoriaColor | string;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<Props> = ({
  icono,
  color,
  className = '',
  size = 18,
}) => {
  const getIcon = () => {
    switch (icono) {
      case 'ShoppingCart':
        return <ShoppingCart size={size} />;
      case 'Utensils':
        return <Utensils size={size} />;
      case 'Car':
        return <Car size={size} />;
      case 'ShoppingBag':
        return <ShoppingBag size={size} />;
      case 'HeartPulse':
        return <HeartPulse size={size} />;
      case 'Gamepad2':
        return <Gamepad2 size={size} />;
      case 'Home':
        return <Home size={size} />;
      case 'Coffee':
        return <Coffee size={size} />;
      case 'Plane':
        return <Plane size={size} />;
      case 'Tag':
        return <Tag size={size} />;
      default:
        return <HelpCircle size={size} />;
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'amber':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'blue':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'purple':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'rose':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'teal':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl p-2.5 border transition-transform duration-200 ${getColorClasses()} ${className}`}
    >
      {getIcon()}
    </div>
  );
};
