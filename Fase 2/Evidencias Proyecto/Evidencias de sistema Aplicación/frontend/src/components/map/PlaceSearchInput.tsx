import { useEffect, useRef, useState } from 'react';
import { searchPlaces } from '@/lib/supabase';
import type { SearchResult } from '@/types';

interface PlaceSearchInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onSelect: (lat: number, lng: number, displayName: string) => void;
}

export function PlaceSearchInput({ label, placeholder, value, onSelect }: PlaceSearchInputProps) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined && value !== query) setQuery(value);
  }, [value]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const data = await searchPlaces(query);
      setResults(data);
      setOpen(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(result: SearchResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setQuery(result.display_name);
    setResults([]);
    setOpen(false);
    onSelect(lat, lng, result.display_name);
  }

  return (
    <div className="relative" ref={containerRef}>
      {label && <span className="block text-label-md font-semibold text-on-surface mb-1">{label}</span>}
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-12 px-4 rounded bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none transition-colors"
        />
        {open && results.length > 0 && (
          <div className="mt-2 border border-outline-variant rounded-lg overflow-hidden bg-surface-container-lowest absolute z-[1200] w-full shadow-elevation-soft">
            {results.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-surface-container transition"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlaceSearchInput;
