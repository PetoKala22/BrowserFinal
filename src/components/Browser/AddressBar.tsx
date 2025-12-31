import React, { useState, useEffect, useRef, useMemo } from "react";
import { Shield, Search } from "lucide-react";
import { SearchEngine } from "@/lib/types";

interface AddressBarProps {
  url: string;
  onNavigate: (url: string) => void;
  loading: boolean;
  searchEngine: SearchEngine;
  customSearchUrl: string;
}

export const AddressBar: React.FC<AddressBarProps> = ({
  url,
  onNavigate,
  loading,
  searchEngine,
  customSearchUrl
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
  const placeholderText = "Search or enter URL";
  const displayText = inputVal || placeholderText;
  const inputSize = Math.max(1, displayText.length + 1);
  const compactWidth = `calc(${inputSize}ch + 24px)`; // 24px for padding and icon

  return (
    <div className="flex-1 flex w-full relative z-20 electron-drag justify-center">
      <div
        className={`relative flex justify-center transition-[width,transform,filter] duration-200 ease-in-out
          ${
            isFocused
              ? "w-full max-w-2xl scale-100 drop-shadow-md"
              : "max-w-full scale-100"
          }
        `}
        style={{ width: isFocused ? undefined : compactWidth }}
      >
        <form
          onSubmit={handleSubmit}
          className="relative h-full w-full"
        >
          <div
            className={`relative flex items-center w-full h-7 rounded-lg overflow-hidden transition-all duration-300
              ${
                isFocused
                  ? "bg-[color:var(--ui-surface-strong)] shadow ring-1 ring-[color:var(--ui-ring)]"
                  : "bg-[color:var(--ui-surface-subtle)] hover:bg-[color:var(--ui-surface-muted)]"
              }`}
          >
            <div className="absolute left-2 flex items-center text-[color:var(--ui-text-subtle)]">
              {secure ? (
                <Search size={12} strokeWidth={3} />
              ) : (
                <Shield size={12} strokeWidth={3} />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              size={isFocused ? undefined : inputSize}
              className="w-full h-full bg-transparent border-none outline-none text-xs text-[color:var(--ui-text)] placeholder:text-[color:var(--ui-text-subtle)] electron-no-drag transition-[padding] duration-300 ease-in-out pl-7 text-left"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholderText}
              spellCheck={false}
              autoComplete="off"
            />

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
