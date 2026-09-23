'use client';

import { Clock, Send, ChevronDown, PenSquare, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Avatar from '@/components/ui/Avatar';
import { getInitials, getColorIndex } from '@/lib/utils';

const AVATAR_COLORS = [
  'bg-green-500', 'bg-blue-500', 'bg-purple-500',
  'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
];

interface SidebarProps {
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onCompose: () => void;
  scheduledCount: number;
  sentCount: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  activeTab, onTabChange, onCompose, scheduledCount, sentCount, isOpen = false, onClose = () => {},
}: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    router.replace('/login');
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const colorIdx = getColorIndex(displayName);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-[272px] bg-white border-r border-gray-100 flex flex-col flex-shrink-0
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="ReachInbox Logo"
          className="h-8 w-8 object-contain flex-shrink-0"
        />
        <div className="flex flex-col">
          <span className="text-lg font-black tracking-tight text-gray-900 leading-none">
            Reach<span className="text-[#00B964]">Inbox</span>
          </span>
          <span className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase mt-0.5">
            Scheduler
          </span>
        </div>
      </div>

      {/* User card */}
      <div className="px-3 mb-4">
        <button
          onClick={() => setShowUserMenu((v) => !v)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
        >
          <Avatar name={displayName} src={user?.avatar} size="sm" className="w-9 h-9" />
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
          </div>
          <ChevronDown
            size={14}
            className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
          />
        </button>

        {/* User dropdown */}
        {showUserMenu && (
          <div className="mt-1 mx-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Compose button */}
      <div className="px-3 mb-5">
        <button
          id="compose-btn"
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-green-500 text-green-600 font-semibold text-sm rounded-full hover:bg-green-50 transition-colors duration-200"
        >
          <PenSquare size={15} />
          Compose
        </button>
      </div>

      {/* Navigation */}
      <div className="px-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">Core</p>
        <nav className="flex flex-col gap-1">
          {/* Scheduled */}
          <button
            id="nav-scheduled"
            onClick={() => { onTabChange('scheduled'); onClose(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
              activeTab === 'scheduled'
                ? 'bg-green-50 text-green-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Clock size={16} className={activeTab === 'scheduled' ? 'text-green-600' : 'text-gray-400'} />
            <span className="flex-1 text-left">Scheduled</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              activeTab === 'scheduled' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {scheduledCount}
            </span>
          </button>

          {/* Sent */}
          <button
            id="nav-sent"
            onClick={() => { onTabChange('sent'); onClose(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
              activeTab === 'sent'
                ? 'bg-green-50 text-green-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Send size={16} className={activeTab === 'sent' ? 'text-green-600' : 'text-gray-400'} />
            <span className="flex-1 text-left">Sent</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              activeTab === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {sentCount}
            </span>
          </button>
        </nav>
      </div>
    </aside>
    </>
  );
}
