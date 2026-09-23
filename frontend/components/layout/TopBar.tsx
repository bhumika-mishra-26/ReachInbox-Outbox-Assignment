'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, RefreshCw, Loader2, Check, Menu } from 'lucide-react';

export type FilterStatus = 'ALL' | 'STARRED' | 'SENT' | 'SCHEDULED' | 'FAILED';

interface TopBarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  rightSlot?: React.ReactNode;
  /** Controlled search value */
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isSearching?: boolean;
  activeTab?: 'scheduled' | 'sent';
  /** Active filter */
  activeFilter?: FilterStatus;
  onFilterChange?: (filter: FilterStatus) => void;
  onToggleMobileSidebar?: () => void;
}

export default function TopBar({
  onRefresh,
  isRefreshing,
  rightSlot,
  searchQuery = '',
  onSearchChange = () => {},
  isSearching = false,
  activeTab = 'scheduled',
  activeFilter = 'ALL',
  onFilterChange = () => {},
  onToggleMobileSidebar = () => {},
}: TopBarProps) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Relevant contextual filter options based on active tab
  const filterOptions: { label: string; value: FilterStatus }[] = activeTab === 'sent'
    ? [
        { label: 'All Sent', value: 'ALL' },
        { label: 'Starred Only', value: 'STARRED' },
        { label: 'Successfully Sent', value: 'SENT' },
        { label: 'Failed Deliveries', value: 'FAILED' },
      ]
    : [
        { label: 'All Scheduled', value: 'ALL' },
        { label: 'Starred Only', value: 'STARRED' },
      ];

  return (
    <header className="h-14 border-b border-gray-100 flex items-center px-3 sm:px-5 gap-2 sm:gap-3 bg-white flex-shrink-0 relative">
      {/* Mobile Hamburger Toggle */}
      <button
        onClick={onToggleMobileSidebar}
        className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 md:hidden flex-shrink-0"
        title="Open Navigation"
      >
        <Menu size={18} />
      </button>

      {/* Search Bar */}
      <div className="w-full max-w-sm relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        {isSearching && (
          <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
        <input
          id="search-input"
          type="text"
          placeholder="Search emails..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
        />
      </div>

      {/* Filter Icon Button & Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowFilterMenu((v) => !v)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
            activeFilter !== 'ALL'
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Filter Emails"
        >
          <SlidersHorizontal size={16} />
        </button>

        {/* Filter Dropdown Menu */}
        {showFilterMenu && (
          <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1">
            <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
              Filter By
            </p>
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onFilterChange(opt.value);
                  setShowFilterMenu(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>{opt.label}</span>
                {activeFilter === opt.value && <Check size={14} className="text-emerald-600" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <button
        id="refresh-btn"
        onClick={onRefresh}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        title="Refresh"
      >
        <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-green-500' : ''} />
      </button>

      {/* Right Slot (Slack Connect Button) */}
      {rightSlot && <div className="ml-auto flex-shrink-0">{rightSlot}</div>}
    </header>
  );
}

