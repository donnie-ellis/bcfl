// ./components/ModifyDraftDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Draft } from '@/lib/types/';
import { Settings, Play, Pause, Clock, Timer, RefreshCcw } from 'lucide-react';
import { toast } from "sonner";

interface ModifyDraftDialogProps {
  draft: Draft;
  onDraftUpdated?: (updatedDraft: Draft) => void;
  className?: string;
}

const ModifyDraftDialog: React.FC<ModifyDraftDialogProps> = ({ 
  draft, 
  onDraftUpdated,
  className = "" 
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [draftName, setDraftName] = useState(draft.name);
  const [useTimer, setUseTimer] = useState(draft.use_timer || false);
  const [isTimerPaused, setIsTimerPaused] = useState(!!draft.is_paused);
  const [pickSeconds, setPickSeconds] = useState(draft.pick_seconds || 90);

  useEffect(() => {
    setDraftName(draft.name);
    setUseTimer(draft.use_timer || false);
    setPickSeconds(draft.pick_seconds || 90);
    const fetchTimerStatus = async () => {
          if (!draft) return;
    
          const response = await fetch(`/api/db/draft/${draft.id}/timer/status`);
          if (!response.ok) {
            console.error('Error fetching timer status:', response.statusText);
            return;
          }
    
          const data = await response.json();
          if (data.is_paused) {
            setIsTimerPaused(true);
          } else {
            setIsTimerPaused(false);
          }
        };
    
        fetchTimerStatus();
  }, [draft, isDialogOpen]);

  // Preset time options for quick selection
  const timePresets = [
    { label: '30 seconds', value: 30 },
    { label: '1 minute', value: 60 },
    { label: '90 seconds', value: 90 },
    { label: '2 minutes', value: 120 },
    { label: '3 minutes', value: 180 },
    { label: '5 minutes', value: 300 },
  ];

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds % 60 === 0) {
      return `${Math.floor(seconds / 60)}m`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
  };

  const handleTimerToggle = async () => {
    if (!useTimer) return;
    
    setIsUpdating(true);
    const newPausedState = !isTimerPaused;
    
    try {
      const endpoint = newPausedState 
        ? `/api/db/draft/${draft.id}/timer/pause`
        : `/api/db/draft/${draft.id}/timer/start`;
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seconds: pickSeconds,
          pickId: null // Current pick will be determined server-side
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${newPausedState ? 'pause' : 'start'} timer`);
      }

      setIsTimerPaused(newPausedState);
      toast.success(`Timer ${newPausedState ? 'paused' : 'started'} successfully`);
    } catch (error) {
      console.error('Error toggling timer:', error);
      toast.error(`Failed to ${newPausedState ? 'pause' : 'start'} timer`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateADP = async () => {
    setIsUpdating(true);
    const toastId = toast.loading("Initiating ADP update...");

    try {
      // Get league settings for scoring type
      const leagueResponse = await fetch(`/api/yahoo/league/${draft.league_id}/leagueSettings`);
      if (!leagueResponse.ok) {
        throw new Error('Failed to fetch league settings');
      }
      const leagueSettings = await leagueResponse.json();

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
          leagueId: draft.league_id,
          scoringType,
          numTeams: 10, // This should come from league settings
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
            setIsUpdating(false);
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
          setIsUpdating(false);
        }
      }, 2000);
    } catch (error: any) {
      console.error('Failed to update ADP:', error);
      toast.error(error.message || "Failed to start ADP update. Please try again.", { id: toastId });
      setIsUpdating(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!draftName.trim()) {
      toast.error('Draft name cannot be empty');
      return;
    }

    if (useTimer && (pickSeconds < 10 || pickSeconds > 600)) {
      toast.error('Pick time must be between 10 seconds and 10 minutes');
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/db/draft/${draft.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: draftName,
          use_timer: useTimer,
          pick_seconds: pickSeconds,
          // Don't update is_paused here - that's handled by timer controls
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update draft');
      }

      const updatedDraft = await response.json();
      
      if (onDraftUpdated) {
        onDraftUpdated(updatedDraft);
      }

      toast.success('Draft settings updated successfully');
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating draft:', error);
      toast.error(error.message || 'Failed to update draft settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePickSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 10 && value <= 600) {
      setPickSeconds(value);
    }
  };

  const getTimerStatusBadge = () => {
    if (!useTimer) {
      return <Badge variant="outline">Timer Disabled</Badge>;
    }
    if (isTimerPaused) {
      return <Badge variant="warn">Timer Paused</Badge>;
    }
    return <Badge variant="success">Timer Running</Badge>;
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Settings className="mr-2 h-4 w-4" />
          Draft Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Modify Draft Settings
          </DialogTitle>
          <DialogDescription>
            Update draft settings, timer controls, and other preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[calc(90vh-160px)] overflow-y-auto pr-4 space-y-6">
          {/* Draft Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Draft Information</h3>
              <Badge variant="outline">{draft.status?.toUpperCase()}</Badge>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="draft-name">Draft Name</Label>
              <Input
                id="draft-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                disabled={isUpdating}
              />
            </div>
          </div>

          <Separator />

          {/* Timer Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Timer Settings</h3>
              {getTimerStatusBadge()}
            </div>

            {/* Enable/Disable Timer */}
            <div className="flex items-center space-x-2">
              <Switch
                id="use-timer"
                checked={useTimer}
                onCheckedChange={setUseTimer}
                disabled={isUpdating}
              />
              <Label htmlFor="use-timer" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Enable Pick Timer
              </Label>
            </div>

            {useTimer && (
              <div className="ml-6 space-y-4 p-4 bg-muted/30 rounded-lg border">
                {/* Timer Duration */}
                <div className="space-y-2">
                  <Label htmlFor="pick-seconds">Time per pick (seconds)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="pick-seconds"
                      type="number"
                      min="10"
                      max="600"
                      value={pickSeconds}
                      onChange={handlePickSecondsChange}
                      disabled={isUpdating}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      ({formatTime(pickSeconds)})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Between 10 seconds and 10 minutes
                  </p>
                </div>

                {/* Quick time presets */}
                <div className="space-y-2">
                  <Label className="text-sm">Quick presets:</Label>
                  <div className="flex flex-wrap gap-2">
                    {timePresets.map((preset) => (
                      <Button
                        key={preset.value}
                        variant={pickSeconds === preset.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPickSeconds(preset.value)}
                        disabled={isUpdating}
                        className="text-xs h-7"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Timer Controls */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Timer Controls:</Label>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={isTimerPaused ? "default" : "outline"}
                      size="sm"
                      onClick={handleTimerToggle}
                      disabled={isUpdating}
                      className="flex items-center gap-2"
                    >
                      {isTimerPaused ? (
                        <>
                          <Play className="h-4 w-4" />
                          Start Timer
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4" />
                          Pause Timer
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded border-l-2 border-blue-200 dark:border-blue-800">
                    <p className="font-medium">Timer Status:</p>
                    <p className="mt-1">
                      {!useTimer ? 
                        "Timer is disabled for this draft" :
                        isTimerPaused ? 
                          "Timer is currently paused" : 
                          "Timer is currently running"
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Additional Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Additional Actions</h3>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpdateADP}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Update ADP
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Timer className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModifyDraftDialog;