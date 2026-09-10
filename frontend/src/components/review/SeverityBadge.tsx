import React from 'react';
import { Severity } from '@/types/dashboard';

interface SeverityBadgeProps {
  severity: Severity | 'passed';
  className?: string;
}

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  const getBadgeStyle = () => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'low':
      case 'info':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'passed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  return (
    <span
      className={`px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${getBadgeStyle()} ${className}`}
      aria-label={`Severity level: ${severity}`}
    >
      {severity}
    </span>
  );
}
