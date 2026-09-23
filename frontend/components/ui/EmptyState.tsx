'use client';

import { InboxIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title,
  description = 'Nothing here yet.',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-gray-300">
        {icon || <InboxIcon size={26} />}
      </div>
      <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
}
