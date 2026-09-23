import { useEffect, useState, useCallback, useRef } from 'react';
import { emailApi } from '@/lib/api';
import type { ScheduledEmail, SentEmail } from '@/types';

export interface UseEmailsOptions {
  pollInterval?: number; // ms, default 3000ms. Set to 0 to disable.
  refreshTrigger?: number | string;
}

export function useScheduledEmails(options: UseEmailsOptions = {}) {
  const { pollInterval = 3000, refreshTrigger } = options;
  const [emails, setEmails] = useState<ScheduledEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const fetchEmails = useCallback(async (isSilent = false) => {
    if (!isSilent && isFirstLoad.current) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await emailApi.getScheduled();
      setEmails(data);
    } catch (e) {
      if (!isSilent) {
        setError(e instanceof Error ? e.message : 'Failed to load scheduled emails');
      }
    } finally {
      setIsLoading(false);
      isFirstLoad.current = false;
    }
  }, []);

  // Initial load and explicit refresh trigger
  useEffect(() => {
    fetchEmails(false);
  }, [fetchEmails, refreshTrigger]);

  // Periodic polling & focus revalidation
  useEffect(() => {
    if (pollInterval <= 0) return;

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchEmails(true);
    }, pollInterval);

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchEmails(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [fetchEmails, pollInterval]);

  return { emails, isLoading, error, refetch: () => fetchEmails(false) };
}

export function useSentEmails(options: UseEmailsOptions = {}) {
  const { pollInterval = 3000, refreshTrigger } = options;
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const fetchEmails = useCallback(async (isSilent = false) => {
    if (!isSilent && isFirstLoad.current) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await emailApi.getSent();
      setEmails(data);
    } catch (e) {
      if (!isSilent) {
        setError(e instanceof Error ? e.message : 'Failed to load sent emails');
      }
    } finally {
      setIsLoading(false);
      isFirstLoad.current = false;
    }
  }, []);

  // Initial load and explicit refresh trigger
  useEffect(() => {
    fetchEmails(false);
  }, [fetchEmails, refreshTrigger]);

  // Periodic polling & focus revalidation
  useEffect(() => {
    if (pollInterval <= 0) return;

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchEmails(true);
    }, pollInterval);

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchEmails(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [fetchEmails, pollInterval]);

  return { emails, isLoading, error, refetch: () => fetchEmails(false) };
}
