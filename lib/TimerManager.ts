import { SupabaseClient } from "@supabase/supabase-js";

class TimerManager {
  supabase: SupabaseClient<any, "public", any>;
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // Start a new timer
  async startTimer(draftId: string, seconds: number, pickId: string | null = null, triggeredBy: string = 'user') {
    try {
      const { data, error } = await this.supabase
        .from('draft_timer_events')
        .insert({
          draft_id: draftId,
          event_type: 'start',
          pick_id: pickId,
          seconds_remaining: seconds,
          original_duration: seconds,
          triggered_by: triggeredBy,
          metadata: { started_at: new Date().toISOString() }
        })
        .select()
        .single();

      if (error) throw error;

      // Schedule server-side expiration check
      this.scheduleExpirationCheck(draftId, seconds);
      
      return data;
    } catch (error) {
      console.error('Error starting timer:', error);
      throw error;
    }
  }

  // Pause the timer
  async pauseTimer(draftId: string, triggeredBy: string = 'user') {
    try {
      // Get current timer state
      const currentState = await this.getCurrentTimerState(draftId);
      if (!currentState || currentState.event_type !== 'start') {
        throw new Error('No active timer to pause');
      }

      const { data, error } = await this.supabase
        .from('draft_timer_events')
        .insert({
          draft_id: draftId,
          event_type: 'pause',
          seconds_remaining: currentState.calculated_remaining,
          original_duration: currentState.original_duration,
          triggered_by: triggeredBy
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error pausing timer:', error);
      throw error;
    }
  }

  // Resume the timer
  async resumeTimer(draftId: string, triggeredBy: string = 'user') {
    try {
      const currentState = await this.getCurrentTimerState(draftId);
      if (!currentState || currentState.event_type !== 'pause') {
        throw new Error('No paused timer to resume');
      }

      const { data, error } = await this.supabase
        .from('draft_timer_events')
        .insert({
          draft_id: draftId,
          event_type: 'resume',
          seconds_remaining: currentState.seconds_remaining,
          original_duration: currentState.original_duration,
          triggered_by: triggeredBy
        })
        .select()
        .single();

      if (error) throw error;

      // Schedule server-side expiration check
      this.scheduleExpirationCheck(draftId, currentState.seconds_remaining);
      
      return data;
    } catch (error) {
      console.error('Error resuming timer:', error);
      throw error;
    }
  }

  // Reset the timer
  async resetTimer(draftId: string, seconds: number, triggeredBy: string = 'user') {
    try {
      const { data, error } = await this.supabase
        .from('draft_timer_events')
        .insert({
          draft_id: draftId,
          event_type: 'reset',
          seconds_remaining: seconds,
          original_duration: seconds,
          triggered_by: triggeredBy
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error resetting timer:', error);
      throw error;
    }
  }

  // Send sync event (for drift correction)
  async syncTimer(draftId: string) {
    try {
      const currentState = await this.getCurrentTimerState(draftId);
      if (!currentState) return null;

      const { data, error } = await this.supabase
        .from('draft_timer_events')
        .insert({
          draft_id: draftId,
          event_type: 'sync',
          seconds_remaining: currentState.calculated_remaining,
          original_duration: currentState.original_duration,
          triggered_by: 'system'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error syncing timer:', error);
      throw error;
    }
  }

  // Mark timer as expired
  async expireTimer(draftId: string) {
    try {
      const { data, error } = await this.supabase
        .from('draft_timer_events')
        .insert({
          draft_id: draftId,
          event_type: 'expire',
          seconds_remaining: 0,
          triggered_by: 'system',
          metadata: { expired_at: new Date().toISOString() }
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error expiring timer:', error);
      throw error;
    }
  }

  // Get current timer state using the database function
  async getCurrentTimerState(draftId: string) {
    try {
      const { data, error } = await this.supabase
        .rpc('get_current_timer_state', { draft_id_param: draftId });

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error getting timer state:', error);
      return null;
    }
  }

  // Schedule server-side expiration check (implement based on your infrastructure)
  scheduleExpirationCheck(draftId: string, seconds: number) {
    // Option 1: Use setTimeout for short timers (not recommended for production)
    // setTimeout(() => {
    //   this.checkAndExpireTimer(draftId);
    // }, seconds * 1000);

    // Option 2: Use a job queue (recommended)
    // Example with bull/agenda/etc:
    // jobQueue.add('expire-timer', { draftId }, { delay: seconds * 1000 });

    // Option 3: Use database-based scheduling
    // Store expiration time in database, have a cron job check periodically

    console.log(`Timer expiration scheduled for draft ${draftId} in ${seconds} seconds`);
  }

  // Check if timer should be expired and expire it
  async checkAndExpireTimer(draftId: string) {
    const currentState = await this.getCurrentTimerState(draftId);
    
    if (currentState && 
        currentState.event_type === 'start' && 
        currentState.calculated_remaining <= 0 &&
        !currentState.is_expired) {
      
      await this.expireTimer(draftId);
      
      // Handle expiration logic (auto-pick, move to next player, etc.)
      await this.handleTimerExpiration(draftId);
    }
  }

  // Handle what happens when timer expires
  async handleTimerExpiration(draftId: string) {
    // Implement your draft-specific expiration logic here
    console.log(`Timer expired for draft ${draftId}`);
    
    // Examples:
    // - Auto-pick a player
    // - Move to next player's turn
    // - Pause the draft
    // - Send notifications
  }
}

export default TimerManager;