import { useState, useEffect, useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import { PlayCircle, RotateCcw, Trophy, Zap, RefreshCw, PauseCircle, Play } from 'lucide-react';
import { soundManager } from '../utils/SoundManager';
import { single, update, getWordsByLength, addWord } from '../lib/localDb';
import { useCountdown } from '../hooks/useCountdown';
import { sendUpdate } from '../utils/WebSocketClient';

interface WordItem {
  id: string;
  word: string;
  language: 'tm' | 'en' | 'ru';
}

interface AdminDashboardProps {
  sessionId: string;
}

export const AdminDashboard = ({ sessionId }: AdminDashboardProps) => {
  const { gameState, gameSession, groups, loading } = useGameState(sessionId);
  const inputRef = useRef<HTMLInputElement>(null);

  const [guess, setGuess] = useState('');
  const [availableWords, setAvailableWords] = useState<WordItem[]>([]);
  const [selectedLength, setSelectedLength] = useState<number>(4);
  const [selectedLetter, setSelectedLetter] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newWordLanguage, setNewWordLanguage] = useState<'tm' | 'en' | 'ru'>('tm');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'tm' | 'en' | 'ru'>('all');

  const currentGroupId = gameSession?.current_group_id;
  const currentRound = gameSession?.current_round || 1;
  const isGameFinished = currentRound >= 3;

  const isTimerPaused = gameState?.timer_active === 0 && gameState?.timer_started_at !== null;

const handleTimeout = async () => {
  if (!gameState || !currentGroupId) return;

  const newAttempts = (gameState.attempts_used || 0) + 1;
  const currentLength = gameState?.current_word?.length || 4;
  const timeoutGuess = {
    word: ''.padEnd(currentLength, ' '),
    results: Array(currentLength).fill({ letter: '', status: 'timeout' })
  };

  const newGuesses = [...(gameState.guesses || []), timeoutGuess];

  await update(
    'game_state',
    {
      timer_active: 0,
      timer_started_at: null,
      attempts_used: newAttempts,
      guesses: JSON.stringify(newGuesses),
    },
    'session_id = ? AND group_id = ?',
    [sessionId, currentGroupId]
  );

  // YANLIŞ SESİ ÇAL
  playWrongDelayed();

  if (newAttempts >= 6) {
    await update(
      'game_state',
      { current_word: null, current_word_id: null, guesses: '[]' },
      'session_id = ? AND group_id = ?',
      [sessionId, currentGroupId]
    );
  } else {
    setTimeout(startTimer, 800); // Yeni deneme için timer'ı 30sn'den başlat
  }

  soundManager.stopTension();
  soundManager.stopTicking();
};

  const timeRemaining = useCountdown(
    gameState?.timer_active || false,
    gameState?.timer_started_at || null,
    handleTimeout
  );

  useEffect(() => {
    const round = gameSession?.current_round || 1;
    setSelectedLength(round === 1 ? 4 : 5);
  }, [gameSession?.current_round]);

  const fetchWords = async () => {
    const lang = languageFilter === 'all' ? undefined : languageFilter;
    const words = await getWordsByLength(selectedLength, selectedLetter || undefined, lang);
    setAvailableWords(words as WordItem[]);
  };

  useEffect(() => {
    fetchWords();
  }, [selectedLength, selectedLetter, languageFilter]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [gameState?.current_word]);

useEffect(() => {
  if (gameSession) {
    soundManager.startTension(1.0);
  }

  if (gameState?.timer_active) {
    soundManager.startTicking(); // Bu otomatik tension'ı durdurur
  } else {
    soundManager.stopTicking();
    soundManager.startTension(0.5); // Pause'da hafif tension çalsın
  }

  return () => {
    soundManager.stopAll();
  };
}, [gameState?.timer_active, gameSession]);

  const playCorrectDelayed = () => setTimeout(() => {
    soundManager.playCorrect();
    soundManager.stopTension();
  }, 1000);

  const playWrongDelayed = () => setTimeout(() => {
    soundManager.playWrong();
  }, 1000);

  const addNewWord = async () => {
    const word = newWord.trim().toUpperCase();
    if (!word || word.length !== selectedLength) {
      alert(`Söz ${selectedLength} harpdan ybarat bolmaly!`);
      return;
    }
    await addWord(word, newWordLanguage);
    setNewWord('');
    await fetchWords();
  };

  const startNewRound = async (wordId: string) => {
  const wordRow: any = await single('SELECT word FROM words WHERE id = ?', [wordId]);
  if (!wordRow || !currentGroupId) return;

  await update(
    'game_state',
    {
      current_word: wordRow.word,
      current_word_id: wordId,
      attempts_used: 0,
      guesses: '[]',
      timer_active: 0,
      timer_started_at: null,
    },
    'session_id = ? AND group_id = ?',
    [sessionId, currentGroupId]
  );
  sendUpdate();
};

  const startTimer = async () => {
    if (!currentGroupId) return;
    await update(
      'game_state',
      { timer_active: 1, timer_started_at: new Date().toISOString() },
      'session_id = ? AND group_id = ?',
      [sessionId, currentGroupId]
    );
    sendUpdate();
  };

  const pauseTimer = async () => {
    if (!currentGroupId) return;
    await update(
      'game_state',
      { timer_active: 0 },
      'session_id = ? AND group_id = ?',
      [sessionId, currentGroupId]
    );
    sendUpdate();
  };

  const resumeTimer = async () => {
    if (!currentGroupId || !gameState?.timer_started_at) return;

    const pausedAt = new Date().getTime();
    const startedAt = new Date(gameState.timer_started_at).getTime();
    const elapsed = pausedAt - startedAt;
    const remaining = 30 * 1000 - elapsed;

    if (remaining <= 0) {
      handleTimeout();
      return;
    }

    const newStartedAt = new Date(pausedAt - (30 * 1000 - remaining)).toISOString();

    await update(
      'game_state',
      { timer_active: 1, timer_started_at: newStartedAt },
      'session_id = ? AND group_id = ?',
      [sessionId, currentGroupId]
    );
    sendUpdate();
  };

  const submitGuess = async () => {
    if (!gameState?.current_word || !guess.trim() || !currentGroupId) return;

    const guessUpper = guess.trim().toUpperCase();
    const target = gameState.current_word.toUpperCase();

    if (guessUpper.length !== target.length) {
      alert(`${target.length} harply söz ýazyň!`);
      return;
    }

    const targetCounts: Record<string, number> = {};
    target.split('').forEach((l: string) => {
      targetCounts[l] = (targetCounts[l] || 0) + 1;
    });

    const results = guessUpper.split('').map((l: string, i: number) => ({
      letter: l,
      status: target[i] === l ? 'correct' : 'temp'
    }));

    results.forEach((r: any) => {
      if (r.status === 'correct') {
        targetCounts[r.letter]--;
      }
    });

    results.forEach((r: any) => {
      if (r.status === 'temp') {
        if (targetCounts[r.letter] > 0) {
          r.status = 'present';
          targetCounts[r.letter]--;
        } else {
          r.status = 'absent';
        }
      }
    });

    const newGuesses = [...(gameState.guesses || []), { word: guessUpper, results }];
    const attempts = (gameState.attempts_used || 0) + 1;
    const correct = results.every((r: any) => r.status === 'correct');

    await update(
      'game_state',
      {
        guesses: JSON.stringify(newGuesses),
        attempts_used: attempts,
        timer_active: 0,
        timer_started_at: null,
      },
      'session_id = ? AND group_id = ?',
      [sessionId, currentGroupId]
    );

    if (correct) {
      playCorrectDelayed();
      soundManager.stopTicking();

      const points = Math.max(0, 120 - (attempts - 1) * 20);
      const currentGroup = groups.find(g => g.id === currentGroupId);
      const newScore = (currentGroup?.score || 0) + points;

      await update('groups', { score: newScore }, 'id = ?', [currentGroupId]);
      setTimeout(resetRound, 6000);
    } else {
      playWrongDelayed();
      soundManager.stopTicking();

      if (attempts >= 6) {
        setTimeout(resetRound, 3000);
      } else {
        setTimeout(async () => {
          await update(
            'game_state',
            { timer_started_at: new Date().toISOString(), timer_active: 1 },
            'session_id = ? AND group_id = ?',
            [sessionId, currentGroupId]
          );
        }, 800);
      }
    }
    setGuess('');
    sendUpdate();
  };

  const resetRound = async () => {
    if (!currentGroupId) return;
    soundManager.stopAll();

    await update(
      'game_state',
      {
        current_word: null,
        current_word_id: null,
        attempts_used: 0,
        guesses: '[]',
        timer_active: 0,
        timer_started_at: null,
      },
      'session_id = ? AND group_id = ?',
      [sessionId, currentGroupId]
    );

    if (gameSession) {
      soundManager.startTension(1.0);
      soundManager.setTensionVolume(0.5);
    }
    sendUpdate();
  };

  const changeGroup = async (groupId: string) => {
    await update('game_sessions', { current_group_id: groupId }, 'id = ?', [sessionId]);
  };

  const nextRound = async () => {
    if (currentRound >= 3) return;
    await update('game_sessions', { current_round: currentRound + 1 }, 'id = ?', [sessionId]);
  };

  const restartGame = async () => {
    if (!confirm('Ähli ballar nollanyp, oýun 1-nji raunda gaýtarylýar. Dowam etmeli?')) return;

    for (const group of groups) {
      await update('groups', { score: 0 }, 'id = ?', [group.id]);
    }

    await update('game_sessions', { current_round: 1 }, 'id = ?', [sessionId]);

    if (currentGroupId) {
      await update(
        'game_state',
        {
          current_word: null,
          current_word_id: null,
          attempts_used: 0,
          guesses: '[]',
          timer_active: 0,
          timer_started_at: null,
        },
        'session_id = ? AND group_id = ?',
        [sessionId, currentGroupId]
      );
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white text-xl">Yuklenýär...</div>;

  const currentLength = gameState?.current_word?.length || selectedLength;
  const guesses = gameState?.guesses || [];

  const boxSizes: Record<number, string> = {
    4: 'w-10 h-10 text-xl md:w-12 md:h-12 md:text-2xl',
    5: 'w-8 h-8 text-lg md:w-10 md:h-10 md:text-xl',
  };
  const boxSize = boxSizes[currentLength] || boxSizes[4];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-2 md:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="text-center py-4">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">SÖZ DARAGTY</h1>
          <p className="text-slate-300 text-sm">Dolandyryjy Panel • Sesión ID: {sessionId.slice(0, 8)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              Häzirki Topar we Raund
            </h2>
            <select
              value={currentGroupId || ''}
              onChange={e => changeGroup(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-lg mb-3"
            >
              <option value="">Topar saýlaň</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <div className="text-center">
              <p className="text-4xl font-black text-white">{currentRound}</p>
              <p className="text-slate-400 text-sm mb-3">raund • {selectedLength} harp</p>

              <button
                onClick={nextRound}
                disabled={isGameFinished}
                className={`px-6 py-3 rounded-lg text-lg font-bold transition mb-4 w-full ${
                  isGameFinished
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isGameFinished ? 'Oýun Gutardy (3/3)' : 'Indiki raunda geç'}
              </button>

              <button
                onClick={restartGame}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg text-lg font-bold flex items-center justify-center gap-2 transition shadow-lg"
              >
                <RefreshCw className="w-6 h-6" />
                Täze Oýun Başlat
              </button>
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-3">Häzirki Söz</h2>
            <div className="bg-black/70 rounded-lg p-4 text-center mb-3">
              <p className="text-4xl md:text-5xl font-black text-white font-mono tracking-widest blur-sm select-none">
                {gameState?.current_word || '-----'}
              </p>
              <p className="text-slate-500 text-xs mt-2">Spoiler üçin ýaşyryn</p>
            </div>
            <div className="text-center mb-3">
  <p className="text-lg text-slate-300">
    Synanyşyk: {gameState?.attempts_used || 0} / 6
    {gameState?.timer_started_at && (
      <span className="ml-4 font-bold text-xl">
        | Zaman: {gameState?.timer_active ? (
          <span className="text-white">{timeRemaining}</span>
        ) : (
          <span className="text-yellow-400 flex items-center gap-2">
            <PauseCircle className="w-5 h-5" />
            {timeRemaining}
          </span>
        )}
      </span>
    )}
  </p>
</div>
            <div className="flex gap-2">
              {gameState?.timer_active ? (
                <button
                  onClick={pauseTimer}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg text-lg font-bold flex items-center justify-center gap-2 transition"
                >
                  <PauseCircle className="w-6 h-6" /> Timer Durdur
                </button>
              ) : isTimerPaused ? (
                <button
                  onClick={resumeTimer}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-lg font-bold flex items-center justify-center gap-2 transition"
                >
                  <Play className="w-6 h-6" /> Timer Dowam Et
                </button>
              ) : (
                <button
                  onClick={startTimer}
                  disabled={!gameState?.current_word}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg text-lg font-bold flex items-center justify-center gap-2 transition"
                >
                  <PlayCircle className="w-6 h-6" /> Timer Başlat
                </button>
              )}

              <button
                onClick={resetRound}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg text-lg font-bold flex items-center justify-center gap-2 transition"
              >
                <RotateCcw className="w-6 h-6" /> Täzeden başla
                </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-3 text-center">
            Söz Saýla ({selectedLength} harp)
          </h2>

          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {(['all', 'tm', 'en', 'ru'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguageFilter(lang)}
                className={`px-4 py-1 rounded-lg text-sm font-bold transition ${
                  languageFilter === lang ? 'bg-purple-600 shadow-purple-600/50' : 'bg-slate-700'
                }`}
              >
                {lang === 'all' ? 'Ählisi' : lang.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mb-4 max-w-3xl mx-auto">
            <input
              type="text"
              maxLength={1}
              value={selectedLetter}
              onChange={e => setSelectedLetter(e.target.value.toUpperCase())}
              placeholder="Baş harp"
              className="bg-slate-700 text-white px-3 py-2 rounded-lg text-lg text-center w-20"
            />
            <input
              type="text"
              value={newWord}
              onChange={e => setNewWord(e.target.value.toUpperCase())}
              maxLength={selectedLength}
              placeholder="Täze söz goş..."
              className="flex-1 min-w-48 bg-slate-700 text-white px-3 py-2 rounded-lg text-lg"
            />
            <select
              value={newWordLanguage}
              onChange={e => setNewWordLanguage(e.target.value as 'tm' | 'en' | 'ru')}
              className="bg-slate-700 text-white px-3 py-2 rounded-lg text-lg"
            >
              <option value="tm">TM</option>
              <option value="en">EN</option>
              <option value="ru">RU</option>
            </select>
            <button
              onClick={addNewWord}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-lg font-bold transition"
            >
              Goş
            </button>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto p-2 bg-slate-900/50 rounded-lg">
            {availableWords.length === 0 ? (
              <p className="col-span-full text-center text-slate-400 text-lg py-6">
                Bu süzgüç boýunça söz ýok. Täze söz goşuň!
              </p>
            ) : (
              availableWords.map(w => (
                <button
                  key={w.id}
                  onClick={() => startNewRound(w.id)}
                  className="bg-gradient-to-br from-slate-700 to-slate-800 hover:from-purple-700 hover:to-purple-900 text-white rounded-lg py-3 text-xl md:text-2xl font-black shadow-md hover:shadow-purple-600/50 transform hover:scale-105 transition-all duration-200"
                >
                  {w.word}
                  <span className="block text-xs mt-1 opacity-70 font-normal">
                    {w.language.toUpperCase()}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Admin Tahminy</h2>
          <input
            ref={inputRef}
            type="text"
            value={guess}
            onChange={e => setGuess(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && guess.trim() && submitGuess()}
            maxLength={gameState?.current_word?.length || 5}
            placeholder="SÖZI ÝAZYŇ WE ENTER BASYŇ..."
            className="w-full max-w-xl mx-auto bg-black/70 text-white text-4xl font-mono rounded-2xl px-6 py-5 tracking-widest text-center border-2 border-slate-600 focus:border-yellow-500 outline-none transition"
          />
        </div>

        <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Denenen Sözler</h2>
          {gameState?.attempts_used >= 6 &&
 !guesses[guesses.length - 1]?.results.every((r: any) => r.status === 'correct') &&
 gameState?.current_word && (
  <div className="mt-6 p-5 bg-red-900/60 border-4 border-red-500 rounded-2xl text-center shadow-lg">
    <p className="text-red-200 text-lg mb-2">Bilmediler!</p>
    <p className="text-red-100 text-4xl font-black font-mono tracking-wider">
      {gameState.current_word}
    </p>
  </div>
)}
          <div className="space-y-2">
            {[...Array(6)].map((_, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-2">
                {[...Array(currentLength)].map((_, colIndex) => {
                  const guess = guesses[rowIndex];
                  const result = guess?.results[colIndex];

                  return (
                    <div
                      key={colIndex}
                      className={`${boxSize} flex items-center justify-center rounded-lg font-black border-2 transition-all ${
                        !guess
                          ? 'bg-slate-700 border-slate-600'
                          : result.status === 'correct'
                          ? 'bg-green-600 border-green-400 text-white shadow-md'
                          : result.status === 'present'
                          ? 'bg-amber-600 border-amber-400 text-white shadow-md'
                          : result.status === 'timeout'
                          ? 'bg-red-600 border-red-400 text-white'
                          : 'bg-slate-600 border-slate-500 text-white'
                      }`}
                    >
                      {result?.letter?.toUpperCase() || ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {gameState?.attempts_used >= 6 &&
           !guesses[guesses.length - 1]?.results.every((r: any) => r.status === 'correct') &&
           gameState?.current_word && (
            <div className="mt-4 p-3 bg-red-900/50 border-2 border-red-500 rounded-lg text-center">
              <p className="text-red-200 text-sm">Ýalňyş:</p>
              <p className="text-red-100 text-2xl font-bold font-mono">{gameState.current_word}</p>
            </div>
          )}
        </div>

        <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4 text-center flex items-center justify-center gap-2">
            <Trophy className="w-8 h-8 text-amber-400" />
            Bal Jemleri
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {groups
              .sort((a: any, b: any) => b.score - a.score)
              .map((g: any, i: number) => (
                <div key={g.id} className="text-center">
                  <div className="text-3xl mb-1">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div className="text-xl font-bold text-white my-2">{g.name}</div>
                  <div className="text-5xl font-black text-white">{g.score}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};