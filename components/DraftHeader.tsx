// ./components/DraftHeader.tsx
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Profile from '@/components/Profile';
import { League, Draft } from '@/lib/types';

interface DraftHeaderProps {
  league: League | null;
  draft: Draft | null;
  additionalContent?: React.ReactNode;
}

const DraftHeader: React.FC<DraftHeaderProps> = ({ league, draft, additionalContent }) => {
  return (
    <div className="flex justify-between items-center p-4 bg-background">
      <h1 className="text-2xl font-bold flex gap-4">
        <Avatar className='h-12 w-12'>
          <AvatarFallback>{league?.name}</AvatarFallback>
          <AvatarImage src={league?.logo_url} alt={league?.name} />
        </Avatar>
        {`${league?.name} ${draft?.name} Draft`}
      </h1>
      <div className="flex items-center space-x-4">
        {additionalContent}
        <Profile />
      </div>
    </div>
  );
};

export default DraftHeader;