import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useSupabaseClient } from '@/lib/useSupabaseClient';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

type DraftTimerProps = {
  draftId: number;
  onTimerExpire?: () => void;
  className?: string;
};

type TimerStates = 'stopped' | 'running' | 'paused' | 'expired';

interface TimerState {
  timeRemaining: number | null;
  isActive: boolean;
  timerState: TimerStates;
  isConnected: boolean;
  lastSync: Date | null;
}

type TimerAction = 
  | { type: 'UPDATE_ALL'; payload: Partial<TimerState> }
  | { type: 'SET_TIME'; payload: number }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'START_TIMER'; payload: { time: number } }
  | { type: 'STOP_TIMER' }
  | { type: 'PAUSE_TIMER'; payload: { time: number } }
  | { type: 'EXPIRE_TIMER'; payload: { time: number } }
  | { type: 'RESET_TIMER'; payload: { time: number } }
  | { type: 'SET_LAST_SYNC'; payload: Date };

function timerReducer(state: TimerState, action: TimerAction): TimerState {  
  switch (action.type) {
    case 'UPDATE_ALL':
      const newState = { ...state, ...action.payload };
      return newState;
      
    case 'START_TIMER':
      return {
        ...state,
        timeRemaining: action.payload.time,
        isActive: true,
        timerState: 'running',
        lastSync: new Date()
      };
      
    case 'EXPIRE_TIMER':
      return {
        ...state,
        timeRemaining: action.payload.time,
        isActive: true, // Keep active to continue tracking
        timerState: 'expired',
        lastSync: new Date()
      };
      
    case 'PAUSE_TIMER':
      return {
        ...state,
        timeRemaining: action.payload.time,
        isActive: false,
        timerState: 'paused',
        lastSync: new Date()
      };
      
    case 'RESET_TIMER':
      return {
        ...state,
        timeRemaining: action.payload.time,
        isActive: false,
        timerState: 'stopped',
        lastSync: new Date()
      };
      
    case 'SET_TIME':
      return {
        ...state,
        timeRemaining: action.payload
      };
      
    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected: action.payload
      };
      
    case 'SET_LAST_SYNC':
      return {
        ...state,
        lastSync: action.payload
      };
      
    default:
      return state;
  }
}

const initialState: TimerState = {
  timeRemaining: null,
  isActive: false,
  timerState: 'stopped',
  isConnected: false,
  lastSync: null
};

