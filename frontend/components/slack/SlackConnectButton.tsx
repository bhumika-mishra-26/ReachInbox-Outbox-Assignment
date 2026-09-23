'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { slackApi } from '@/lib/api';
import type { SlackStatus } from '@/types';

export default function SlackConnectButton() {
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    slackApi.status().then((s) => { setStatus(s); setIsLoading(false); });
  }, []);

  const handleConnect = () => {
    window.location.href = slackApi.connectUrl();
  };

  if (isLoading) return null;

  if (status?.connected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm">
        <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
        <span className="text-green-700 font-medium">Slack connected</span>
        {status.teamName && <span className="text-green-500 text-xs">· {status.teamName}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-2 px-3 py-2 bg-[#4A154B] text-white rounded-xl text-sm font-medium hover:bg-[#3d1240] transition-colors"
    >
      <SlackLogo />
      Connect Slack
      <ExternalLink size={12} className="opacity-70" />
    </button>
  );
}

function SlackLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 54 54" fill="none">
      <path d="M19.7 0C17 0 14.8 2.2 14.8 5s2.2 5 5 5h5V5c0-2.8-2.3-5-5-5zm0 13.4H5c-2.8 0-5 2.2-5 5s2.2 5 5 5h14.8c2.8 0 5-2.2 5-5-.1-2.8-2.3-5-5.1-5z" fill="#36C5F0"/>
      <path d="M54 18.4c0-2.8-2.2-5-5-5s-5 2.2-5 5v5h5c2.8 0 5-2.2 5-5zm-13.4 0V3.7c0-2.8-2.2-5-5-5s-5 2.2-5 5v14.7c0 2.8 2.2 5 5 5s5-2.2 5-5z" fill="#2EB67D"/>
      <path d="M35.6 54c2.8 0 5-2.2 5-5s-2.2-5-5-5h-5v5c0 2.8 2.2 5 5 5zm0-13.4H50c2.8 0 5-2.2 5-5s-2.2-5-5-5H35.6c-2.8 0-5 2.2-5 5s2.2 5 5 5z" fill="#ECB22E"/>
      <path d="M0 35.6c0 2.8 2.2 5 5 5s5-2.2 5-5v-5H5c-2.8 0-5 2.3-5 5zm13.4 0V50c0 2.8 2.2 5 5 5s5-2.2 5-5V35.6c0-2.8-2.2-5-5-5s-5 2.2-5 5z" fill="#E01E5A"/>
    </svg>
  );
}
