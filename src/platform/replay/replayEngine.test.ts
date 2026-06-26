import { expect, test, describe, vi } from 'vitest';
import { ReplayEngine } from './replayEngine';

vi.mock('@/lib/supabase', () => {
  const mockEvents = [
    { id: '1', type: 'start', payload: {}, created_at: '2023-01-01' },
    { id: '2', type: 'play', payload: { card: 'J' }, created_at: '2023-01-02' }
  ];
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockEvents, error: null }))
          }))
        }))
      }))
    }
  };
});

describe('Replay Engine', () => {
  test('engine loads events and provides stepping logic', async () => {
    const engine = new ReplayEngine();
    await engine.load('fake-room-id');

    expect(engine.totalEvents).toBe(2);
    expect(engine.cursor).toBe(-1);

    expect(engine.stepForward()).toBe(true);
    expect(engine.cursor).toBe(0);
    expect(engine.currentEvent?.id).toBe('1');

    expect(engine.stepForward()).toBe(true);
    expect(engine.cursor).toBe(1);

    expect(engine.stepForward()).toBe(false); // End of stream

    expect(engine.stepBackward()).toBe(true);
    expect(engine.cursor).toBe(0);

    engine.jumpTo(-1);
    expect(engine.cursor).toBe(-1);
  });
});
