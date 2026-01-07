import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { LuTriangleAlert, LuLock, LuSearch } from "react-icons/lu";
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

  const focusInput = useCallback(() => {
    setIsFocused(true);
    const focusValue = isWelcome ? "" : url;
    setInputVal(focusValue);
    window.dispatchEvent(
      new CustomEvent("browser-addressbar-input", { detail: { value: focusValue } })
    );

    const input = inputRef.current;
    if (!input) return;

    input.focus();
    requestAnimationFrame(() => {
      input.select();
    });
  }, [isWelcome, url]);

  const handleFocus = () => {
    window.dispatchEvent(new CustomEvent("browser-addressbar-focus"));
    focusInput();
  };

  const handleBlur = () => {
    setIsFocused(false);
    window.dispatchEvent(new CustomEvent("browser-addressbar-blur"));
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== "l") return;
      event.preventDefault();
      focusInput();
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [focusInput]);

  useEffect(() => {
    const handleExternalFocus = () => {
      focusInput();
    };

    window.addEventListener("browser-focus-address-bar", handleExternalFocus);
    return () =>
      window.removeEventListener("browser-focus-address-bar", handleExternalFocus);
  }, [focusInput]);

  useEffect(() => {
    if (!window.electronAPI?.onFocusAddressBar) return undefined;
    return window.electronAPI.onFocusAddressBar(() => {
      focusInput();
    });
  }, [focusInput]);

  const getSearchUrl = useCallback((query: string) => {
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
  }, [customSearchUrl, searchEngine]);

  const normalizeTarget = useCallback(
    (value: string) => {
      let target = value.trim();
      if (!target) return "";

      if (!target.startsWith("http") && !target.startsWith("browser://")) {
        if (target.includes(".") && !target.includes(" ")) {
          target = `https://${target}`;
        } else {
          target = getSearchUrl(target);
        }
      }

      return target;
    },
    [getSearchUrl]
  );

  useEffect(() => {
    const handleSuggestionCommit = (event: Event) => {
      const custom = event as CustomEvent<{ value?: string }>;
      const value = custom.detail?.value ?? "";
      if (!value) return;
      setInputVal(value);
      const target = normalizeTarget(value);
      if (!target) return;
      onNavigate(target);
      inputRef.current?.blur();
    };

    window.addEventListener(
      "browser-suggestion-commit",
      handleSuggestionCommit as EventListener
    );
    return () =>
      window.removeEventListener(
        "browser-suggestion-commit",
        handleSuggestionCommit as EventListener
      );
  }, [normalizeTarget, onNavigate]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = normalizeTarget(inputVal);
    if (!target) return;
    onNavigate(target);
    inputRef.current?.blur();
  };
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputVal(value);
    window.dispatchEvent(
      new CustomEvent("browser-addressbar-input", { detail: { value } })
    );
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.currentTarget.blur();
    }
  };

  const secure = url.startsWith("https") || isWelcome;
  const placeholderText = "Search or enter URL";
  const displayText = inputVal || placeholderText;
  const inputSize = Math.max(1, displayText.length + 1);
  const compactWidth = `calc(${inputSize}ch + 24px)`; // 24px for padding and icon
  const minCompactWidth = '160px';
  const maxCompactWidth = '420px';

  return (
    <div className="flex-1 flex w-full relative z-20 electron-drag justify-center">
      <div
        className={`relative flex justify-center transition-[width,transform,filter] duration-200 ease-in-out
          ${
            isFocused
              ? "w-full max-w-5xl scale-100 drop-shadow-md"
              : "max-w-full scale-100"
          }
        `}
        style={{
          width: isFocused
            ? undefined
            : `clamp(${minCompactWidth}, ${compactWidth}, ${maxCompactWidth})`
        }}
      >
        <form
          onSubmit={handleSubmit}
          className="relative h-full w-full"
        >
          <div
            className={`relative flex items-center w-full h-8 overflow-hidden transition-all duration-300 backdrop-blur-lg
              ${
                isFocused
                  ? "bg-[color:var(--ui-surface-strong)] shadow border border-[color:var(--ui-border)]"
                  : "bg-[color:var(--ui-surface-muted)] hover:bg-[color:var(--ui-surface-muted)] border border-[color:var(--ui-border)]"
              }
              rounded-full`}
          >
            <div className="absolute left-2 flex items-center text-[color:var(--ui-text-muted)]">
              {isWelcome ? (
                <LuSearch size={12} />
              ) : secure ? (
                <LuLock size={12} />
              ) : (
                <span title="Connection is not secure" aria-label="Connection is not secure">
                  <LuTriangleAlert size={12} />
                </span>
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              size={isFocused ? undefined : inputSize}
              className="w-full h-full bg-transparent border-none outline-none text-sm text-[color:var(--ui-text)] placeholder:text-[color:var(--ui-text-muted)] electron-no-drag transition-[padding] duration-300 ease-in-out pl-7 pr-3 text-left"
              value={inputVal}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              aria-label="Address bar"
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
