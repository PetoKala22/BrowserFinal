import React, { memo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Settings } from 'lucide-react';
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
  onOpenSettings: () => void;
  settingsActive: boolean;
}

export const RightSidebar = memo<RightSidebarProps>(
  ({
    tabs,
    activeTabId,
    address,
    loading,
    canGoBack,
    canGoForward,
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
    onOpenSettings,
    settingsActive
  }) => {
    return (
      <aside className="w-[300px] shrink-0 bg-transparent flex flex-col">
        <div className="px-2 pt-3 pb-4">
          <div className="flex items-center justify-between gap-2 electron-drag">
            <div className="flex items-center gap-1 electron-no-drag">
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
            className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-[color:var(--ui-text)] hover:bg-[color:var(--ui-hover)] transition-colors flex items-center justify-center"
          >
            <span className="inline-flex items-center gap-2">
              <Plus size={14} />
              New tab
            </span>
          </button>
        </div>

        <div className="px-2 pb-3 pt-2">
          <button
            onClick={onOpenSettings}
            className={`w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors flex items-center justify-center
              ${
                settingsActive
                  ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)]'
                  : 'text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-hover)]'
              }`}
          >
            <span className="inline-flex items-center gap-2">
              <Settings size={14} />
              Settings
            </span>
          </button>
        </div>
      </aside>
    );
  }
);

RightSidebar.displayName = 'RightSidebar';
