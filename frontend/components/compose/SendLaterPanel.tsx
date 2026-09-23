'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { toDatetimeLocal, getQuickScheduleOptions } from '@/lib/utils';

interface SendLaterPanelProps {
  onClose: () => void;
  onConfirm: (date: Date) => void;
  initialDate?: Date;
}

export default function SendLaterPanel({ onClose, onConfirm, initialDate }: SendLaterPanelProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);
  const quickOptions = getQuickScheduleOptions();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleDatetimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) setSelectedDate(new Date(e.target.value));
  };

  const handleQuickOption = (date: Date) => {
    setSelectedDate(date);
  };

  const handleDone = () => {
    if (selectedDate) {
      onConfirm(selectedDate);
      onClose();
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-14 right-4 z-50 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Send Later</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>

      {/* Date & time picker */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <input
            type="datetime-local"
            value={selectedDate ? toDatetimeLocal(selectedDate) : ''}
            onChange={handleDatetimeChange}
            min={toDatetimeLocal(new Date())}
            className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
          />
          <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Quick options */}
      <div className="px-2 pb-2">
        {quickOptions.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => handleQuickOption(opt.value)}
            className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
              selectedDate?.toDateString() === opt.value.toDateString() &&
              selectedDate?.getHours() === opt.value.getHours()
                ? 'bg-green-50 text-green-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDone}
          disabled={!selectedDate}
          className="px-4 py-2 text-sm border-2 border-green-500 text-green-600 font-semibold rounded-full hover:bg-green-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Done
        </button>
      </div>
    </div>
  );
}
