'use client';

import React from 'react';
import { MetricCardData } from '../types/dashboard';
import { ReviewIcon, AlertTriangleIcon, CheckCircleIcon, ShieldIcon } from './Icons';

const metrics: MetricCardData[] = [
  {
    id: 'total-reviews',
    title: 'Total Reviews',
    value: '128',
    change: '+12% this week',
    isPositive: true,
    description: 'Pull requests analyzed',
    icon: 'reviews',
  },
  {
    id: 'critical-issues',
    title: 'Critical Issues',
    value: '7',
    change: '-2 from last week',
    isPositive: true, // fewer criticals is positive
    description: 'Require immediate fix',
    icon: 'critical',
  },
  {
    id: 'warnings',
    title: 'Warnings',
    value: '34',
    change: '5 require triage',
    isPositive: false,
    neutral: true,
    description: 'High & medium severity',
    icon: 'warnings',
  },
  {
    id: 'passed-checks',
    title: 'Passed Checks',
    value: '94.5%',
    change: '+1.8% pass rate',
    isPositive: true,
    description: 'Clean review runs',
    icon: 'passed',
  },
];

export function MetricCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((card) => {
        let iconBg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        let badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        let IconComponent = ShieldIcon;

        if (card.icon === 'reviews') {
          IconComponent = ReviewIcon;
          iconBg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        } else if (card.icon === 'critical') {
          IconComponent = AlertTriangleIcon;
          iconBg = 'bg-red-500/10 text-red-400 border-red-500/20';
          badgeColor = 'text-red-400 bg-red-500/10 border-red-500/20';
        } else if (card.icon === 'warnings') {
          IconComponent = AlertTriangleIcon;
          iconBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
          badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        } else if (card.icon === 'passed') {
          IconComponent = CheckCircleIcon;
          iconBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
          badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        }

        return (
          <div
            key={card.id}
            className="rounded-xl bg-[#0f1420] border border-[#1e2638] p-5 flex flex-col justify-between space-y-4 hover:border-[#2a3650] transition-all shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg border ${iconBg}`}>
                <IconComponent className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-bold tracking-tight text-white">{card.value}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${badgeColor}`}>
                  {card.change}
                </span>
                <span className="text-xs text-zinc-400 truncate">{card.description}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
