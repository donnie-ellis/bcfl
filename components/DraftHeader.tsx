// /components/DraftHeader.tsx
'use client'

import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Profile from '@/components/Profile';
import { League, Draft } from '@/lib/types';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Sun, Moon, RefreshCcw } from "lucide-react";
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from "framer-motion";
import useSWR from 'swr';
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface DraftHeaderProps {
  league: League | null | undefined;
  draft: Draft | null | undefined;
  additionalContent?: React.ReactNode;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const DraftHeader: React.FC<DraftHeaderProps> = ({ league, draft, additionalContent }) => {
  const { theme, setTheme } = useTheme();
  const isLoading = !league || !draft;
  const [isUpdatingADP, setIsUpdatingADP] = useState(false);

  const { data: isCommissionerData, error: isCommissionerError } = useSWR(
    league ? `/api/db/league/${league.league_key}/isCommissioner` : null,
    fetcher
  );

  const { data: leagueSettings, error: leagueSettingsError } = useSWR(
    league ? `/api/yahoo/league/${league.league_key}/leagueSettings` : null,
    fetcher
  );

  const isCommissioner = isCommissionerData?.isCommissioner;

  const handleUpdateADP = async () => {
    if (!draft || !league || !leagueSettings) return;
    setIsUpdatingADP(true);

    try {
      const recStat = leagueSettings.stat_categories.find((stat: any) => stat.name === 'Rec');
      const scoringType = recStat && recStat.value > 0 ? 'ppr' : 'standard';

      const response = await fetch(`/api/db/draft/${draft.id}/players/adp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueId: league.league_key,
          scoringType,
          numTeams: league.num_teams,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start ADP update');
      }
      const { jobId } = await response.json();

      const toastId = toast.loading("Updating ADP...", {
        duration: Infinity,
        description: <Progress value={0} className="w-full mt-2" />,
      });

      // Poll for job progress
      const pollInterval = setInterval(async () => {
        const progressResponse = await fetch(`/api/db/importJob/${jobId}`);
        const { status, progress } = await progressResponse.json();

        if (status === 'complete') {
          clearInterval(pollInterval);
          toast.success("ADP update completed", { id: toastId });
          setIsUpdatingADP(false);
        } else {
          toast.loading("Updating ADP...", {
            id: toastId,
            description: <Progress value={progress} className="w-full mt-2" />,
          });
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to update ADP:', error);
      if (error.message === 'Unauthorized. Commissioner access required.') {
        toast.error("You must be a commissioner to update ADP.");
      } else {
        toast.error("Failed to start ADP update. Please try again.");
      }
      setIsUpdatingADP(false);
    }
  };

  const NavButtons = () => (
    <>
      <Link href={`/draft/${draft?.id}`} passHref>
        <Button variant="outline">Draft Central</Button>
      </Link>
      <Link href={`/draft/${draft?.id}/board`} passHref>
        <Button variant="outline">Draft Board</Button>
      </Link>
      <AnimatePresence>
        {isCommissioner && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link href={`/draft/${draft?.id}/kiosk`} passHref>
              <Button variant="outline">Kiosk Mode</Button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      {isCommissioner && (
        <Button variant="outline" onClick={handleUpdateADP} disabled={isUpdatingADP}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Update ADP
        </Button>
      )}
    </>
  );

  const ThemeToggle = () => (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );

  return (
    <div className="flex justify-between items-center p-4 bg-background">
      <h1 className="text-2xl font-bold flex gap-4 items-center">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </>
        ) : (
          <>
            <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
              <Avatar className='h-12 w-12'>
                <AvatarFallback>{league.name?.[0]}</AvatarFallback>
                <AvatarImage src={league.logo_url} alt={league.name} />
              </Avatar>
            </Link>
            <span className="hidden md:inline">{`${league.name} ${draft.name} Draft`}</span>
            <span className="md:hidden">{draft.name}</span>
          </>
        )}
      </h1>
      <div className="flex items-center space-x-4">
        {isLoading ? (
          <>
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </>
        ) : (
          <>
            <div className="hidden md:flex space-x-2">
              <NavButtons />
            </div>
            <ThemeToggle />
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-[1.2rem] w-[1.2rem]" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>{league.name}</SheetTitle>
                    <SheetDescription>{draft.name} Draft</SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col space-y-2 mt-4">
                    <NavButtons />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            {additionalContent}
            <Profile />
          </>
        )}
      </div>
    </div>
  );
};

export default DraftHeader;