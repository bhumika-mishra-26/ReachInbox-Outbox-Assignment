'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Paperclip, Clock, Send, ChevronDown, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { senderApi, emailApi } from '@/lib/api';
import { format } from 'date-fns';
import RecipientInput, { FILE_INPUT_ID } from './RecipientInput';
import RichTextEditor from './RichTextEditor';
import SendLaterPanel from './SendLaterPanel';
import type { Sender } from '@/types';

interface ComposeViewProps {
  onBack: () => void;
  onScheduled?: (isImmediate?: boolean) => void;
}

export default function ComposeView({ onBack, onScheduled }: ComposeViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSender, setSelectedSender] = useState('');
  const [showSenderMenu, setShowSenderMenu] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [showSendLater, setShowSendLater] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSenders, setIsLoadingSenders] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setAttachments((prev) => [...prev, ...files]);
    toast.success(`Attached ${files.length} file${files.length > 1 ? 's' : ''}`);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    senderApi.list()
      .then((data) => {
        setSenders(data);
        if (data.length > 0) setSelectedSender(data[0].id);
      })
      .catch(() => {
        // Backend not connected yet — use placeholder
        setSenders([{ id: 'demo', email: 'demo@example.com', name: 'Demo Sender' }]);
        setSelectedSender('demo');
      })
      .finally(() => setIsLoadingSenders(false));
  }, []);

  const selectedSenderObj = senders.find((s) => s.id === selectedSender);

  const validate = (isImmediate = false): string | null => {
    if (!selectedSender) return 'Please select a sender';
    if (recipients.length === 0) return 'Add at least one recipient';
    if (!subject.trim()) return 'Subject is required';
    if (!body.trim() || body === '<p></p>') return 'Email body is required';
    if (!isImmediate) {
      if (!scheduledFor) return 'Please set a send time using "Send Later"';
      if (scheduledFor <= new Date()) return 'Scheduled time must be in the future';
    }
    return null;
  };

  const fileToBase64 = (file: File): Promise<{ filename: string; size: number; contentType: string; content: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        resolve({
          filename: file.name,
          size: file.size,
          contentType: file.type || 'application/octet-stream',
          content: reader.result as string,
        });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSend = async (isImmediate = false) => {
    const err = validate(isImmediate);
    if (err) { toast.error(err); return; }

    // DEBUG: trace attachment state
    console.log('[ComposeView] handleSend called. attachments state length:', attachments.length);
    attachments.forEach((f, i) => console.log(`[ComposeView]   File[${i}]: ${f.name} (${f.size} bytes)`));

    setIsSubmitting(true);
    try {
      const convertedAttachments = await Promise.all(attachments.map(fileToBase64));

      console.log('[ComposeView] convertedAttachments length:', convertedAttachments.length);
      convertedAttachments.forEach((a, i) => console.log(`[ComposeView]   Converted[${i}]: ${a.filename}, contentLength=${a.content?.length}`));

      const targetTime = isImmediate ? new Date() : scheduledFor!;

      const payload = {
        senderId: selectedSender,
        recipients,
        subject,
        body,
        scheduledFor: targetTime.toISOString(),
        delayBetweenEmailsSeconds: delaySeconds,
        hourlyLimit,
        attachments: convertedAttachments.length > 0 ? convertedAttachments : undefined,
      };

      console.log('[ComposeView] Payload attachments:', payload.attachments ? `${payload.attachments.length} items` : 'undefined');

      await emailApi.schedule(payload);
      toast.success(
        isImmediate
          ? `Sending ${recipients.length} email${recipients.length !== 1 ? 's' : ''}...`
          : `Scheduled ${recipients.length} email${recipients.length !== 1 ? 's' : ''} successfully!`
      );
      onScheduled?.(isImmediate);
      onBack();
    } catch (e) {
      console.error('[ComposeView] handleSend error:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to process email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-800 transition-colors"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-semibold text-gray-800 flex-1">Compose New Email</h1>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Attachment icon with file input overlay */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleAttachmentUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                attachments.length > 0 ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:bg-gray-100'
              }`}
              title="Attach files"
            >
              <Paperclip size={16} />
            </button>
          </div>

          {/* Schedule clock */}
          <button
            onClick={() => setShowSendLater((v) => !v)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              scheduledFor ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:bg-gray-100'
            }`}
            title="Schedule"
          >
            <Clock size={16} />
          </button>

          {/* Send / Send Later button */}
          {scheduledFor ? (
            <button
              id="schedule-send-btn"
              onClick={() => handleSend(false)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 border-2 border-green-500 text-green-600 font-semibold text-sm rounded-full hover:bg-green-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
              {`Send at ${format(scheduledFor, 'MMM d, h:mm a')}`}
            </button>
          ) : (
            <button
              onClick={() => setShowSendLater(true)}
              className="flex items-center gap-2 px-4 py-2 border-2 border-green-500 text-green-600 font-semibold text-sm rounded-full hover:bg-green-50 transition-colors"
            >
              <Clock size={13} />
              Send Later
            </button>
          )}

          {/* Direct send */}
          <button
            onClick={() => handleSend(true)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white font-semibold text-sm rounded-full hover:bg-green-600 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
            Send Now
          </button>
        </div>
      </div>

      {/* Send Later Panel */}
      {showSendLater && (
        <SendLaterPanel
          onClose={() => setShowSendLater(false)}
          onConfirm={(date) => { setScheduledFor(date); setShowSendLater(false); }}
          initialDate={scheduledFor || undefined}
        />
      )}

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        <div className="max-w-3xl mx-auto">
          {/* From */}
          <div className="flex items-center py-3 border-b border-gray-100 gap-3">
            <span className="text-sm text-gray-500 w-16 flex-shrink-0">From</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSenderMenu((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-gray-300 transition-colors"
              >
                {isLoadingSenders ? (
                  <Loader2 size={13} className="animate-spin text-gray-400" />
                ) : null}
                <span>{selectedSenderObj?.email || 'Select sender…'}</span>
                <ChevronDown size={13} className="text-gray-400" />
              </button>
              {showSenderMenu && senders.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {senders.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setSelectedSender(s.id); setShowSenderMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-gray-400 ml-1.5">{s.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* To (recipient input with upload) */}
          <RecipientInput recipients={recipients} onChange={setRecipients} />

          {/* Subject */}
          <div className="flex items-center py-3 border-b border-gray-100 gap-3">
            <span className="text-sm text-gray-500 w-16 flex-shrink-0">Subject</span>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
            />
          </div>

          {/* Delay + Hourly Limit */}
          <div className="flex items-center gap-6 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Delay between 2 emails</span>
              <input
                type="number"
                min={0}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 text-center focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <span className="text-xs text-gray-400">sec</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Hourly Limit</span>
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 text-center focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          </div>

          {/* Rich text body editor */}
          <div className="mt-4">
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Type Your Reply..."
              onAttach={handleAttachmentUpload}
            />
          </div>

          {/* Attachment list preview */}
          {attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-400 self-center font-medium">Attachments:</span>
              {attachments.map((file, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 text-gray-700 text-xs rounded-full"
                >
                  <Paperclip size={12} className="text-gray-400" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <span className="text-gray-400">({(file.size / 1024).toFixed(0)}KB)</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-gray-400 hover:text-red-500 ml-1"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Recipient count info */}
          {recipients.length > 0 && (
            <p className="mt-3 text-xs text-gray-400">
              <span className="text-green-600 font-semibold">{recipients.length}</span> recipient{recipients.length !== 1 ? 's' : ''} detected
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
