'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'gcf_favourites';

export function useFavourites() {
  const [favourites, setFavourites] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFavourites(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setFavourites(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(favourites);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
    },
    [favourites, persist]
  );

  const isFavourite = useCallback((id: string) => favourites.has(id), [favourites]);

  return { favourites, toggle, isFavourite };
}
