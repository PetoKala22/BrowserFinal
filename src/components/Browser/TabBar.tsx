import React, { memo } from 'react';
import { LuX, LuGlobe } from 'react-icons/lu';
import { Tab } from '@/lib/types';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSwitch: (id: string) => void;
  onClose: (id: string, e: React.MouseEvent) => void;
  orientation?: 'horizontal' | 'vertical';
}

export const TabBar = memo<TabBarProps>(({
  tabs,
  activeTabId,
  onSwitch,
  onClose,
  orientation = 'horizontal'
}) => {
  const isVertical = orientation === 'vertical';

  return (
    <div
      role="tablist"
      aria-orientation={isVertical ? 'vertical' : 'horizontal'}
      className={[
        "electron-no-drag mb-1",
        isVertical
          ? "flex flex-col gap-1 overflow-y-auto no-scrollbar"
          : "flex items-center h-[32px] space-x-1 overflow-x-auto no-scrollbar mx-2 p-0.5"
      ].join(" ")}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSwitch(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSwitch(tab.id);
              }
            }}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            aria-label={tab.title || tab.url}
            className={`
              group relative flex items-center rounded-full px-2.5 text-xs select-none cursor-pointer transition-all duration-200
              ${isVertical ? 'w-full h-9' : 'min-w-[140px] max-w-[240px] flex-1 h-full'}
              ${isActive 
                ? 'bg-[color:var(--ui-surface)] shadow-sm text-[color:var(--ui-text)]' 
                : 'text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)]'
              }
            `}
          >
            {/* Favicon */}
            <div className="mr-2 flex-shrink-0">
               {tab.favicon ? (
                 <img src={tab.favicon} alt="" className="w-3.5 h-3.5 opacity-80" />
               ) : (
                 <span className="opacity-50"><LuGlobe size={14} /></span>
               )}
            </div>
            {tab.loading && (
              <div className="mr-2 flex h-3 w-3 items-center justify-center">
                <div className="h-3 w-3 animate-spin rounded-full border border-[color:var(--ui-border)] border-t-[color:var(--ui-accent)]" />
              </div>
            )}

            {/* Title */}
            <span className="truncate flex-1 font-medium">{tab.title}</span>

            {/* Close Button - Only visible on hover or if active */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id, e);
              }}
              aria-label={`Close ${tab.title || tab.url}`}
              className={`
                ml-1 rounded-full p-0.5 hover:bg-[color:var(--ui-hover)]
                ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                transition-opacity
              `}
            >
              <span className="text-[color:var(--ui-text-subtle)]"><LuX size={14} /></span>
            </button>
            
            {/* Separator (visual trick for non-active tabs) */}
            {!isVertical && !isActive && (
              <div className="absolute right-0 top-1.5 bottom-1.5 w-[1px] bg-[color:var(--ui-border)] group-hover:hidden" />
            )}
          </div>
        );
      })}
    </div>
  );
});

TabBar.displayName = 'TabBar';
