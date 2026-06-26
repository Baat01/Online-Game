import { supabase } from '@/lib/supabase'

export interface GameEvent {
  id: string;
  room_id: string;
  user_id: string | null;
  type: string;
  payload: any;
  created_at: string;
}

/**
 * ReplayEngine
 * Loads all events for a room and provides a stepped state reconstruction.
 */
export class ReplayEngine {
  private events: GameEvent[] = [];
  public cursor: number = -1;

  async load(roomId: string) {
    const { data, error } = await supabase
      .from('game_events')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
    
    if (error) throw error;
    this.events = data as GameEvent[];
    this.cursor = -1;
  }

  get totalEvents() {
    return this.events.length;
  }

  get currentEvent() {
    if (this.cursor < 0 || this.cursor >= this.events.length) return null;
    return this.events[this.cursor];
  }

  // A reducer that clients can inject to reconstruct state visually if they want,
  // or simply the UI can display the events happening in order.
  getEventsUntilCursor() {
    if (this.cursor < 0) return [];
    return this.events.slice(0, this.cursor + 1);
  }

  stepForward() {
    if (this.cursor < this.events.length - 1) {
      this.cursor++;
      return true;
    }
    return false;
  }

  stepBackward() {
    if (this.cursor >= 0) {
      this.cursor--;
      return true;
    }
    return false;
  }

  jumpTo(index: number) {
    if (index >= -1 && index < this.events.length) {
      this.cursor = index;
    }
  }
}
