import React, { useState, useEffect, useRef, useMemo } from "react";
import { Shield, Search, RotateCw, X } from "lucide-react";
import { SearchEngine } from "@/lib/types";

interface AddressBarProps {
  url: string;
  onNavigate: (url: string) => void;
  onReload: () => void;
  onStop: () => void;
  loading: boolean;
  searchEngine: SearchEngine;
  customSearchUrl: string;
  variant?: "toolbar" | "sidebar";
}

export const AddressBar: React.FC<AddressBarProps> = ({
  url,
  onNavigate,
  onReload,
  onStop,
  loading,
  searchEngine,
  customSearchUrl,
  variant = "toolbar"
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState("");

  const isWelcome = url === "browser://welcome";

  const displayDomain = useMemo(() => {
    if (isWelcome || !url) return "";
    try {
      const normalized = url.startsWith("http") ? url : `https://${url}`;
      const host = new URL(normalized).hostname;
      return host.replace(/^www\./, "");
    } catch {
      return url;
    }
  }, [url, isWelcome]);

  const [isFocused, setIsFocused] = useState(false);

  // Only sync from props when NOT focused
  useEffect(() => {
    if (!isFocused) {
      setInputVal(isWelcome ? "" : displayDomain);
    }
  }, [displayDomain, isFocused, isWelcome]);

  const handleFocus = () => {
    setIsFocused(true);

    // When focusing, show the full URL
    setInputVal(isWelcome ? "" : url);

    const input = inputRef.current;
    if (!input) return;

    // Wait until after value is applied & rendered, then select
    requestAnimationFrame(() => {
      input.select();
    });
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const getSearchUrl = (query: string) => {
    const encoded = encodeURIComponent(query);
    switch (searchEngine) {
      case SearchEngine.YAHOO:
        return `https://search.yahoo.com/search?p=${encoded}`;
      case SearchEngine.DUCKDUCKGO:
        return `https://duckduckgo.com/?q=${encoded}`;
      case SearchEngine.BING:
        return `https://www.bing.com/search?q=${encoded}`;
      case SearchEngine.CUSTOM:
        if (!customSearchUrl.trim()) {
          return `https://www.google.com/search?q=${encoded}`;
        }
        if (customSearchUrl.includes("{query}")) {
          return customSearchUrl.replace("{query}", encoded);
        }
        return `${customSearchUrl}${customSearchUrl.includes("?") ? "&" : "?"}q=${encoded}`;
      case SearchEngine.GOOGLE:
      default:
        return `https://www.google.com/search?q=${encoded}`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputVal.trim();

    if (!target.startsWith("http") && !target.startsWith("browser://")) {
      if (target.includes(".") && !target.includes(" ")) {
        target = `https://${target}`;
      } else {
        target = getSearchUrl(target);
      }
    }

    onNavigate(target);
    inputRef.current?.blur();
  };

  const secure = url.startsWith("https") || isWelcome;
  const isSidebar = variant === "sidebar";

  return (
    <div
      className={`flex-1 flex w-full relative z-20 electron-drag ${
        isSidebar ? "justify-start" : "justify-center"
      }`}
    >
      <div
        className={`relative flex justify-center w-full transition-[max-width,transform,filter] duration-300 ease-in-out
          ${
            isSidebar
              ? "max-w-full scale-100"
              : isFocused
                ? "max-w-2xl scale-100 drop-shadow-md"
                : "max-w-[240px] hover:max-w-[260px] scale-95"
          }
        `}
      >
        <form
          onSubmit={handleSubmit}
          className="relative w-full h-full"
        >
          <div
            className={`relative flex items-center w-full ${
              isSidebar ? "h-9 rounded-lg" : "h-8 rounded-lg"
            } overflow-hidden transition-all duration-300 backdrop-blur-xl
              ${
                isFocused
                  ? "bg-[color:var(--ui-surface-strong)] shadow ring-1 ring-[color:var(--ui-ring)]"
                  : "bg-[color:var(--ui-surface)] hover:bg-[color:var(--ui-hover)]"
              }`}
          >
            {!isWelcome && (
              <div className="absolute left-2 flex items-center text-[color:var(--ui-text-muted)]">
                {secure ? (
                  <Search size={12} strokeWidth={3} />
                ) : (
                  <Shield size={12} strokeWidth={3} />
                )}
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              className={`w-full h-full bg-transparent border-none outline-none text-sm pr-6 text-[color:var(--ui-text)] placeholder:text-[color:var(--ui-text-subtle)] electron-no-drag ${
                isWelcome ? 'pl-3' : 'pl-7'
              }`}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Search or enter URL"
              spellCheck={false}
              autoComplete="off"
            />

            <div className="absolute right-2 flex items-center">
              {loading ? (
                <X
                  size={14}
                  className="cursor-pointer text-[color:var(--ui-text-subtle)]"
                  onClick={onStop}
                />
              ) : (
                <RotateCw
                  size={14}
                  className="cursor-pointer text-[color:var(--ui-text-subtle)]"
                  onClick={onReload}
                />
              )}
            </div>

            {loading && (
              <div
                className="absolute bottom-0 left-0 h-[2px] bg-[color:var(--ui-accent)] transition-all duration-300"
                style={{ width: "35%" }}
              />
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
