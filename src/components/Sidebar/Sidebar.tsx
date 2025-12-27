import React, { memo } from "react";
import { Book, Glasses, Clock, Settings, LucideIcon } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  historyActive: boolean;
  settingsActive: boolean;
}

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, label, active, onClick }) => (
  <div
    className={[
      "flex items-center gap-3 px-3 py-2 border rounded-lg text-sm cursor-default mb-0.5 transition-colors",
      active
        ? "bg-neutral-300/60 text-neutral-900 dark:bg-neutral-800/70 dark:text-neutral-100 font-medium border-neutral-200 dark:border-neutral-800"
        : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 border-transparent"
    ].join(" ")}
    onClick={onClick}
  >
    <Icon size={16} />
    <span>{label}</span>
  </div>
);

export const Sidebar = memo<SidebarProps>(({
  isOpen,
  onOpenHistory,
  onOpenSettings,
  historyActive,
  settingsActive
}) => {
  return (
    <div
      className={[
        "h-full bg-neutral-100/70 dark:bg-neutral-900/60 border-r border-t border-neutral-200 dark:border-neutral-800 rounded-tr-lg",
        "flex flex-col pt-3 pb-4 relative z-20 self-start overflow-hidden",
        "transition-[transform,opacity,width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isOpen
          ? "w-[240px] translate-x-0 opacity-100"
          : "w-0 -translate-x-4 opacity-0 pointer-events-none overflow-hidden border-r-0"
      ].join(" ")}
      aria-hidden={!isOpen}
    >
      <div className="px-4 mb-4">
        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Favorites
        </span>
      </div>

      {/* Scrollable section */}
      <div className="px-2 flex-1 overflow-y-auto scrollbar-hide">
        <MenuItem icon={Book} label="Bookmarks" />
        <MenuItem icon={Glasses} label="Reading List" />
        <MenuItem icon={Clock} label="History" active={historyActive} onClick={onOpenHistory} />
      </div>

      {/* Bottom fixed section */}
      <div className="px-2 mt-4 pt-4 border-t border-neutral-200/70 dark:border-neutral-800/70">
        <MenuItem
          icon={Settings}
          label="Settings"
          active={settingsActive}
          onClick={onOpenSettings}
        />
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';
