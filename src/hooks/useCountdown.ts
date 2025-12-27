import { useEffect, useState } from 'react';

const TIMER_DURATION = 30; // 30 saniye

export const useCountdown = (
  active: boolean,
  startedAt: string | null,
  onTimeout: () => void
) => {
  const [timeRemaining, setTimeRemaining] = useState(TIMER_DURATION);

  useEffect(() => {
    if (!startedAt) {
      setTimeRemaining(TIMER_DURATION);
      return;
    }

    // Başlangıçta kalan süreyi hesapla ve sabitle
    const initialElapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
    const initialRemaining = Math.max(0, TIMER_DURATION - initialElapsed);
    setTimeRemaining(Math.ceil(initialRemaining));

    if (!active) {
      // Pause'daysa interval kurma, kalan süre donuk kalsın
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      const remaining = TIMER_DURATION - elapsed;

      if (remaining <= 0) {
        setTimeRemaining(0);
        onTimeout();
        clearInterval(interval);
      } else {
        setTimeRemaining(Math.ceil(remaining));
      }
    }, 250);

    return () => clearInterval(interval);
  }, [active, startedAt, onTimeout]);

  return timeRemaining;
};