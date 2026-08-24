// ./components/AppHeader.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  left: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

/** Shared sticky header shell used across /dashboard and /draft/* so both halves of the app share one chrome treatment. */
const AppHeader: React.FC<AppHeaderProps> = ({ left, center, right, className }) => {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-header/20 bg-header text-header-foreground backdrop-blur-sm supports-backdrop-filter:bg-header/95',
        className
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center space-x-4 overflow-hidden">{left}</div>
        {center && <nav className="hidden items-center space-x-2 md:flex">{center}</nav>}
        <div className="flex shrink-0 items-center space-x-4">{right}</div>
      </div>
    </header>
  );
};

export default AppHeader;
