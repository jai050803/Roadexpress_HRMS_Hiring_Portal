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
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-50 text-stone-700 border border-stone-200 text-xs font-medium ${className}`}
      >
        <Clock className="w-3.5 h-3.5 text-stone-500" />
        <span>Application deadline passed</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium ${className}`}
      >
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>
          Closes in:{" "}
          <strong className="text-slate-900 font-tabular font-medium">
            {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
            {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </strong>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`p-3.5 rounded-md bg-slate-50 border border-slate-200/90 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>Application deadline countdown</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-white border border-slate-200/80 p-2 rounded-md">
          <div className="text-base font-semibold text-slate-950 font-tabular">{timeLeft.days}</div>
          <div className="text-[11px] text-slate-500">Days</div>
        </div>
        <div className="bg-white border border-slate-200/80 p-2 rounded-md">
          <div className="text-base font-semibold text-slate-950 font-tabular">{timeLeft.hours}</div>
          <div className="text-[11px] text-slate-500">Hours</div>
        </div>
        <div className="bg-white border border-slate-200/80 p-2 rounded-md">
          <div className="text-base font-semibold text-slate-950 font-tabular">{timeLeft.minutes}</div>
          <div className="text-[11px] text-slate-500">Mins</div>
        </div>
        <div className="bg-white border border-slate-200/80 p-2 rounded-md">
          <div className="text-base font-semibold text-slate-950 font-tabular">{timeLeft.seconds}</div>
          <div className="text-[11px] text-slate-500">Secs</div>
        </div>
      </div>
    </div>
  );
}
