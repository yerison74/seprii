import React from 'react';
import { UserCheck, UserX, Clock3 } from 'lucide-react';

interface AttendanceStatsProps {
  presentes: number;
  ausentes: number;
  tardios: number;
}

const AttendanceStats: React.FC<AttendanceStatsProps> = ({ presentes, ausentes, tardios }) => {
  const cards = [
    {
      label: 'Presentes',
      value: presentes,
      icon: <UserCheck size={18} />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Ausentes',
      value: ausentes,
      icon: <UserX size={18} />,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
    },
    {
      label: 'Tardíos',
      value: tardios,
      icon: <Clock3 size={18} />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={[
            'rounded-[10px] border bg-white px-4 py-3.5 flex items-center justify-between',
            c.border,
          ].join(' ')}
        >
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{c.label}</p>
            <p className={['text-2xl font-semibold mt-1 tabular-nums', c.color].join(' ')}>
              {c.value}
            </p>
          </div>
          <span
            className={[
              'h-10 w-10 rounded-[10px] inline-flex items-center justify-center',
              c.bg,
              c.color,
            ].join(' ')}
          >
            {c.icon}
          </span>
        </div>
      ))}
    </div>
  );
};

export default AttendanceStats;
