'use client';

import { useState } from 'react';
import { ArrowLeft, Star, Trash2, ArchiveX, Paperclip, Download, ExternalLink, Calendar, User, Mail } from 'lucide-react';
import { formatFullDate, getInitials, getColorIndex } from '@/lib/utils';
import type { ScheduledEmail, SentEmail, EmailAttachment } from '@/types';
import { emailApi } from '@/lib/api';
import toast from 'react-hot-toast';

const AVATAR_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-amber-500', 'bg-rose-500',
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
  const isSent = email.status === 'SENT';
  const isFailed = email.status === 'FAILED';
  const previewUrl = 'previewUrl' in email ? (email as SentEmail).previewUrl : null;

  const rawSender = email.senderEmail || email.senderId || 'ReachInbox Sender';
  // Check if sender looks like a raw UUID; if so, display a clean label
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSender);
  const senderDisplay = isUuid ? 'ReachInbox Scheduler' : rawSender;
  const colorIdx = getColorIndex(senderDisplay);
  const initials = getInitials(senderDisplay.split('@')[0] || 'S');
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

  const [previewAttachment, setPreviewAttachment] = useState<EmailAttachment | null>(null);

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
    <div className="flex flex-col h-full bg-slate-50/60">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-slate-100 transition-colors"
            title="Back to list"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">
              {email.subject}
            </h2>
            <p className="text-xs text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
              <Mail size={12} className="text-gray-400" />
              <span>To: <strong className="text-gray-700">{email.recipient}</strong></span>
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors mr-2 shadow-2xs"
              title="View Ethereal Email Preview"
            >
              <ExternalLink size={13} />
              View Ethereal HTML
            </a>
          )}
          <button
            onClick={handleToggleStar}
            className={`p-2 rounded-xl transition-colors ${
              isStarred
                ? 'text-amber-400 bg-amber-50 hover:bg-amber-100'
                : 'text-gray-400 hover:bg-gray-100 hover:text-amber-400'
            }`}
            title={isStarred ? 'Unstar' : 'Star'}
          >
            <Star size={17} className={isStarred ? 'fill-amber-400' : ''} />
          </button>
          <button
            onClick={handleArchive}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Archive"
          >
            <ArchiveX size={17} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 rounded-xl text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-8">
          {/* Sender Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-bold shadow-xs flex-shrink-0 ${AVATAR_COLORS[colorIdx]}`}>
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 truncate">
                    {senderDisplay.split('@')[0]}
                  </h3>
                  {!isUuid && (
                    <span className="text-xs text-gray-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 truncate">
                      {senderDisplay}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <User size={12} className="text-gray-400" />
                  <span>to <strong className="text-gray-700">{email.recipient}</strong></span>
                </p>
              </div>
            </div>

            {/* Date & Status Badge */}
            <div className="flex sm:flex-col items-start sm:items-end justify-between gap-2.5 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
                <Calendar size={13} className="text-gray-400" />
                <span>{formatFullDate(timestamp)}</span>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                isSent
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : isFailed
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                  : 'bg-amber-50 text-amber-700 border border-amber-200/80'
              }`}>
                ● {email.status}
              </span>
            </div>
          </div>

          {/* Email Body */}
          <div
            className="text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none mb-8 min-h-[100px] whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: email.body }}
          />

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Paperclip size={14} className="text-emerald-600" />
                Attachments ({attachments.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attachments.map((att, idx) => {
                  const isImg =
                    att.contentType?.startsWith('image/') ||
                    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.filename);
                  const isPdf = att.contentType === 'application/pdf' || /\.pdf$/i.test(att.filename);
                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-3 p-4 bg-slate-50/70 border border-gray-200/80 rounded-2xl hover:border-emerald-300 hover:shadow-xs transition-all duration-200 group"
                    >
                      {(att.url || att.content) && isImg && (
                        <div
                          onClick={() => setPreviewAttachment(att)}
                          className="w-full h-44 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center p-2 cursor-pointer relative group/img"
                        >
                          <img
                            src={att.url || att.content}
                            alt={att.filename}
                            className="max-h-full max-w-full object-contain rounded-lg group-hover/img:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity rounded-xl gap-1.5">
                            <ExternalLink size={14} /> Preview Image
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">
                          <Paperclip size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate" title={att.filename}>
                            {att.filename}
                          </p>
                          {att.size && (
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {(att.size / 1024).toFixed(1)} KB
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {(isImg || isPdf) && (att.url || att.content) && (
                            <button
                              onClick={() => setPreviewAttachment(att)}
                              className="p-2 text-gray-400 hover:text-emerald-600 rounded-xl hover:bg-white shadow-2xs transition-all"
                              title="Preview Attachment"
                            >
                              <ExternalLink size={15} />
                            </button>
                          )}
                          {(att.url || att.content) && (
                            <button
                              onClick={() => handleDownload(att)}
                              className="p-2 text-gray-400 hover:text-emerald-600 rounded-xl hover:bg-white shadow-2xs transition-all"
                              title="Download Attachment"
                            >
                              <Download size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* In-App Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 truncate">
                Preview: {previewAttachment.filename}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewAttachment)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  <Download size={14} /> Download
                </button>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/5 min-h-[400px]">
              {previewAttachment.contentType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(previewAttachment.filename) ? (
                <img
                  src={previewAttachment.url || previewAttachment.content}
                  alt={previewAttachment.filename}
                  className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-md"
                />
              ) : (
                <iframe
                  src={previewAttachment.url || previewAttachment.content}
                  title={previewAttachment.filename}
                  className="w-full h-[75vh] rounded-xl border border-gray-200"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

