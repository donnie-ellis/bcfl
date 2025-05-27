// ./componenets/TeamList

import React from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Team, TeamLogo, parseTeamLogos } from '@/lib/types/team.types';
import ManagerInfo from "@/components/ManagerInfo";

const TeamList: React.FC<{ teams: Team[] }> = ({ teams }) => (
  <Table>
    <TableBody>
      {teams.map((team) => {
        const logos: TeamLogo[] = parseTeamLogos(team.team_logos);
        const logo = logos.find(l => l.size === 'large') || logos[0];
        return (
          <TableRow key={team.team_key}>
            <TableCell className="flex items-center space-x-2">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <div className="flex items-center space-x-2 cursor-pointer">
                    {logo ? (
                      <img src={logo.url} alt={`${team.name} logo`} className="w-8 h-8 object-contain" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs">{team.name.charAt(0)}</span>
                      </div>
                    )}
                    <span>{team.name}</span>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <h3 className="font-semibold mb-2">Team Managers</h3>
                  <ManagerInfo managers={team.managers || []} />
                </HoverCardContent>
              </HoverCard>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);

export default TeamList;
