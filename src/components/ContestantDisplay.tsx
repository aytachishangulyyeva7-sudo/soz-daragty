import { useGameState } from '../hooks/useGameState';
import { useCountdown } from '../hooks/useCountdown';
import { Trophy, Clock, PauseCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { soundManager } from '../utils/SoundManager';

interface ContestantDisplayProps {
  sessionId: string;
}

export const ContestantDisplay = ({ sessionId }: ContestantDisplayProps) => {
  const { gameState, gameSession, groups, loading } = useGameState(sessionId);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showFailedOverlay, setShowFailedOverlay] = useState(false);
  const [failedWord, setFailedWord] = useState<string | null>(null);

  // Contestant sadece gösterir, timeout veya DB yazma yapmaz
  const timeRemaining = useCountdown(
    gameState?.timer_active || false,
    gameState?.timer_started_at || null,
    () => {} // Boş fonksiyon
  );

  const round = gameSession?.current_round || 1;
  const currentLength = round === 1 ? 4 : 5;

  const guesses = gameState?.guesses || [];

  const rawWordFound =
    guesses.length > 0 &&
    guesses[guesses.length - 1]?.results.every(
      (r: any) => r.status === 'correct'
    );

  const wordFailed =
    gameState?.attempts_used >= 6 &&
    !rawWordFound &&
    gameState?.current_word;

  useEffect(() => {
    if (rawWordFound) {
      setShowSuccessOverlay(true);
      setFailedWord(null);

      const timer = setTimeout(() => {
        setShowSuccessOverlay(false);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setShowSuccessOverlay(false);
    }
  }, [rawWordFound]);

  useEffect(() => {
    if (wordFailed) {
      setShowFailedOverlay(true);
      setFailedWord(gameState.current_word);

      const timer = setTimeout(() => {
        setShowFailedOverlay(false);
      }, 3000);

      return () => clearTimeout(timer);
    } else if (!gameState?.current_word) {
      setFailedWord(null);
    }
  }, [wordFailed, gameState?.current_word]);

  // Ses yönetimi - Admin'dekiyle tamamen aynı
  useEffect(() => {
    if (gameSession) {
      soundManager.startTension(1.0);
      soundManager.setTensionVolume(gameState?.timer_active ? 1.0 : 0.5);
    }

    if (gameState?.timer_active) {
      soundManager.startTicking();
    } else {
      soundManager.stopTicking();
    }

    return () => {
      soundManager.stopAll();
    };
  }, [gameState?.timer_active, gameSession]);

  const firstLetter = gameState?.current_word
    ? gameState.current_word[0].toUpperCase()
    : '';

  const boxSizes: Record<number, string> = {
    4: 'w-16 h-16 text-3xl md:w-20 md:h-20 md:text-4xl',
    5: 'w-14 h-14 text-2xl md:w-16 md:h-16 md:text-3xl',
  };
  const boxSize = boxSizes[currentLength] || boxSizes[4];

  const sortedGroups = [...groups].sort((a: any, b: any) => b.score - a.score);
  const currentGroupId = gameSession?.current_group_id;

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-900 text-white text-2xl">
        Ýüklenýär...
      </div>
    );
  }

  if (!gameSession) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-900 text-white text-xl">
        Oýun tapylmady
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col p-4 md:p-6">

      {/* TIMER - Pause'da ikon + kalan saniye donuk */}
      {gameState?.timer_started_at && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 md:top-8 md:left-auto md:right-8 md:translate-x-0 z-40">
          <div className="flex items-center gap-4 px-8 py-4 rounded-3xl bg-blue-600 border-4 border-blue-400 shadow-2xl">
            <Clock className="w-10 h-10 text-white" />
            <span className="text-5xl md:text-6xl font-black text-white flex items-center gap-3">
              {gameState?.timer_active ? (
                timeRemaining
              ) : (
                <>
                  <PauseCircle className="w-12 h-12 text-yellow-400" />
                  {timeRemaining}
                </>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-20 md:mt-0">

        {/* Skor Tablosu */}
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border-4 border-slate-700/50 p-6 md:p-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Trophy className="w-10 h-10 text-amber-400" />
            <h2 className="text-2xl md:text-3xl font-black text-white">
              Toparlaryň ballary
            </h2>
          </div>

          <div className="space-y-3">
            {sortedGroups.map((group: any, index: number) => (
              <div
                key={group.id}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                  group.id === currentGroupId
                    ? 'bg-yellow-600/80 border-4 border-yellow-400 shadow-lg scale-105'
                    : 'bg-slate-700'
                } text-white`}
              >
                <div className="text-3xl font-bold w-10 text-center">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1 + '.'}
                </div>
                <div className="flex-1 truncate font-bold text-lg">
                  {group.name}
                </div>
                <div className="text-3xl font-black">{group.score}</div>
              </div>
            ))}
          </div>

          {/* Başarısız kelime kalıcı gösterim */}
          {failedWord && !showFailedOverlay && (
            <div className="mt-8 p-6 bg-red-900/70 backdrop-blur rounded-2xl border-4 border-red-500 text-center shadow-2xl animate-pulse">
              <p className="text-red-200 text-lg mb-2 font-semibold">Bilmediler!</p>
              <p className="text-red-100 text-4xl md:text-5xl font-black font-mono tracking-widest">
                {failedWord}
              </p>
            </div>
          )}
        </div>

        {/* Oyun Alanı */}
        <div className="flex flex-col items-center gap-8 lg:gap-12">
          <h1 className="text-4xl md:text-5xl font-black text-white text-center">
            SÖZ DARAGTY
          </h1>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border-4 border-slate-700/50 p-8 shadow-2xl w-full max-w-2xl relative"
          >
            <div className="space-y-4">
              {[...Array(6)].map((_, rowIndex) => (
                <motion.div
                  key={rowIndex}
                  className="flex justify-center gap-3"
                >
                  {[...Array(currentLength)].map((_, colIndex) => {
                    const guess = guesses[rowIndex];
                    const result = guess?.results[colIndex];

                    const isCurrentRow = rowIndex === (gameState?.attempts_used || 0);
                    if (colIndex === 0 && firstLetter && !guess && isCurrentRow) {
                      return (
                        <div
                          key={colIndex}
                          className={`${boxSize} flex items-center justify-center rounded-2xl font-black bg-green-600 border-4 border-green-400 text-white shadow-lg`}
                        >
                          {firstLetter}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={colIndex}
                        className={`${boxSize} flex items-center justify-center rounded-2xl font-black border-4 transition-all ${
                          !guess
                            ? 'bg-slate-700 border-slate-600'
                            : result.status === 'correct'
                            ? 'bg-green-600 border-green-400 text-white shadow-lg'
                            : result.status === 'present'
                            ? 'bg-amber-600 border-amber-400 text-white shadow-lg'
                            : result.status === 'timeout'
                            ? 'bg-red-600 border-red-400 text-white'
                            : 'bg-slate-600 border-slate-500 text-white'
                        }`}
                      >
                        {result?.letter?.toUpperCase() || ''}
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="hidden lg:block" />
      </div>

      {/* Başarı Overlay */}
      <AnimatePresence>
        {showSuccessOverlay && gameState?.current_word && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.7, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.7, y: -50, opacity: 0 }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 120
              }}
              className="bg-gradient-to-br from-green-600 to-emerald-700 p-10 md:p-16 rounded-3xl text-white text-center shadow-2xl border-4 border-green-300"
            >
              <motion.h2
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-5xl md:text-7xl font-black mb-8 drop-shadow-2xl"
              >
                SÖZ TAPYLDY!
              </motion.h2>
              <div className="flex justify-center gap-5 md:gap-8 flex-wrap">
                {gameState.current_word.toUpperCase().split('').map((letter: string, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotateY: 180 }}
                    animate={{ scale: 1, rotateY: 0 }}
                    transition={{ delay: 0.4 + i * 0.12, type: "spring", stiffness: 200 }}
                    className="w-16 h-16 md:w-24 md:h-24 bg-white text-green-700 text-5xl md:text-7xl font-black flex items-center justify-center rounded-2xl shadow-2xl border-4 border-green-300"
                  >
                    {letter}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Başarısızlık Overlay */}
      <AnimatePresence>
        {showFailedOverlay && failedWord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.7, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.7, y: -50, opacity: 0 }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 120
              }}
              className="bg-gradient-to-br from-red-600 to-red-800 p-10 md:p-16 rounded-3xl text-white text-center shadow-2xl border-4 border-red-300"
            >
              <motion.h2
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-6xl font-black mb-8 drop-shadow-2xl"
              >
                SÖZ {failedWord.toUpperCase()} BOLMALYDY!
              </motion.h2>
              <div className="flex justify-center gap-5 md:gap-8 flex-wrap">
                {failedWord.toUpperCase().split('').map((letter: string, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotateY: 180 }}
                    animate={{ scale: 1, rotateY: 0 }}
                    transition={{ delay: 0.4 + i * 0.12, type: "spring", stiffness: 200 }}
                    className="w-16 h-16 md:w-24 md:h-24 bg-white text-red-700 text-5xl md:text-7xl font-black flex items-center justify-center rounded-2xl shadow-2xl border-4 border-red-300"
                  >
                    {letter}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};