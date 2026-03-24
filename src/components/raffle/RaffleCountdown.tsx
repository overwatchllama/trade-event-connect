import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface RaffleCountdownProps {
  deadline: string;
  onExpire?: () => void;
}

export const RaffleCountdown = ({ deadline, onExpire }: RaffleCountdownProps) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
      setRemaining(diff);
      if (diff === 0 && onExpire) onExpire();
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining <= 30;

  if (remaining === 0) {
    return <p className="text-sm text-destructive font-medium">⏰ Time expired!</p>;
  }

  return (
    <p className={`text-sm font-mono flex items-center gap-1 ${isUrgent ? 'text-destructive animate-pulse' : 'text-amber-700 dark:text-amber-400'}`}>
      <Clock className="h-3 w-3" />
      {minutes}:{seconds.toString().padStart(2, '0')} remaining
    </p>
  );
};
