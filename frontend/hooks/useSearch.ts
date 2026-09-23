import { useState, useEffect, useRef, useCallback } from 'react';
import { searchApi } from '@/lib/api';
import type { SearchResult } from '@/types';

export function useSearch(debounceMs = 400) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchApi.search(q);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => doSearch(query), debounceMs);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [query, debounceMs, doSearch]);

  const clear = () => { setQuery(''); setResults([]); };

  return { query, setQuery, results, isSearching, clear };
}
