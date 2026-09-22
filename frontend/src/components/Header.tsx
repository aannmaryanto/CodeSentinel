'use client';

import React from 'react';
import { NavTab } from '../types/dashboard';
import { MenuIcon, ExternalLinkIcon } from './Icons';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  activeTab: NavTab;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export function Header({ onOpenMobileMenu, activeTab, onShowToast }: HeaderProps) {
  const { user, logout } = useAuth();

  const getTitle = () => {
    switch (activeTab) {
      case 'reviews':
        return 'CodeSentinel / Reviews & Audit Runs';
      case 'repos':
        return 'CodeSentinel / Connected Repositories';
      case 'settings':
        return 'CodeSentinel / Security & Engine Settings';
      default:
        return 'CodeSentinel Dashboard';
    }
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'CS';
  };

  const handleLogout = () => {
    logout();
    onShowToast('Logged out successfully', 'info');
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Developer';
  const roleDisplay = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Developer';

  return (
    <header className="sticky top-0 z-20 h-16 bg-[#080b12]/90 backdrop-blur-md border-b border-[#1e2638] px-4 lg:px-8 flex items-center justify-between">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-md text-zinc-400 hover:text-white hover:bg-[#151c2c]"
          aria-label="Open navigation menu"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-white tracking-tight hidden sm:block">
            {getTitle()}
          </h2>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#111726] border border-[#1e2638] text-xs font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>aannmaryanto / CodeSentinel</span>
          </div>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        <a
          href="https://github.com/aannmaryanto/CodeSentinel"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onShowToast('Opening CodeSentinel Documentation', 'info')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#111726] hover:bg-[#182136] text-zinc-300 border border-[#1e2638] transition-colors"
        >
          <span>Docs</span>
          <ExternalLinkIcon className="w-3.5 h-3.5 text-zinc-400" />
        </a>

        {/* User Profile Avatar & Logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-[#1e2638]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center border border-blue-400/30 shadow-inner">
              {getInitials(user?.name, user?.email)}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-medium text-zinc-200">{displayName}</div>
              <div className="text-[10px] text-zinc-500">{roleDisplay}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition-colors"
            title="Log out of account"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

