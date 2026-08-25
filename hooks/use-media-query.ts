'use client'

import { useSyncExternalStore } from 'react';

function subscribe(query: string, callback: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// Mirrors Tailwind's `md` breakpoint (768px) defined in app/globals.css's `@theme` block.
export const MOBILE_QUERY = '(max-width: 767px)';

export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);
