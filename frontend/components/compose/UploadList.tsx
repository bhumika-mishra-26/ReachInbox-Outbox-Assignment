'use client';

import { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { parseEmailsFromFile } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UploadListProps {
  /** Called with the parsed email addresses from the uploaded file */
  onEmailsParsed: (emails: string[]) => void;
  /** Already-loaded emails count for display */
  existingCount?: number;
}

export default function UploadList({ onEmailsParsed, existingCount = 0 }: UploadListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedCount, setParsedCount] = useState(0);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);

    try {
      const emails = await parseEmailsFromFile(file);
      setParsedCount(emails.length);

      if (emails.length === 0) {
        toast.error('No valid email addresses found in the file.');
        setFileName(null);
        return;
      }

      onEmailsParsed(emails);
      toast.success(
        `Detected ${emails.length} email address${emails.length !== 1 ? 'es' : ''} from "${file.name}"`
      );
    } catch {
      toast.error('Failed to read file. Please use a CSV or TXT file.');
      setFileName(null);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    setFileName(null);
    setParsedCount(0);
    onEmailsParsed([]);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Upload trigger */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Upload size={15} />
        )}
        {isLoading ? 'Parsing…' : 'Upload List'}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,.tsv"
        onChange={handleFile}
        className="hidden"
        id="upload-list-input"
      />

      {/* File info pill — shown after upload */}
      {fileName && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs">
          <FileText size={13} className="text-green-600 flex-shrink-0" />
          <span className="text-green-700 font-medium truncate max-w-[180px]">{fileName}</span>
          {parsedCount > 0 && (
            <span className="text-green-500 flex-shrink-0">
              · {parsedCount} email{parsedCount !== 1 ? 's' : ''}
            </span>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="ml-auto text-green-400 hover:text-green-600 flex-shrink-0"
            title="Remove file"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Help text */}
      {!fileName && (
        <p className="text-xs text-gray-400">
          Accepts .csv or .txt — one email per line or comma-separated.
        </p>
      )}
    </div>
  );
}
