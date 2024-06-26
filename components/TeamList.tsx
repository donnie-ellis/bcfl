import React from 'react';
import TeamCard from './TeamCard';

interface Team {
  team_key: string;
  name: string;
  team_logos: { size: string; url: string }[];
  managers: { nickname: string }[];
}

interface TeamListProps {
  teams: Team[];
}

const TeamList: React.FC<TeamListProps> = ({ teams }) => {
  return (
    <div className="space-y-4">
      {teams.map((team) => (
        <TeamCard
          key={team.team_key}
          name={team.name}
          managerNickname={team.managers[0]?.nickname || 'Unknown Manager'}
          logoUrl={team.team_logos[0]?.url || '/default-logo.png'}
        />
      ))}
    </div>
  );
};

export default TeamList;