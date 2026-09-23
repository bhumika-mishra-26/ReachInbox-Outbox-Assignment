'use client';

import { useState, useEffect } from 'react';
import { Star, Paperclip, Clock, Send, AlertCircle } from 'lucide-react';
import { formatEmailTimestamp, truncate, stripHtml } from '@/lib/utils';
import type { EmailListItem } from '@/types';

interface EmailListItemProps {
  item: EmailListItem;
  isSelected?: boolean;
  onClick: () => void;
}

export default function EmailListItemComponent({ item, isSelected, onClick }: EmailListItemProps) {
  const [isStarred, setIsStarred] = useState(false);
  const isScheduled = item.status === 'SCHEDULED' || item.status === 'PENDING';
  const isFailed = item.status === 'FAILED';
  const recipientDisplay = item.recipientName || item.recipient;

  // Load star status from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('starred_emails');
      if (stored) {
        const starredIds: string[] = JSON.parse(stored);
        if (starredIds.includes(item.id)) {
          setIsStarred(true);
        }
      }
    } catch {
      // ignore
    }
  }, [item.id]);

  // Toggle star status and update localStorage
  const handleToggleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStarred((prev) => {
      const nextState = !prev;
      try {
        const stored = localStorage.getItem('starred_emails');
        let starredIds: string[] = stored ? JSON.parse(stored) : [];
        if (nextState) {
          if (!starredIds.includes(item.id)) starredIds.push(item.id);
        } else {
          starredIds = starredIds.filter((id) => id !== item.id);
        }
        localStorage.setItem('starred_emails', JSON.stringify(starredIds));
      } catch {
        // ignore
      }
      return nextState;
    });
  };

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 px-4 sm:px-6 py-3.5 cursor-pointer border-b border-gray-100/80 hover:bg-slate-50/80 transition-all duration-150 ${
        isSelected ? 'bg-slate-100/70 border-l-4 border-l-green-500 font-medium' : ''
      }`}
    >
      <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1 min-w-0 gap-3">
        {/* Recipient */}
        <div className="w-auto sm:w-44 flex-shrink-0 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-green-500 transition-colors" />
          <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate" title={recipientDisplay}>
            {recipientDisplay}
          </p>
        </div>

        {/* Subject + Body Preview */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-medium text-gray-900 flex-shrink-0 max-w-[140px] sm:max-w-[220px] truncate">
            {item.subject}
          </span>
          <span className="hidden sm:inline text-sm text-gray-300 font-light">-</span>
          <span className="hidden md:inline text-sm text-gray-500 truncate flex-1 font-normal">
            {truncate(stripHtml(item.bodyPreview || ''), 90)}
          </span>
          {item.attachments && item.attachments.length > 0 && (
            <span className="flex-shrink-0 text-gray-400 p-1 bg-gray-100 rounded-md" title={`${item.attachments.length} attachment(s)`}>
              <Paperclip size={13} />
            </span>
          )}
        </div>
      </div>

      {/* Status & Timestamp */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-3 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-50">
        <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium border ${
          isScheduled
            ? 'bg-amber-50 text-amber-700 border-amber-200/60'
            : isFailed
            ? 'bg-rose-50 text-rose-700 border-rose-200/60'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
        }`}>
          {isScheduled ? (
            <Clock size={11} className="text-amber-600" />
          ) : isFailed ? (
            <AlertCircle size={11} className="text-rose-600" />
          ) : (
            <Send size={11} className="text-emerald-600" />
          )}
          <span>{formatEmailTimestamp(item.timestamp)}</span>
        </div>

        {/* Star */}
        <button
          onClick={handleToggleStar}
          className={`p-1 transition-colors ${
            isStarred ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'
          }`}
          title={isStarred ? 'Unstar' : 'Star'}
        >
          <Star size={15} className={isStarred ? 'fill-amber-400' : ''} />
        </button>
      </div>
    </div>
  );
}

