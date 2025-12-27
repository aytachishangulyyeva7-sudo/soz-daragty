import { useEffect, useState, useCallback } from 'react';
import { query, single } from '../lib/localDb';
import { initWebSocket } from '../utils/WebSocketClient';

export const useGameState = (sessionId?: string) => {
  const [gameState, setGameState] = useState<any>(null);
  const [gameSession, setGameSession] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    try {
      const session = await single(
        'SELECT * FROM game_sessions WHERE id = ?',
        [sessionId]
      );

      if (!session) return;

      setGameSession(session);

      const groupList = await query(
        'SELECT * FROM groups WHERE session_id = ? ORDER BY turn_order',
        [sessionId]
      );
      setGroups(groupList || []);

      if (session.current_group_id) {
        const state = await single(
          'SELECT * FROM game_state WHERE session_id = ? AND group_id = ?',
          [sessionId, session.current_group_id]
        );

        if (state) {
          setGameState({
            ...state,
            guesses: JSON.parse(state.guesses || '[]'),
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    initWebSocket(() => {
      setTick((t) => t + 1);
    });
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [tick, load]);

  return {
    gameState,
    gameSession,
    groups,
    loading,
  };
};
