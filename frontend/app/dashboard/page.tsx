'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import ScheduledList from '@/components/email/ScheduledList';
import SentList from '@/components/email/SentList';
import EmailDetailView from '@/components/email/EmailDetailView';
import ComposeView from '@/components/compose/ComposeView';
import SlackConnectButton from '@/components/slack/SlackConnectButton';
import Spinner from '@/components/ui/Spinner';
import { emailApi } from '@/lib/api';
import type { ScheduledEmail, SentEmail } from '@/types';

type Tab = 'scheduled' | 'sent';
type View = 'list' | 'compose' | 'detail';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('scheduled');
  const [view, setView] = useState<View>('list');
  const [selectedEmail, setSelectedEmail] = useState<ScheduledEmail | SentEmail | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'STARRED' | 'SENT' | 'SCHEDULED' | 'FAILED'>('ALL');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Counts for sidebar badges
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  // Load counts
  const loadCounts = useCallback(async () => {
    try {
      const [scheduled, sent] = await Promise.all([
        emailApi.getScheduled(),
        emailApi.getSent(),
      ]);
      setScheduledCount(scheduled.length);
      setSentCount(sent.length);
    } catch {
      // backend not connected yet
    }
  }, []);

  // Periodic polling for badge counts
  useEffect(() => {
    loadCounts();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadCounts();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [loadCounts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    await loadCounts();
    setIsRefreshing(false);
  };

  // Handle Slack connect query param
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('slack') === 'connected') {
      url.searchParams.delete('slack');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  const handleSelectScheduled = (email: ScheduledEmail) => {
    setSelectedEmail(email);
    setView('detail');
  };

  const handleSelectSent = (email: SentEmail) => {
    setSelectedEmail(email);
    setView('detail');
  };

  const handleBack = () => {
    setSelectedEmail(null);
    setView('list');
  };

  const handleCompose = () => {
    setView('compose');
    setSelectedEmail(null);
  };

  const handleScheduled = () => {
    setRefreshTrigger((prev) => prev + 1);
    loadCounts();
    setView('list');
    setActiveTab('scheduled');
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white relative">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveFilter('ALL');
          setView('list');
          setSelectedEmail(null);
        }}
        onCompose={handleCompose}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar with Slack button inline — only shown in list view */}
        {view === 'list' && (
          <TopBar
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeTab={activeTab}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen((v) => !v)}
            rightSlot={<SlackConnectButton />}
          />
        )}

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex">
          {view === 'compose' ? (
            <div className="flex-1 overflow-hidden">
              <ComposeView onBack={handleBack} onScheduled={handleScheduled} />
            </div>
          ) : view === 'detail' && selectedEmail ? (
            <div className="flex-1 overflow-hidden">
              <EmailDetailView email={selectedEmail} onBack={handleBack} onDelete={() => handleScheduled()} />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeTab === 'scheduled' ? (
                <ScheduledList
                  onSelect={handleSelectScheduled}
                  selectedId={selectedEmail?.id}
                  searchQuery={searchQuery}
                  activeFilter={activeFilter}
                  refreshTrigger={refreshTrigger}
                />
              ) : (
                <SentList
                  onSelect={handleSelectSent}
                  selectedId={selectedEmail?.id}
                  searchQuery={searchQuery}
                  activeFilter={activeFilter}
                  refreshTrigger={refreshTrigger}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
