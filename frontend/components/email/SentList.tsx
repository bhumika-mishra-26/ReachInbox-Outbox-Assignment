'use client';

import { Send } from 'lucide-react';
import { useSentEmails } from '@/hooks/useEmails';
import EmailListItem from './EmailListItem';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '../ui/Spinner';
import type { SentEmail } from '@/types';

interface SentListProps {
  onSelect: (email: SentEmail) => void;
  selectedId?: string;
  searchQuery?: string;
  refreshTrigger?: number | string;
}

export default function SentList({ onSelect, selectedId, searchQuery = '', refreshTrigger }: SentListProps) {
  const { emails, isLoading, error } = useSentEmails({ refreshTrigger });

  const filteredEmails = emails.filter((email) => {
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
        title={searchQuery ? "No matching emails found" : "No sent emails"}
        description={searchQuery ? `No emails found matching "${searchQuery}".` : "Sent emails will appear here once your campaigns run."}
        icon={<Send size={26} />}
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
            timestamp: email.sentAt,
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
