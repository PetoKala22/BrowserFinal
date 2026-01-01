import React, { memo, useLayoutEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, PanelLeft, Plus, RotateCw, Share, X, Shield } from 'lucide-react';
import { WindowControls } from '@/components/Browser/WindowControls';
import { IconButton } from '@/components/ui/IconButton';

interface BrowserToolbarProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onStop: () => void;
  loading: boolean;
  onNewTab: () => void;
  adBlockEnabled: boolean;
  onToggleAdBlock: () => void;
  onShieldLayout?: (rect: DOMRect) => void;
}

export const BrowserToolbar = memo<BrowserToolbarProps>(
  ({
    sidebarOpen,
    onSidebarToggle,
    canGoBack,
    canGoForward,
    onGoBack,
    onGoForward,
    onReload,
    onStop,
    loading,
    onNewTab,
    adBlockEnabled,
    onToggleAdBlock,
    onShieldLayout
  }) => {
    const shieldRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
      if (!onShieldLayout) return;
      const update = () => {
        const node = shieldRef.current;
        if (!node) return;
        onShieldLayout(node.getBoundingClientRect());
      };
      update();
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }, [onShieldLayout]);

    return (
      <div className="h-9 flex items-center w-full gap-2 electron-no-drag relative">
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

        <div className="flex items-center gap-1 min-w-[140px] justify-end ml-auto z-10">
          <IconButton onClick={onNewTab}>
            <Plus size={16} strokeWidth={2.5} />
          </IconButton>
          <IconButton>
            <Share size={16} strokeWidth={2} />
          </IconButton>
          <div className="relative" ref={shieldRef}>
            <IconButton>
              <Shield size={16} strokeWidth={2.5} />
            </IconButton>
          </div>

          <div className="ml-2 pl-2 self-start">
            <WindowControls />
          </div>
        </div>
      </div>
    );
  }
);

BrowserToolbar.displayName = 'BrowserToolbar';
