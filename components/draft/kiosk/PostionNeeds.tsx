// ./components/draft/kiosk/PositionNeeds.tsx
import React from 'react';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PositionNeed {
  position: string;
  needed: number;
  have: number;
  total: number;
}

interface PositionNeedsProps {
  needs: PositionNeed[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PositionNeeds: React.FC<PositionNeedsProps> = ({ 
  needs, 
  className = "",
  size = 'md' 
}) => {
  const getPositionStatus = (position: PositionNeed) => {
    if (position.needed === 0) {
      return { 
        status: 'complete', 
        color: 'bg-green-500', 
        text: 'text-green-700',
        bgColor: 'bg-green-50 dark:bg-green-950/20',
        borderColor: 'border-green-200 dark:border-green-800'
      };
    }
    if (position.needed === position.total) {
      return { 
        status: 'urgent', 
        color: 'bg-red-500', 
        text: 'text-red-700',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-200 dark:border-red-800'
      };
    }
    return { 
      status: 'partial', 
      color: 'bg-yellow-500', 
      text: 'text-yellow-700',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    };
  };

  const sizeConfig = {
    sm: {
      title: 'text-lg',
      icon: 'w-4 h-4',
      position: 'text-base',
      description: 'text-xs',
      count: 'text-base',
      dot: 'w-3 h-3',
      padding: 'p-3',
      grid: 'grid-cols-3',
      spacing: 'space-x-2'
    },
    md: {
      title: 'text-xl',
      icon: 'w-5 h-5',
      position: 'text-lg',
      description: 'text-sm',
      count: 'text-lg',
      dot: 'w-3 h-3',
      padding: 'p-3',
      grid: 'grid-cols-2',
      spacing: 'space-x-3'
    },
    lg: {
      title: 'text-2xl',
      icon: 'w-6 h-6',
      position: 'text-xl',
      description: 'text-sm',
      count: 'text-xl',
      dot: 'w-4 h-4',
      padding: 'p-4',
      grid: 'grid-cols-2',
      spacing: 'space-x-3'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className={cn("font-bold flex items-center", config.title)}>
        <Target className={cn("mr-2", config.icon)} />
        Position Needs
      </h3>
      <div className={cn("grid gap-4", config.grid)}>
        {needs.map((position) => {
          const status = getPositionStatus(position);
          return (
            <div 
              key={position.position} 
              className={cn(
                "flex items-center rounded-lg border-2 hover:bg-muted/40 transition-all duration-200",
                config.spacing,
                config.padding,
                status.bgColor,
                status.borderColor
              )}
            >
              <div className={cn("rounded-full flex-shrink-0", status.color, config.dot)} />
              <div className="flex-1 min-w-0">
                <div className={cn("font-bold", config.position)}>{position.position}</div>
                <div className={cn("text-muted-foreground truncate", config.description)}>
                  {position.needed === 0 ? 
                    'Complete' : 
                    `Need ${position.needed} more`
                  }
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={cn("font-mono font-bold", config.count)}>
                  {position.have}/{position.total}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PositionNeeds;