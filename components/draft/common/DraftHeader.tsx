// ./components/DraftHeader.tsx

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Download, Menu, RefreshCcw } from "lucide-react";
import { League, Draft, LeagueSettings } from '@/lib/types/';
import Profile from '@/components/common/Profile';

interface DraftHeaderProps {
  league: League | null | undefined;
  draft: Draft | null | undefined;
  additionalContent?: React.ReactNode;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const DraftHeader: React.FC<DraftHeaderProps> = ({ league, draft, additionalContent }) => {
  const isLoading = !league || !draft;
  const pathname = usePathname();
  const [isUpdatingADP, setIsUpdatingADP] = useState(false);

  const { data: isCommissionerData, error: isCommissionerError } = useSWR(
    league ? `/api/db/league/${league.league_key}/isCommissioner` : null,
    fetcher
  );

  const { data: leagueSettings, error: leagueSettingsError } = useSWR<LeagueSettings>(
    league ? `/api/yahoo/league/${league.league_key}/leagueSettings` : null,
    fetcher
  );

  const isCommissioner = isCommissionerData?.isCommissioner;

  const setTitle = (name: string | undefined) => {
    if (!name) return '';
    return name.endsWith('s') ? name + "'" : name + "'s";
  };

  const NavButton: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => {
    const isActive = pathname === href;
    return (
      <Button
        asChild
        variant={isActive ? "default" : "ghost"}
        size="sm"
        className="w-full justify-start"
      >
        <Link href={href}>{children}</Link>
      </Button>
    );
  };

  const handleExport = async (type: 'csv' | 'pdf') => {
    if (!draft) return;

    try {
      const response = await fetch(`/api/db/draft/${draft.id}/export?type=${type}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `draft_export_${draft.id}.${type}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Draft exported as ${type.toUpperCase()} successfully`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(`Failed to export draft as ${type.toUpperCase()}. Please try again.`);
    }
  };

  const handleUpdateADP = async () => {
    if (!draft || !league || !leagueSettings) return;
    setIsUpdatingADP(true);

    const toastId = toast.loading("Initiating ADP update...");

    try {
      let scoringType = 'standard';
      
      if (leagueSettings.stat_categories) {
        const recStat = Array.isArray(leagueSettings.stat_categories) 
          ? leagueSettings.stat_categories.find((stat: any) => stat.name === 'Rec')
          : null;
        
        if (recStat && typeof recStat === 'object' && 'value' in recStat && typeof recStat.value === 'number' && recStat.value > 0) {
          scoringType = 'ppr';
        }
      }

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

      toast.loading("ADP update started. This may take a few minutes...", { id: toastId });

      // Poll for job progress
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/db/importJob/${jobId}`);
          if (!progressResponse.ok) {
            throw new Error('Failed to fetch ADP update progress');
          }
          const { status, progress } = await progressResponse.json();

          if (status === 'complete') {
            clearInterval(pollInterval);
            toast.success("ADP update completed successfully", { id: toastId });
            setIsUpdatingADP(false);
          } else if (status === 'error') {
            clearInterval(pollInterval);
            throw new Error('ADP update failed');
          } else {
            toast.loading(`Updating ADP... ${progress}%`, { id: toastId });
          }
        } catch (error) {
          clearInterval(pollInterval);
          console.error('Error during ADP update:', error);
          toast.error("ADP update encountered an error. Please try again.", { id: toastId });
          setIsUpdatingADP(false);
        }
      }, 2000);
    } catch (error: any) {
      console.error('Failed to update ADP:', error);
      if (error.message === 'Unauthorized. Commissioner access required.') {
        toast.error("You must be a commissioner to update ADP.", { id: toastId });
      } else {
        toast.error("Failed to start ADP update. Please try again.", { id: toastId });
      }
      setIsUpdatingADP(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4 overflow-hidden">
          <Link href="/dashboard" className="flex-shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={league?.logo_url || ''} alt={league?.name} />
              <AvatarFallback>{league?.name?.[0]}</AvatarFallback>
            </Avatar>
          </Link>
          <Link href={`/draft/${draft?.id}`} className="font-bold truncate">
            {isLoading ? (
              <Skeleton className="h-4 w-[200px]" />
            ) : (
              <>
                <span className="hidden sm:inline">
                  {`${setTitle(league?.name)} ${draft?.name} Draft`}
                </span>
                <span className="sm:hidden truncate">
                  {draft?.name}
                </span>
              </>
            )}
          </Link>
        </div>
        <nav className="hidden md:flex items-center space-x-2">
          <NavButton href={`/draft/${draft?.id}`}>Draft Central</NavButton>
          <NavButton href={`/draft/${draft?.id}/board`}>Draft Board</NavButton>
          {isCommissioner && (
            <NavButton href={`/draft/${draft?.id}/kiosk`}>Kiosk Mode</NavButton>
          )}
          {isCommissioner && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleUpdateADP} 
              disabled={isUpdatingADP}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Update ADP
            </Button>  
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="flex items-center space-x-4">
          {additionalContent}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem className="p-0">
                <NavButton href={`/draft/${draft?.id}`}>Draft Central</NavButton>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-0">
                <NavButton href={`/draft/${draft?.id}/board`}>Draft Board</NavButton>
              </DropdownMenuItem>
              {isCommissioner && (
                <DropdownMenuItem className="p-0">
                  <NavButton href={`/draft/${draft?.id}/kiosk`}>Kiosk Mode</NavButton>
                </DropdownMenuItem>
              )}
              {isCommissioner && (
                <DropdownMenuItem className="p-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleUpdateADP} 
                    disabled={isUpdatingADP}
                    className="w-full justify-start"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Update ADP
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleExport('csv')}>
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('pdf')}>
                        Export as PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Profile />
        </div>
      </div>
    </header>
  );
};

export default DraftHeader;