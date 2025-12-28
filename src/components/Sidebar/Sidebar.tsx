import React, { memo } from "react";
import { Book, Glasses, Clock, Settings, LucideIcon } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  historyActive: boolean;
  settingsActive: boolean;
  position?: 'left' | 'right';
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
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-default mb-0.5 transition-colors",
      active
        ? "bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)] font-medium"
        : "text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-hover)]"
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
  settingsActive,
  position = 'left'
}) => {
  const isRight = position === 'right';

  return (
    <div
      className={[
        "h-full bg-[color:var(--ui-surface)] backdrop-blur-xl",
        "flex flex-col pt-3 pb-4 relative z-20 self-start overflow-hidden",
        "transition-[transform,opacity,width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isOpen
          ? "w-[240px] translate-x-0 opacity-100"
          : [
              "w-0 opacity-0 pointer-events-none overflow-hidden",
              isRight ? "translate-x-4" : "-translate-x-4"
            ].join(" ")
      ].join(" ")}
      aria-hidden={!isOpen}
    >
      <div className="px-4 mb-4">
        <span className="text-xs font-semibold text-[color:var(--ui-text-muted)] uppercase tracking-wider">
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
      <div className="px-2 mt-4 pt-4">
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