const DraftTimer: React.FC<DraftTimerProps> = ({ 
  draftId, 
  onTimerExpire,
  className = "" 
}) => {
  const [state, dispatch] = useReducer(timerReducer, initialState);
  const { timeRemaining, isActive, timerState, isConnected, lastSync } = state;

  const supabase = useSupabaseClient();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const initialTimeRef = useRef<number | null>(null);
  const isTabActiveRef = useRef<boolean>(true);
  const mountedRef = useRef<boolean>(true);


  // Update supabase ref when client changes
  useEffect(() => {
    supabaseRef.current = supabase;
  }, [supabase]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Format time display
  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '--:--';
    
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer display color based on remaining time
  const getTimerColor = () => {
    if (timeRemaining === null) return 'text-gray-500';
    if (timeRemaining < 0) return 'text-red-600 animate-pulse'; // Pulsing red for negative time
    if (timeRemaining <= 0) return 'text-red-600';
    if (timeRemaining <= 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden;
      
      if (!document.hidden && isActive && mountedRef.current) {
        // Tab became active, re-sync with server
        syncWithServer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive]);

  // Sync with server
  const syncWithServer = useCallback(async () => {
    if (!supabaseRef.current || !draftId || !mountedRef.current) {
      console.log('Aborting sync - missing requirements');
      return;
    }

    try {
      
      const { data, error } = await supabaseRef.current
        .from('draft_timer_events')
        .select('*')
        .eq('draft_id', draftId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching timer events:', error);
        return;
      }
            
      if (data && data.length > 0 && mountedRef.current) {
        const latestEvent = data[0];
        const serverTime = new Date().getTime();
        const eventTime = new Date(latestEvent.created_at).getTime();
        const timeDiff = (serverTime - eventTime) / 1000;

        // Check if event is stale (more than 10 minutes old)
        const isStaleEvent = timeDiff > 600; // 10 minutes
        if (isStaleEvent) {
          console.warn('Event is stale (>10 minutes old), treating as expired/stopped');
        }

        let adjustedTime = latestEvent.seconds_remaining;
        
        if (latestEvent.event_type === 'start' || latestEvent.event_type === 'resume') {          
          if (isStaleEvent) {
            // If event is stale, treat as expired but continue tracking
            adjustedTime = latestEvent.seconds_remaining - timeDiff; // Allow deep negative
            dispatch({ type: 'EXPIRE_TIMER', payload: { time: Math.round(adjustedTime) } });
            dispatch({ type: 'SET_CONNECTED', payload: true });
            
            startTimeRef.current = serverTime;
            initialTimeRef.current = adjustedTime;
            
            if (onTimerExpire) {
              onTimerExpire();
            }
          } else {
            // Normal start/resume
            adjustedTime = latestEvent.seconds_remaining - timeDiff;
            
            dispatch({ type: 'START_TIMER', payload: { time: Math.round(adjustedTime) } });
            dispatch({ type: 'SET_CONNECTED', payload: true });
            
            startTimeRef.current = serverTime;
            initialTimeRef.current = adjustedTime;
          }
        } else if (latestEvent.event_type === 'pause') {
          dispatch({ type: 'PAUSE_TIMER', payload: { time: latestEvent.seconds_remaining } });
          dispatch({ type: 'SET_CONNECTED', payload: true });
        } else if (latestEvent.event_type === 'reset') {
          adjustedTime = latestEvent.seconds_remaining;
          dispatch({ type: 'RESET_TIMER', payload: { time: Math.round(adjustedTime) } });
          dispatch({ type: 'SET_CONNECTED', payload: true });
          startTimeRef.current = null;
          initialTimeRef.current = null;
        } else if (latestEvent.event_type === 'expire') {
          // Continue tracking time after expiration
          adjustedTime = latestEvent.seconds_remaining - timeDiff;
          dispatch({ type: 'EXPIRE_TIMER', payload: { time: Math.round(adjustedTime) } });
          dispatch({ type: 'SET_CONNECTED', payload: true });
          startTimeRef.current = serverTime;
          initialTimeRef.current = adjustedTime;
        }
      }
    } catch (error) {
      console.error('Error syncing with server:', error);
    }
  }, [draftId, onTimerExpire]);

  useEffect(() => {
    if (supabase && draftId) {
      syncWithServer();
    }
  }, [supabase, draftId, syncWithServer]);

  // Setup realtime subscription
  useEffect(() => {
    if (!supabaseRef.current || !draftId || !mountedRef.current) {
      return;
    }

    const channelName = `draft_timer_${draftId}`;
    const channel = supabaseRef.current.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: `timer_${draftId}` }
      }
    });

    channel
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'draft_timer_events',
          filter: `draft_id=eq.${draftId}`
        }, 
        (payload) => {
          if (!mountedRef.current) {
            return;
          }
                    
          const event = payload.new;
          const serverTime = new Date().getTime();
          const eventTime = new Date(event.created_at).getTime();
          const latency = serverTime - eventTime;

          let adjustedTime = event.seconds_remaining;

          switch (event.event_type) {
            case 'start':
            case 'resume':
              // Compensate for network latency, allow negative values
              adjustedTime = event.seconds_remaining - (latency / 1000);
              dispatch({ type: 'START_TIMER', payload: { time: Math.round(adjustedTime) } });
              startTimeRef.current = serverTime;
              initialTimeRef.current = adjustedTime;
              break;
            
            case 'pause':
              dispatch({ type: 'PAUSE_TIMER', payload: { time: event.seconds_remaining } });
              break;
            
            case 'reset':
              dispatch({ type: 'RESET_TIMER', payload: { time: event.seconds_remaining } });
              startTimeRef.current = null;
              initialTimeRef.current = null;
              break;
            
            case 'expire':
              // Continue tracking time after expiration
              adjustedTime = event.seconds_remaining - (latency / 1000);
              dispatch({ type: 'EXPIRE_TIMER', payload: { time: Math.round(adjustedTime) } });
              startTimeRef.current = serverTime;
              initialTimeRef.current = adjustedTime;
              if (onTimerExpire) {
                onTimerExpire();
              }
              break;
            
            case 'sync':
              // Server sync event - adjust local timer
              if (isActive && startTimeRef.current !== null && initialTimeRef.current !== null) {
                const localElapsed = (serverTime - startTimeRef.current) / 1000;
                const expectedTime = initialTimeRef.current - localElapsed;
                const serverExpectedTime = event.seconds_remaining;
                const drift = Math.abs(expectedTime - serverExpectedTime);
                
                // Only adjust if drift is significant (>1 second)
                if (drift > 1) {
                  startTimeRef.current = serverTime;
                  initialTimeRef.current = serverExpectedTime;
                  dispatch({ type: 'SET_TIME', payload: Math.round(serverExpectedTime) });
                }
              } else {
                dispatch({ type: 'SET_TIME', payload: event.seconds_remaining });
              }
              break;
          }
          
          dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });
        })
      .subscribe((status) => {
        
        if (status === 'SUBSCRIBED') {
          dispatch({ type: 'SET_CONNECTED', payload: true });
          // Initial sync when connected
          setTimeout(() => {
            syncWithServer();
          }, 100); // Small delay to ensure state is updated
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel subscription error');
          dispatch({ type: 'SET_CONNECTED', payload: false });
        } else if (status === 'CLOSED') {
          console.warn('Channel closed');
          dispatch({ type: 'SET_CONNECTED', payload: false });
        } else {
          dispatch({ type: 'SET_CONNECTED', payload: status === 'TIMED_OUT' });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [draftId, supabase, syncWithServer, onTimerExpire, isActive]);

  // Local countdown timer
  useEffect(() => {
    if (isActive && timeRemaining !== null && mountedRef.current) {
      intervalRef.current = setInterval(() => {
        if (!isTabActiveRef.current || !mountedRef.current) return; // Don't update when tab is inactive
        
        const now = new Date().getTime();
        if (startTimeRef.current !== null && initialTimeRef.current !== null) {
          const elapsed = (now - startTimeRef.current) / 1000;
          const newTime = initialTimeRef.current - elapsed;
          
          if (mountedRef.current) {
            dispatch({ type: 'SET_TIME', payload: Math.round(newTime) });
            
            // Check for expiration (but continue tracking)
            if (newTime <= 0 && timerState !== 'expired') {
              dispatch({ type: 'EXPIRE_TIMER', payload: { time: Math.round(newTime) } });
              // Don't set isActive to false - keep tracking
              if (onTimerExpire) {
                onTimerExpire();
              }
            }
          }
        }
      }, 100); // Update every 100ms for smooth countdown
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, timeRemaining, timerState, onTimerExpire]);

  // Regular server sync (every 10 seconds when active)
  useEffect(() => {
    if (isActive && mountedRef.current) {
      syncIntervalRef.current = setInterval(() => {
        if (isTabActiveRef.current && mountedRef.current) {
          syncWithServer();
        }
      }, 10000);
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isActive, syncWithServer, supabase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []);

  // Don't render if no supabase client
  if (!supabase) {
    return (
      <div className={`draft-timer ${className}`}>
        <div className="text-gray-500">Loading timer...</div>
      </div>
    );
  }

  return (
    <div className={`draft-timer ${className}`}>
      <div className={`font-mono text-2xl font-bold ${getTimerColor()}`}>
        {formatTime(timeRemaining)}
      </div>
      
      <div className="text-xs text-gray-500 mt-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          {lastSync && (
            <span>• Last sync: {lastSync.toLocaleTimeString()}</span>
          )}
        </div>
        
        <div className="mt-1">
          {timeRemaining !== null && timeRemaining < 0 && (
            <span className="text-red-500 font-semibold"> (OVERTIME)</span>
          )}
          {!isTabActiveRef.current && <span> (Tab Inactive)</span>}
        </div>
      </div>
    </div>
  );
};

export default DraftTimer;