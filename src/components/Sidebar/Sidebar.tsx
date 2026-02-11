import { memo } from "react";
import { LuBook, LuGlasses, LuClock, LuSettings } from "react-icons/lu";
import { IconType } from "react-icons";

interface SidebarProps {
  isOpen: boolean;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  historyActive: boolean;
  settingsActive: boolean;
  position?: "left" | "right";
}

interface MenuItemProps {
  icon: IconType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const MenuItem = ({
  icon: Icon,
  label,
  active = false,
  onClick
}: MenuItemProps) => {
  const baseClasses =
    "flex items-center gap-3 px-3 py-2 mb-0.5 rounded-xl text-sm font-sans transition-colors cursor-default";

  const stateClasses = active
    ? "bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)] font-medium"
    : "text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-hover)]";

  return (
    <div
      role="button"
      onClick={onClick}
      className={`${baseClasses} ${stateClasses}`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </div>
  );
};

export const Sidebar = memo(
  ({
    isOpen,
    onOpenHistory,
    onOpenSettings,
    historyActive,
    settingsActive,
    position = "left"
  }: SidebarProps) => {
    const isRight = position === "right";

    const openClasses = [
      "h-[calc(100%-4rem)] w-[240px] translate-x-0 opacity-100 rounded-3xl my-8 mx-4"
    ].join(" ");

    const closedClasses = [
      "h-[calc(100%-4rem)] w-0 opacity-0 pointer-events-none overflow-hidden rounded-2xl my-8 mx-0",
      isRight ? "translate-x-4" : "-translate-x-4"
    ].join(" ");

    return (
      <div
        aria-hidden={!isOpen}
        className={[
          "bg-[color:var(--ui-surface)] shadow-lg backdrop-blur-xl",
          "flex flex-col pt-3 pb-4 relative z-20 self-start overflow-hidden",
          "transition-[transform,opacity,width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isOpen ? openClasses : closedClasses
        ].join(" ")}
      >
        <div className="px-4 mb-4">
          <span className="text-xs font-sans font-semibold uppercase tracking-wider text-[color:var(--ui-text-muted)]">
            Favorites
          </span>
        </div>

        {/* Scrollable section */}
        <div className="px-2 flex-1 overflow-y-auto scrollbar-hide">
          <MenuItem icon={LuBook} label="Bookmarks" />
          <MenuItem icon={LuGlasses} label="Reading List" />
          <MenuItem
            icon={LuClock}
            label="History"
            active={historyActive}
            onClick={onOpenHistory}
          />
        </div>

        {/* Bottom fixed section */}
        <div className="px-2 mt-4 pt-4">
          <MenuItem
            icon={LuSettings}
            label="Settings"
            active={settingsActive}
            onClick={onOpenSettings}
          />
        </div>
      </div>
    );
  }
);

Sidebar.displayName = "Sidebar";
