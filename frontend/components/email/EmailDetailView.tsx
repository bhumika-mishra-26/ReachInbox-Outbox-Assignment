'use client';

import { useState } from 'react';
import { ArrowLeft, Star, Trash2, ArchiveX, Paperclip, Download } from 'lucide-react';
import { formatFullDate, getInitials, getColorIndex } from '@/lib/utils';
import type { ScheduledEmail, SentEmail, EmailAttachment } from '@/types';
import { emailApi } from '@/lib/api';
import toast from 'react-hot-toast';

const AVATAR_COLORS = [
  'bg-green-500', 'bg-blue-500', 'bg-purple-500',
  'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
];

interface EmailDetailViewProps {
  email: ScheduledEmail | SentEmail;
  onBack: () => void;
  onDelete?: (emailId: string) => void;
}

export default function EmailDetailView({ email, onBack, onDelete }: EmailDetailViewProps) {
  const [isStarred, setIsStarred] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const timestamp = 'scheduledFor' in email ? email.scheduledFor : email.sentAt;
  const colorIdx = getColorIndex(email.senderEmail || email.senderId);
  const initials = getInitials(email.senderEmail?.split('@')[0] || 'S');
  const senderDisplay = email.senderEmail || email.senderId;
  const attachments = (email.attachments || []) as EmailAttachment[];

  const handleToggleStar = () => {
    setIsStarred((prev) => !prev);
    toast.success(!isStarred ? 'Email starred' : 'Email unstarred');
  };

  const handleArchive = () => {
    toast.success('Email archived');
    onBack();
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await emailApi.cancel(email.id);
      toast.success('Email deleted successfully');
      if (onDelete) onDelete(email.id);
      onBack();
    } catch {
      toast.error('Failed to delete email');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = (att: EmailAttachment) => {
    const fileSrc = att.url || att.content;
    if (!fileSrc) {
      toast.error('Attachment content not available for download');
      return;
    }
    const link = document.createElement('a');
    link.href = fileSrc;
    link.download = att.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading ${att.filename}`);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          title="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="flex-1 text-sm font-semibold text-gray-800 truncate">
          {email.recipient} | {email.subject}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleStar}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              isStarred
                ? 'text-yellow-400 bg-yellow-50 hover:bg-yellow-100'
                : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-400'
            }`}
            title={isStarred ? 'Unstar' : 'Star'}
          >
            <Star size={15} className={isStarred ? 'fill-yellow-400' : ''} />
          </button>
          <button
            onClick={handleArchive}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Archive"
          >
            <ArchiveX size={15} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Sender row */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${AVATAR_COLORS[colorIdx]}`}>
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">{senderDisplay.split('@')[0]}</p>
                <span className="text-sm text-gray-400">&lt;{senderDisplay}&gt;</span>
              </div>
              <p className="text-xs text-gray-400">
                to {email.recipient}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 flex-shrink-0">{formatFullDate(timestamp)}</p>
        </div>

        {/* Status badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            email.status === 'SENT'
              ? 'bg-green-100 text-green-700'
              : email.status === 'FAILED'
              ? 'bg-red-100 text-red-600'
              : 'bg-orange-100 text-orange-600'
          }`}>
            {email.status}
          </span>
        </div>

        {/* Email body */}
        <div
          className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none mb-6"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />

        {/* Attachments Section */}
        {attachments.length > 0 && (
          <div className="mt-8 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Paperclip size={13} />
              Attachments ({attachments.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachments.map((att, idx) => {
                const isImg =
                  att.contentType?.startsWith('image/') ||
                  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.filename);
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100/80 transition-colors group"
                  >
                    {(att.url || att.content) && isImg && (
                      <div className="w-full h-36 rounded-lg bg-gray-200 overflow-hidden border border-gray-200/60 flex items-center justify-center">
                        <img
                          src={att.url || att.content}
                          alt={att.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                        <Paperclip size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate" title={att.filename}>
                          {att.filename}
                        </p>
                        {att.size && (
                          <p className="text-[11px] text-gray-400">
                            {(att.size / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                      {(att.url || att.content) && (
                        <button
                          onClick={() => handleDownload(att)}
                          className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-white transition-colors"
                          title="Download Attachment"
                        >
                          <Download size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
