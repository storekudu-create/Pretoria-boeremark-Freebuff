import React from 'react';
import { useStore } from '../store';

export default function SearchBar(): React.ReactElement {
  const { t, query, setQuery } = useStore();
  return (
    <div className="searchbar">
      <input
        type="search"
        inputMode="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('home.searchPlaceholder')}
        aria-label={t('home.searchPlaceholder')}
      />
      {query && (
        <button type="button" className="searchbar-clear" onClick={() => setQuery('')} aria-label={t('search.clear')}>
          ✕
        </button>
      )}
    </div>
  );
}
