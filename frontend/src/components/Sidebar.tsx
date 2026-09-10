'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NavTab } from '../types/dashboard';
import {
  ShieldIcon,
  DashboardIcon,
  ReviewIcon,
  RepoIcon,
  SettingsIcon,
  CodeIcon,
  GitHubIcon,
  CloseIcon,
} from './Icons';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen, activeTab, onSelectTab }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems: { name: string; id: NavTab; icon: React.FC<{ className?: string }> }[] = [
    { name: 'Dashboard', id: 'dashboard', icon: DashboardIcon },
    { name: 'Reviews', id: 'reviews', icon: ReviewIcon },
    { name: 'Repositories', id: 'repos', icon: RepoIcon },
    { name: 'Settings', id: 'settings', icon: SettingsIcon },
  ];

  const handleTabClick = (tabId: NavTab) => {
    setMobileOpen(false);
    if (pathname !== '/') {
      router.push('/');
      setTimeout(() => onSelectTab(tabId), 100);
    } else {
      onSelectTab(tabId);
    }
  };

  const handleLiveReviewClick = () => {
    setMobileOpen(false);
    if (pathname !== '/review') {
      router.push('/review');
    }
  };

  const isLiveReviewActive = pathname === '/review';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0b0f19] border-r border-[#1e2638] text-zinc-300">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1e2638] flex items-center justify-between">
        <button 
          onClick={() => handleTabClick('dashboard')}
          className="flex items-center gap-3 text-left focus:outline-none"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-sm">
            <ShieldIcon className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight leading-none">CodeSentinel</h1>
            <p className="text-xs text-zinc-400 font-medium mt-1">AI Code Security</p>
          </div>
        </button>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-zinc-400 hover:text-white p-1 rounded-md"
          aria-label="Close sidebar"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = !isLiveReviewActive && activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#151c2c]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-zinc-400'}`} />
              <span>{item.name}</span>
            </button>
          );
        })}

        <div className="pt-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          AI Tools
        </div>

        <button
          onClick={handleLiveReviewClick}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left ${
            isLiveReviewActive
              ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#151c2c]'
          }`}
        >
          <CodeIcon className={`w-5 h-5 ${isLiveReviewActive ? 'text-blue-400' : 'text-zinc-400'}`} />
          <span>Code Review Page</span>
        </button>
      </nav>

      {/* Bottom Section: GitHub Status */}
      <div className="p-4 border-t border-[#1e2638] bg-[#090d16]">
        <div className="rounded-lg p-3 bg-[#111726] border border-[#1e2638] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitHubIcon className="w-4 h-4 text-zinc-300" />
              <span className="text-xs font-medium text-zinc-200">GitHub Connected</span>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 truncate">
            Org: <span className="text-zinc-200 font-mono">aannmaryanto</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-xs flex-1 z-50">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

