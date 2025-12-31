import React, { memo } from 'react';
import { ChevronLeft, ChevronRight, PanelLeft, Plus, RotateCw, Share, X } from 'lucide-react';
import { AddressBar } from '@/components/Browser/AddressBar';
import { WindowControls } from '@/components/Browser/WindowControls';
import { IconButton } from '@/components/ui/IconButton';
import { SearchEngine } from '@/lib/types';

interface BrowserToolbarProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  address: string;
  onNavigate: (url: string) => void;
  onReload: () => void;
  onStop: () => void;
  loading: boolean;
  searchEngine: SearchEngine;
  customSearchUrl: string;
  onNewTab: () => void;
}

export const BrowserToolbar = memo<BrowserToolbarProps>(
  ({
    sidebarOpen,
    onSidebarToggle,
    canGoBack,
    canGoForward,
    onGoBack,
    onGoForward,
    address,
    onNavigate,
    onReload,
    onStop,
    loading,
    searchEngine,
    customSearchUrl,
    onNewTab
  }) => {
    return (
      <div className="h-9 flex items-center w-full gap-2 electron-no-drag relative bg-transparent">
        <div className="flex items-center gap-4 min-w-[140px] z-10">
          <div className="flex items-center gap-1 pl-1">
            <IconButton onClick={onSidebarToggle} active={sidebarOpen}>
              <PanelLeft size={18} strokeWidth={2} />
            </IconButton>
            <IconButton disabled={!canGoBack} onClick={onGoBack}>
              <ChevronLeft size={18} strokeWidth={2.5} />
            </IconButton>
            <IconButton disabled={!canGoForward} onClick={onGoForward}>
              <ChevronRight size={18} strokeWidth={2.5} />
            </IconButton>
            <IconButton
              onClick={loading ? onStop : onReload}
              aria-label={loading ? 'Stop loading' : 'Reload'}
            >
              {loading ? <X size={16} /> : <RotateCw size={16} />}
            </IconButton>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 w-[440px] max-w-[60vw]">
          <AddressBar
            url={address}
            onNavigate={onNavigate}
            loading={loading}
            searchEngine={searchEngine}
            customSearchUrl={customSearchUrl}
          />
        </div>

        <div className="flex items-center gap-1 min-w-[140px] justify-end ml-auto z-10">
          <IconButton>
            <Share size={16} strokeWidth={2} />
          </IconButton>
          <IconButton onClick={onNewTab}>
            <Plus size={16} strokeWidth={2.5} />
          </IconButton>

          <div className="ml-2 pl-2 self-start">
            <WindowControls />
          </div>
        </div>
      </div>
    );
  }
);

BrowserToolbar.displayName = 'BrowserToolbar';
