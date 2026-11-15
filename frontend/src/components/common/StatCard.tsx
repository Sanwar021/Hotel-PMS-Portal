import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'amber' | 'gold' | 'emerald' | 'ruby' | 'sapphire' | 'violet';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'gold',
  trend,
}) => {
  const variantStyles = {
    amber: 'text-hotel-accent border-hotel-accent/20 bg-hotel-accent/5',
    gold: 'text-hotel-gold border-hotel-gold/20 bg-hotel-gold/5',
    emerald: 'text-emerald-700 border-emerald-600/15 bg-emerald-600/8',
    ruby: 'text-rose-600 border-rose-500/20 bg-rose-500/8',
    sapphire: 'text-sky-700 border-sky-600/15 bg-sky-600/8',
    violet: 'text-violet-700 border-violet-600/15 bg-violet-600/8',
  };

  const glowStyles = {
    amber: 'hover:shadow-[0_0_30px_rgba(239,143,49,0.12)]',
    gold: 'hover:shadow-[0_0_30px_rgba(216,168,85,0.12)]',
    emerald: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.12)]',
    ruby: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.12)]',
    sapphire: 'hover:shadow-[0_0_30px_rgba(56,189,248,0.12)]',
    violet: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.12)]',
  };

  return (
    <div
      className={clsx(
        'group relative overflow-hidden rounded-xl border border-hotel-line bg-hotel-panel p-5 shadow-[0_8px_24px_rgba(18,70,56,.045)] transition-all duration-300',
        glowStyles[variant]
      )}
    >
      {/* Subtle background glow */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl transition-all group-hover:scale-150" />

      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium tracking-wider uppercase text-hotel-muted">
          {title}
        </span>
        <div className={clsx('rounded-lg border p-2.5 transition-transform group-hover:scale-110', variantStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3">
        <div className="font-serif text-2xl font-semibold tracking-tight text-hotel-text lg:text-3xl">
          {value}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          {subtitle && <span className="text-hotel-muted text-[11px]">{subtitle}</span>}
          {trend && (
            <span
              className={clsx(
                'ml-auto font-medium text-[11px]',
                trend.isPositive ? 'text-emerald-700' : 'text-rose-600'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

