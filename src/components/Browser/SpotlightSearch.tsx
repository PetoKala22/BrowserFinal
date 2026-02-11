import React, { useEffect, useRef, useState } from 'react';
import { LuSearch, LuX } from 'react-icons/lu';
import { SuggestionsBar } from './Suggestions';
import { SearchEngine } from '@/lib/types';

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (url: string) => void;
  searchEngine: SearchEngine;
  tabs: Tab[];
  historyItems: Array<{ url: string; title: string; timestamp: number }>;
  historySorted: Array<{ url: string; title: string; timestamp: number }>;
  topSites: Array<{ id: string; label: string; value: string; hint: string; type: 'top' }>;
}

export const SpotlightSearch: React.FC<SpotlightSearchProps> = ({
  isOpen,
  onClose,
  onNavigate,
  searchEngine,
  tabs,
  historyItems,
  historySorted,
  topSites
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
      <div ref={modalRef} className="w-full max-w-2xl mx-4">
        {/* Search Input */}
        <div className="relative">
          <div className="flex items-center bg-[color:var(--ui-surface-strong)] shadow-sm border border-[color:var(--ui-border)] rounded-full shadow-2xl overflow-hidden">
            <div className="flex items-center pl-4 pr-2">
              <LuSearch className="w-5 h-5 text-[color:var(--ui-text-muted)]" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or enter address"
              className="flex-1 px-2 py-3 text-lg bg-transparent outline-none placeholder-[color:var(--ui-text-muted)] text-[color:var(--ui-text)]"
            />
            <button
              onClick={onClose}
              className="p-2 mr-2 rounded-lg hover:bg-[color:var(--ui-surface-muted)] transition-colors"
            >
              <LuX className="w-5 h-5 text-[color:var(--ui-text-muted)]" />
            </button>
          </div>
        </div>

        {/* Suggestions */}
        {query && (
          <div className="mt-2">
            <SuggestionsBar
              query={query}
              onSelect={(suggestion) => {
                onNavigate(suggestion.value);
                onClose();
              }}
              searchEngine={searchEngine}
              tabs={tabs}
              historyItems={historyItems}
              historySorted={historySorted}
              topSites={topSites}
              isOpen={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};