import React from 'react';
import { useStore } from '../store';

export default function CategoryChips({ compact = false }: { compact?: boolean }): React.ReactElement {
  const { data, t, lang, categoryId, setCategoryId } = useStore();
  if (!data) return <></>;
  const cats = [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <div className={`chips${compact ? ' chips--compact' : ''}`} role="group" aria-label={t('nav.categories')}>
      <button
        type="button"
        className={`chip${categoryId === null ? ' chip--on' : ''}`}
        onClick={() => setCategoryId(null)}
        aria-pressed={categoryId === null}
      >
        {t('category.all')}
      </button>
      {cats.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`chip${categoryId === c.id ? ' chip--on' : ''}`}
          onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
          aria-pressed={categoryId === c.id}
        >
          <span aria-hidden="true">{c.icon}</span> {lang === 'af' ? c.nameAf : c.nameEn}
        </button>
      ))}
    </div>
  );
}
