// useGameState.ts - Perfect State Update with WebSocket realtime sync
// WebSocket realtime sync bilen kämil State täzeleme

import { useEffect, useState, useCallback } from 'react';
import { query, single } from '../lib/localDb';
import { initWebSocket } from '../utils/WebSocketClient';

export const useGameState = (sessionId?: string) => {
  const [gameState, setGameState] = useState<any>(null);
  const [gameSession, setGameSession] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * DB-den state-i ýükle
   * Load state from database
   */
  const loadFromDB = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    try {
      // Game session-y al
      const session = await single(
        'SELECT * FROM game_sessions WHERE id = ?',
        [sessionId]
      );

      if (!session) {
        console.warn('⚠️ Session tapylmady:', sessionId);
        return;
      }

      setGameSession(session);

      // Toparlary al
      const groupList = await query(
        'SELECT * FROM groups WHERE session_id = ? ORDER BY turn_order',
        [sessionId]
      );
      setGroups(groupList || []);

      // Häzirki toparyň state-ini al
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
    } catch (error) {
      console.error('❌ State ýüklemekde säwlik:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  /**
   * WebSocket-den gelen state-i göni täzele
   * Directly update state from WebSocket message
   * BU REALTIME SYNC ÜÇIN ESASY!
   * THIS IS KEY FOR REALTIME SYNC!
   */
  const updateFromWebSocket = useCallback((data: any) => {
    // Diňe FULL_STATE_UPDATE mesajlaryny işle
    if (data.type !== 'FULL_STATE_UPDATE') {
      return;
    }

    // Bu session üçin bolmasa, äsgermezlik et
    if (data.sessionId !== sessionId) {
      return;
    }

    console.log('🔄 WS-den state täzelenýär...', {
      hasGameSession: !!data.gameSession,
      hasGroups: !!data.groups,
      hasGameState: !!data.gameState,
      currentWord: data.gameState?.current_word,
      attempts: data.gameState?.attempts_used,
      timerActive: data.gameState?.timer_active
    });

    // State-i göni täzele (DB-den okamaly däl!)
    // Update state directly (no need to read from DB!)

    if (data.gameSession) {
      setGameSession(data.gameSession);
    }

    if (data.groups) {
      setGroups(data.groups);
    }

    if (data.gameState) {
      // Guesses-i parse et (string bolsa)
      const parsedGameState = {
        ...data.gameState,
        guesses: typeof data.gameState.guesses === 'string'
          ? JSON.parse(data.gameState.guesses || '[]')
          : (data.gameState.guesses || [])
      };

      setGameState(parsedGameState);
    }

    // Loading-i false-a çykarmaly (ilkinji täzelemeden soň)
    setLoading(false);
  }, [sessionId]);

  /**
   * Komponent mount bolanyňda başlangyç state-i ýükle
   * Load initial state when component mounts
   */
  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  /**
   * WebSocket-i başlat we realtime updates-lary diňle
   * Initialize WebSocket and listen for realtime updates
   */
  useEffect(() => {
    if (!sessionId) return;

    console.log('🔌 WebSocket başlatylýar session üçin:', sessionId);

    // WebSocket birikmesini açyp, callback bilen täzele
    const cleanup = initWebSocket(updateFromWebSocket);

    // Unmount bolanda arassala
    return () => {
      console.log('🧹 WebSocket arassalanýar');
      cleanup();
    };
  }, [sessionId, updateFromWebSocket]);

  return {
    gameState,
    gameSession,
    groups,
    loading,
  };
};
