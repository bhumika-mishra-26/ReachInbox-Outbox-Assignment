'use client';

import { Clock } from 'lucide-react';
import { useScheduledEmails } from '@/hooks/useEmails';
import EmailListItem from './EmailListItem';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '../ui/Spinner';
import type { ScheduledEmail } from '@/types';

interface ScheduledListProps {
  onSelect: (email: ScheduledEmail) => void;
  selectedId?: string;
  searchQuery?: string;
  activeFilter?: string;
  refreshTrigger?: number | string;
}

export default function ScheduledList({ onSelect, selectedId, searchQuery = '', activeFilter = 'ALL', refreshTrigger }: ScheduledListProps) {
  const { emails, isLoading, error } = useScheduledEmails({ refreshTrigger });

  const filteredEmails = emails.filter((email) => {
    // Starred filter
    if (activeFilter === 'STARRED') {
      try {
        const stored = localStorage.getItem('starred_emails');
        const starredIds: string[] = stored ? JSON.parse(stored) : [];
        if (!starredIds.includes(email.id)) return false;
      } catch {
        return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      email.recipient.toLowerCase().includes(q) ||
      email.subject.toLowerCase().includes(q) ||
      email.body.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load emails"
        description={error}
        icon={<span className="text-2xl">⚠️</span>}
      />
    );
  }

  if (filteredEmails.length === 0) {
    return (
      <EmptyState
        title={searchQuery ? "No matching emails found" : "No scheduled emails"}
        description={searchQuery ? `No emails found matching "${searchQuery}".` : "Click Compose to schedule your first email campaign."}
        icon={<Clock size={26} />}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {filteredEmails.map((email) => (
        <EmailListItem
          key={email.id}
          item={{
            id: email.id,
            recipient: email.recipient,
            subject: email.subject,
            bodyPreview: email.body,
            timestamp: email.scheduledFor,
            status: email.status,
            senderEmail: email.senderEmail,
            body: email.body,
            attachments: email.attachments,
          }}
          isSelected={selectedId === email.id}
          onClick={() => onSelect(email)}
        />
      ))}
    </div>
  );
}
