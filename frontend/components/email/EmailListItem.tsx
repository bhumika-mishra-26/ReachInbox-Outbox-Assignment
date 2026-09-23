'use client';

import { Star, Paperclip } from 'lucide-react';
import { formatEmailTimestamp, truncate, stripHtml } from '@/lib/utils';
import type { EmailListItem } from '@/types';

interface EmailListItemProps {
  item: EmailListItem;
  isSelected?: boolean;
  onClick: () => void;
}

export default function EmailListItemComponent({ item, isSelected, onClick }: EmailListItemProps) {
  const isScheduled = item.status === 'SCHEDULED' || item.status === 'PENDING';
  const isFailed = item.status === 'FAILED';

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-4 px-5 py-4 cursor-pointer border-b border-gray-50 hover:bg-gray-50/70 transition-colors duration-100 ${
        isSelected ? 'bg-gray-50' : ''
      }`}
    >
      {/* Recipient */}
      <div className="w-36 flex-shrink-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          To: {item.recipientName || item.recipient}
        </p>
      </div>

      {/* Timestamp badge + subject + preview */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
        {/* Timestamp pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
          isScheduled
            ? 'bg-orange-100 text-orange-600'
            : isFailed
            ? 'bg-red-100 text-red-600'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isScheduled ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
          {formatEmailTimestamp(item.timestamp)}
        </div>

        {/* Subject + preview */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-800 flex-shrink-0 max-w-[200px] truncate">
            {item.subject}
          </span>
          <span className="text-sm text-gray-400">-</span>
          <span className="text-sm text-gray-400 truncate flex-1">
            {truncate(stripHtml(item.bodyPreview || ''), 80)}
          </span>
          {item.attachments && item.attachments.length > 0 && (
            <span className="flex-shrink-0 text-gray-400 p-0.5" title={`${item.attachments.length} attachment(s)`}>
              <Paperclip size={13} />
            </span>
          )}
        </div>
      </div>

      {/* Star */}
      <button
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0 text-gray-300 hover:text-yellow-400 transition-colors"
      >
        <Star size={15} />
      </button>
    </div>
  );
}
