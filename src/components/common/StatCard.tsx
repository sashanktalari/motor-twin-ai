import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number | null | undefined;
  unit?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';
  subtitle?: string;
  glow?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  badge,
  badgeColor = 'cyan',
  subtitle,
  glow = false,
}) => {
  const badgeStyles = {
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    slate: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
  };

  return (
    <div
      className={`p-5 rounded-xl border border-navy-800 bg-navy-900/60 backdrop-blur-md transition-all duration-200 hover:border-cyan-500/30 ${
        glow ? 'shadow-glow-cyan' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 tracking-wider uppercase font-mono">{title}</span>
        <div className="p-2 rounded-lg bg-navy-800/80 text-cyan-400 border border-navy-700/60">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">
          {value !== null && value !== undefined ? value : '—'}
        </span>
        {unit && <span className="text-xs text-slate-400 font-mono">{unit}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between">
        {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
        {badge && (
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeStyles[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
};
