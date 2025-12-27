import React, { memo } from 'react';
import { X, Plus, Globe } from 'lucide-react';
import { Tab } from '@/lib/types';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSwitch: (id: string) => void;
  onClose: (id: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
  orientation?: 'horizontal' | 'vertical';
}

export const TabBar = memo<TabBarProps>(({
  tabs,
  activeTabId,
  onSwitch,
  onClose,
  onNewTab,
  orientation = 'horizontal'
}) => {
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={[
        "electron-no-drag bg-neutral-100/70 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg",
        isVertical
          ? "flex flex-col gap-1 overflow-y-auto no-scrollbar p-1"
          : "flex items-center h-[32px] space-x-1 overflow-x-auto no-scrollbar mx-2 p-0.5 mb-1"
      ].join(" ")}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSwitch(tab.id)}
            className={`
              group relative flex items-center rounded-md px-2.5 text-xs select-none cursor-default transition-all duration-200
              ${isVertical ? 'w-full h-9' : 'min-w-[140px] max-w-[240px] flex-1 h-full'}
              ${isActive 
                ? 'bg-white/80 dark:bg-neutral-700/60 shadow-sm text-neutral-800 dark:text-neutral-100' 
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100'
              }
            `}
          >
            {/* Favicon */}
            <div className="mr-2 flex-shrink-0">
               {tab.favicon ? (
                 <img src={tab.favicon} alt="" className="w-3.5 h-3.5 opacity-80" />
               ) : (
                 <Globe size={14} className="opacity-50" />
               )}
            </div>

            {/* Title */}
            <span className="truncate flex-1 font-medium">{tab.title}</span>

            {/* Close Button - Only visible on hover or if active */}
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.id, e);
                }}
                className={`
                    ml-1 rounded-lg p-0.5 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/60
                    ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    transition-opacity
                `}
            >
                <X size={14} className="text-neutral-400 dark:text-neutral-500" />
            </div>
            
            {/* Separator (visual trick for non-active tabs) */}
            {!isVertical && !isActive && (
              <div className="absolute right-0 top-1.5 bottom-1.5 w-[1px] bg-neutral-300/80 dark:bg-neutral-700/70 group-hover:hidden" />
            )}
          </div>
        );
      })}
    </div>
  );
});

TabBar.displayName = 'TabBar';
