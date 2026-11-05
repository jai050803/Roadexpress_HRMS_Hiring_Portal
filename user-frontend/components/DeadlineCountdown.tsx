"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface DeadlineCountdownProps {
  deadline?: string | null;
  onExpire?: () => void;
  className?: string;
  compact?: boolean;
}

export default function DeadlineCountdown({
  deadline,
  onExpire,
  className = "",
  compact = false,
}: DeadlineCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    if (!deadline) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const target = new Date(deadline).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        onExpire?.();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  if (!deadline || !timeLeft) {
    return null;
  }

  if (timeLeft.isExpired) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold ${className}`}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>Applications Deadline Passed</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium ${className}`}
      >
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>
          Closes in:{" "}
          <strong className="text-slate-900 font-semibold">
            {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
            {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </strong>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-lg bg-slate-900 text-slate-100 border border-slate-800 ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        <span>Application Deadline Countdown</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-slate-800 p-2 rounded">
          <div className="text-lg font-bold text-white">{timeLeft.days}</div>
          <div className="text-[10px] text-slate-400 uppercase">Days</div>
        </div>
        <div className="bg-slate-800 p-2 rounded">
          <div className="text-lg font-bold text-white">{timeLeft.hours}</div>
          <div className="text-[10px] text-slate-400 uppercase">Hours</div>
        </div>
        <div className="bg-slate-800 p-2 rounded">
          <div className="text-lg font-bold text-white">{timeLeft.minutes}</div>
          <div className="text-[10px] text-slate-400 uppercase">Mins</div>
        </div>
        <div className="bg-slate-800 p-2 rounded">
          <div className="text-lg font-bold text-white">{timeLeft.seconds}</div>
          <div className="text-[10px] text-slate-400 uppercase">Secs</div>
        </div>
      </div>
    </div>
  );
}
