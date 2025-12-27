import React, { memo } from 'react';
import { ChevronLeft, ChevronRight, PanelLeft, Plus } from 'lucide-react';
import { AddressBar } from '@/components/Browser/AddressBar';
import { TabBar } from '@/components/Browser/TabBar';
import { WindowControls } from '@/components/Browser/WindowControls';
import { IconButton } from '@/components/ui/IconButton';
import { SearchEngine, Tab } from '@/lib/types';

interface RightSidebarProps {
  tabs: Tab[];
  activeTabId: string;
  address: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  sidebarOpen: boolean;
  searchEngine: SearchEngine;
  customSearchUrl: string;
  onNavigate: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onStop: () => void;
  onSwitchTab: (id: string) => void;
  onCloseTab: (id: string, event: React.MouseEvent) => void;
  onNewTab: () => void;
  onToggleLeftSidebar: () => void;
}

export const RightSidebar = memo<RightSidebarProps>(
  ({
    tabs,
    activeTabId,
    address,
    loading,
    canGoBack,
    canGoForward,
    sidebarOpen,
    searchEngine,
    customSearchUrl,
    onNavigate,
    onGoBack,
    onGoForward,
    onReload,
    onStop,
    onSwitchTab,
    onCloseTab,
    onNewTab,
    onToggleLeftSidebar
  }) => {
    return (
      <aside className="w-[300px] shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/60 flex flex-col">
        <div className="px-3 pt-3 pb-4 border-b border-neutral-200/70 dark:border-neutral-800/70">
          <div className="flex items-center justify-between gap-2 electron-drag">
            <div className="flex items-center gap-1 electron-no-drag">
              <IconButton onClick={onToggleLeftSidebar} active={sidebarOpen}>
                <PanelLeft size={18} strokeWidth={2} />
              </IconButton>
              <IconButton disabled={!canGoBack} onClick={onGoBack}>
                <ChevronLeft size={18} strokeWidth={2.5} />
              </IconButton>
              <IconButton disabled={!canGoForward} onClick={onGoForward}>
                <ChevronRight size={18} strokeWidth={2.5} />
              </IconButton>
            </div>
            <div className="electron-no-drag">
              <WindowControls />
            </div>
          </div>

          <div className="mt-3">
            <AddressBar
              url={address}
              onNavigate={onNavigate}
              onReload={onReload}
              onStop={onStop}
              loading={loading}
              searchEngine={searchEngine}
              customSearchUrl={customSearchUrl}
              variant="sidebar"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSwitch={onSwitchTab}
            onClose={onCloseTab}
            onNewTab={onNewTab}
            orientation="vertical"
          />
        </div>

        <div className="px-2 pb-3">
          <button
            onClick={onNewTab}
            className="w-full rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <Plus size={14} />
              New tab
            </span>
          </button>
        </div>
      </aside>
    );
  }
);

RightSidebar.displayName = 'RightSidebar';
