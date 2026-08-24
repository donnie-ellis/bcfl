// ./app/dashboard/settings/SettingsForm.tsx
'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppHeader from '@/components/AppHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { League } from '@/lib/types/league.types';
import { Team } from '@/lib/types/team.types';
import {
  LeagueSettings,
  RosterPosition,
  StatCategory,
  parseRosterPositions,
  parseStatCategories,
} from '@/lib/types/league-settings.types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function SettingsForm() {
  const [league, setLeague] = useState<League | null>(null);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rosterPositions, setRosterPositions] = useState<RosterPosition[]>([]);
  const [statCategories, setStatCategories] = useState<StatCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTeamId, setInviteTeamId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const leagueData: League = await fetcher('/api/db/league');
        setLeague(leagueData);

        const [settingsData, teamsData] = await Promise.all([
          fetch(`/api/db/league/${leagueData.id}/settings`).then(r => r.ok ? r.json() : null),
          fetch(`/api/db/league/${leagueData.id}/teams`).then(r => r.ok ? r.json() : []),
        ]);

        if (settingsData) {
          setLeagueSettings(settingsData);
          setRosterPositions(parseRosterPositions(settingsData.roster_positions));
          setStatCategories(parseStatCategories(settingsData.stat_categories));
        }
        setTeams(teamsData || []);
      } catch (error) {
        console.error('Failed to load league settings:', error);
        toast.error('Failed to load league settings');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const saveLeagueBasics = async (updates: Partial<League>) => {
    if (!league) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/db/league/${league.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to save');
      const updated = await response.json();
      setLeague(updated);
      toast.success('League updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save league');
    } finally {
      setIsSaving(false);
    }
  };

  const saveSettings = async (updates: Partial<LeagueSettings>) => {
    if (!league) return;
    setIsSaving(true);
    try {
      const merged = { ...leagueSettings, ...updates };
      const response = await fetch(`/api/db/league/${league.id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      if (!response.ok) throw new Error('Failed to save');
      setLeagueSettings(merged as LeagueSettings);
      toast.success('Settings saved');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const saveRosterAndScoring = async () => {
    await saveSettings({
      roster_positions: rosterPositions as any,
      stat_categories: statCategories as any,
    });
  };

  const addRosterPosition = () => {
    setRosterPositions([...rosterPositions, { roster_position: { position: '', count: 1 } }]);
  };

  const updateRosterPosition = (index: number, field: 'position' | 'count', value: string) => {
    const next = [...rosterPositions];
    next[index] = {
      roster_position: {
        ...next[index].roster_position,
        [field]: field === 'count' ? parseInt(value) || 0 : value,
      },
    };
    setRosterPositions(next);
  };

  const removeRosterPosition = (index: number) => {
    setRosterPositions(rosterPositions.filter((_, i) => i !== index));
  };

  const addStatCategory = () => {
    setStatCategories([...statCategories, {
      stat_id: statCategories.length + 1,
      name: '',
      display_name: '',
      sort_order: statCategories.length + 1,
      position_type: '',
      is_only_display_stat: false,
      value: 0,
    }]);
  };

  const updateStatCategory = (index: number, field: 'name' | 'display_name' | 'value', value: string) => {
    const next = [...statCategories];
    next[index] = {
      ...next[index],
      [field]: field === 'value' ? parseFloat(value) || 0 : value,
    };
    setStatCategories(next);
  };

  const removeStatCategory = (index: number) => {
    setStatCategories(statCategories.filter((_, i) => i !== index));
  };

  const addTeam = async () => {
    if (!league) return;
    try {
      const response = await fetch(`/api/db/league/${league.id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ name: 'New Team' }]),
      });
      if (!response.ok) throw new Error('Failed to add team');
      const { data } = await response.json();
      setTeams([...teams, ...(data || [])]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to add team');
    }
  };

  const renameTeam = async (team: Team, name: string) => {
    setTeams(teams.map(t => t.id === team.id ? { ...t, name } : t));
  };

  const saveTeam = async (team: Team) => {
    if (!league) return;
    try {
      const response = await fetch(`/api/db/league/${league.id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ id: team.id, name: team.name, logo_url: team.logo_url }]),
      });
      if (!response.ok) throw new Error('Failed to save team');
      toast.success('Team saved');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save team');
    }
  };

  const deleteTeam = async (teamId: number) => {
    if (!league) return;
    try {
      const response = await fetch(`/api/db/league/${league.id}/teams`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
      if (!response.ok) throw new Error('Failed to delete team');
      setTeams(teams.filter(t => t.id !== teamId));
      toast.success('Team deleted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete team');
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Enter an email address');
      return;
    }
    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          teamId: inviteTeamId ? parseInt(inviteTeamId) : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send invite');
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteTeamId('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to send invite');
    }
  };

  if (isLoading || !league) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <>
      <AppHeader
        left={
          <>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <span className="font-bold truncate">League Settings</span>
          </>
        }
      />
      <div className="container mx-auto p-4 max-w-4xl">
      <Tabs defaultValue="league">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="league">League</TabsTrigger>
          <TabsTrigger value="roster">Roster & Scoring</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="managers">Managers</TabsTrigger>
        </TabsList>

        <TabsContent value="league">
          <Card>
            <CardHeader><CardTitle>League Basics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={league.name}
                  onChange={(e) => setLeague({ ...league, name: e.target.value })}
                  onBlur={() => saveLeagueBasics({ name: league.name })}
                />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={league.logo_url ?? ''}
                  onChange={(e) => setLeague({ ...league, logo_url: e.target.value })}
                  onBlur={() => saveLeagueBasics({ logo_url: league.logo_url })}
                />
              </div>
              <div>
                <Label>Season</Label>
                <Input
                  type="number"
                  value={league.season ?? ''}
                  onChange={(e) => setLeague({ ...league, season: parseInt(e.target.value) || null })}
                  onBlur={() => saveLeagueBasics({ season: league.season })}
                />
              </div>
              <div>
                <Label>Number of Teams</Label>
                <Input
                  type="number"
                  value={league.num_teams ?? ''}
                  onChange={(e) => setLeague({ ...league, num_teams: parseInt(e.target.value) || null })}
                  onBlur={() => saveLeagueBasics({ num_teams: league.num_teams })}
                />
              </div>
              <div>
                <Label>Draft Type</Label>
                <Input
                  value={leagueSettings?.draft_type ?? ''}
                  placeholder="snake, auction, linear"
                  onChange={(e) => setLeagueSettings({ ...(leagueSettings as LeagueSettings), draft_type: e.target.value })}
                  onBlur={() => saveSettings({ draft_type: leagueSettings?.draft_type })}
                />
              </div>
              <div>
                <Label>Scoring Type</Label>
                <Input
                  value={leagueSettings?.scoring_type ?? ''}
                  placeholder="standard, ppr, half-ppr"
                  onChange={(e) => setLeagueSettings({ ...(leagueSettings as LeagueSettings), scoring_type: e.target.value })}
                  onBlur={() => saveSettings({ scoring_type: leagueSettings?.scoring_type })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Uses Playoffs</Label>
                <Switch
                  checked={!!leagueSettings?.uses_playoff}
                  onCheckedChange={(checked) => saveSettings({ uses_playoff: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Uses FAAB</Label>
                <Switch
                  checked={!!leagueSettings?.uses_faab}
                  onCheckedChange={(checked) => saveSettings({ uses_faab: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roster">
          <Card>
            <CardHeader><CardTitle>Roster Positions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {rosterPositions.map((pos, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Position (e.g. QB, W/R/T, BN)"
                    value={pos.roster_position.position}
                    onChange={(e) => updateRosterPosition(index, 'position', e.target.value)}
                    className="w-48"
                  />
                  <Input
                    type="number"
                    placeholder="Count"
                    value={pos.roster_position.count}
                    onChange={(e) => updateRosterPosition(index, 'count', e.target.value)}
                    className="w-24"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeRosterPosition(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addRosterPosition}>
                <Plus className="h-4 w-4 mr-2" /> Add Position
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader><CardTitle>Scoring Categories</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {statCategories.map((cat, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Name (e.g. Rec)"
                    value={cat.name}
                    onChange={(e) => updateStatCategory(index, 'name', e.target.value)}
                    className="w-32"
                  />
                  <Input
                    placeholder="Display name"
                    value={cat.display_name}
                    onChange={(e) => updateStatCategory(index, 'display_name', e.target.value)}
                    className="w-48"
                  />
                  <Input
                    type="number"
                    placeholder="Points"
                    value={cat.value ?? ''}
                    onChange={(e) => updateStatCategory(index, 'value', e.target.value)}
                    className="w-24"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeStatCategory(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addStatCategory}>
                <Plus className="h-4 w-4 mr-2" /> Add Category
              </Button>
            </CardContent>
          </Card>

          <Button className="mt-4" onClick={saveRosterAndScoring} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Roster & Scoring'}
          </Button>
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader><CardTitle>Teams</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Logo URL</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell>
                        <Input
                          value={team.name}
                          onChange={(e) => renameTeam(team, e.target.value)}
                          onBlur={() => saveTeam(team)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={team.logo_url ?? ''}
                          onChange={(e) => setTeams(teams.map(t => t.id === team.id ? { ...t, logo_url: e.target.value } : t))}
                          onBlur={() => saveTeam(team)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteTeam(team.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" className="mt-4" onClick={addTeam}>
                <Plus className="h-4 w-4 mr-2" /> Add Team
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="managers">
          <Card>
            <CardHeader><CardTitle>Invite a Manager</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="manager@example.com"
                />
              </div>
              <div>
                <Label>Assign to Team (optional)</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={inviteTeamId}
                  onChange={(e) => setInviteTeamId(e.target.value)}
                >
                  <option value="">No team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <Button onClick={sendInvite}>Send Invite</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}
