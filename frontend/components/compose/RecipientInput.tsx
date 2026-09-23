'use client';

import { useState, KeyboardEvent, useRef } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { isValidEmail, parseEmailsFromFile } from '@/lib/utils';
import toast from 'react-hot-toast';

interface RecipientInputProps {
  recipients: string[];
  onChange: (recipients: string[]) => void;
}

export const FILE_INPUT_ID = 'recipient-csv-upload';

export default function RecipientInput({ recipients, onChange }: RecipientInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) { toast.error(`"${trimmed}" is not a valid email`); return; }
    if (recipients.includes(trimmed)) return;
    onChange([...recipients, trimmed]);
  };

  const removeEmail = (email: string) => onChange(recipients.filter((r) => r !== email));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', 'Tab'].includes(e.key)) {
      e.preventDefault();
      if (inputValue) { addEmail(inputValue); setInputValue(''); }
    }
    if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      removeEmail(recipients[recipients.length - 1]);
    }
  };

  const handleBlur = () => { if (inputValue) { addEmail(inputValue); setInputValue(''); } };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const emails = await parseEmailsFromFile(file);
      if (emails.length === 0) { toast.error('No valid email addresses found in file'); return; }
      const newEmails = emails.filter((em) => !recipients.includes(em));
      onChange([...recipients, ...newEmails]);
      toast.success(`Added ${newEmails.length} email${newEmails.length !== 1 ? 's' : ''} from "${file.name}"`);
    } catch {
      toast.error('Failed to parse file. Use CSV or TXT with one email per line.');
    } finally {
      setIsUploading(false);
      e.target.value = ''; // allow re-selecting same file
    }
  };

  const visibleRecipients = recipients.slice(0, 3);
  const hiddenCount = recipients.length - 3;

  return (
    <div className="flex items-start py-3 border-b border-gray-100 gap-2">
      <span className="text-sm text-gray-500 w-16 flex-shrink-0 pt-1.5">To</span>

      {/* Tag input area */}
      <div
        className="flex-1 flex flex-wrap items-center gap-1.5 cursor-text min-h-[30px]"
        onClick={() => inputRef.current?.focus()}
      >
        {visibleRecipients.map((email) => (
          <span
            key={email}
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-green-400 text-green-700 text-xs font-medium rounded-full"
          >
            {email}
            <button type="button" onClick={(e) => { e.stopPropagation(); removeEmail(email); }} className="text-green-400 hover:text-green-600 ml-0.5">
              <X size={11} />
            </button>
          </span>
        ))}
        {hiddenCount > 0 && (
          <span className="px-2.5 py-1 bg-white border border-green-400 text-green-700 text-xs font-medium rounded-full">+{hiddenCount}</span>
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="email"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={recipients.length === 0 ? 'recipient@example.com' : ''}
          className="flex-1 min-w-[160px] text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent py-0.5"
        />
      </div>

      {/* Upload List — label + overlay input for 100% browser compatibility */}
      <div className="flex-shrink-0 pt-1 relative inline-block">
        <input
          id={FILE_INPUT_ID}
          type="file"
          accept=".csv,.txt,.tsv,text/csv,text/plain"
          onChange={handleFileChange}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className={`flex items-center gap-1.5 text-sm font-medium select-none transition-colors ${
            isUploading ? 'text-gray-400' : 'text-green-600 hover:text-green-700'
          }`}
        >
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {isUploading ? 'Parsing…' : 'Upload List'}
        </div>
      </div>
    </div>
  );
}
