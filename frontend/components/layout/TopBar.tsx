'use client';

import { Search, SlidersHorizontal, RefreshCw, Loader2 } from 'lucide-react';

interface TopBarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  rightSlot?: React.ReactNode;
  /** Optional controlled search value */
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isSearching?: boolean;
}

export default function TopBar({
  onRefresh,
  isRefreshing,
  rightSlot,
  searchQuery = '',
  onSearchChange = () => {},
  isSearching = false,
}: TopBarProps) {
  return (
    <header className="h-14 border-b border-gray-100 flex items-center px-5 gap-3 bg-white flex-shrink-0">
      {/* Search — constrained width */}
      <div className="w-full max-w-sm relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        {isSearching && (
          <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
        <input
          id="search-input"
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
        />
      </div>

      {/* Filter */}
      <button className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" title="Filter">
        <SlidersHorizontal size={16} />
      </button>

      {/* Refresh */}
      <button
        id="refresh-btn"
        onClick={onRefresh}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        title="Refresh"
      >
        <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-green-500' : ''} />
      </button>

      {/* Right slot */}
      {rightSlot && <div className="ml-auto flex-shrink-0">{rightSlot}</div>}
    </header>
  );
}
