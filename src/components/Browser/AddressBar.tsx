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
}

export const AddressBar: React.FC<AddressBarProps> = ({
  url,
  onNavigate,
  onReload,
  onStop,
  loading,
  searchEngine,
  customSearchUrl,
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

  return (
    <div className="flex-1 flex justify-center w-full relative z-20 electron-drag">
      <div
        className={`relative flex justify-center w-full transition-[max-width,transform,filter] duration-300 ease-in-out
          ${
            isFocused
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
            className={`relative flex items-center w-full h-8 rounded-lg border overflow-hidden transition-all duration-300
              ${
                isFocused
                  ? "bg-white/80 dark:bg-neutral-950/50 border-transparent shadow ring-1 ring-neutral-200/80 dark:ring-neutral-700/80"
                  : "bg-neutral-100/70 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 hover:bg-white/70"
              }`}
          >
            {!isWelcome && (
              <div className="absolute left-2 flex items-center text-neutral-400 dark:text-neutral-500">
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
              className={`w-full h-full bg-transparent border-none outline-none text-sm pr-6 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-600 dark:placeholder:text-neutral-500 electron-no-drag ${
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
                  className="cursor-pointer text-neutral-600 dark:text-neutral-500"
                  onClick={onStop}
                />
              ) : (
                <RotateCw
                  size={14}
                  className="cursor-pointer text-neutral-600 dark:text-neutral-500"
                  onClick={onReload}
                />
              )}
            </div>

            {loading && (
              <div
                className="absolute bottom-0 left-0 h-[2px] bg-neutral-800/80 dark:bg-neutral-100/80 transition-all duration-300"
                style={{ width: "35%" }}
              />
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
