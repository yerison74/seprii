import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BTN_NAV } from '../buttonStyles';
import type { VacacionMock } from '../mockData';

interface VacationCalendarProps {
  vacaciones: VacacionMock[];
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function mismaFecha(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function estaEnRango(dia: Date, inicio: Date, fin: Date): boolean {
  const t = dia.getTime();
  return t >= inicio.getTime() && t <= fin.getTime();
}

const VacationCalendar: React.FC<VacationCalendarProps> = ({ vacaciones }) => {
  const hoy = new Date();
  const [cursor, setCursor] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));

  const celdas = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    // Monday-first offset
    const offset = (primerDia.getDay() + 6) % 7;
    const dias: Array<{ date: Date; inMonth: boolean } | null> = [];

    for (let i = 0; i < offset; i += 1) dias.push(null);
    for (let d = 1; d <= ultimoDia.getDate(); d += 1) {
      dias.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (dias.length % 7 !== 0) dias.push(null);
    return dias;
  }, [cursor]);

  const eventosMes = useMemo(() => {
    return vacaciones.filter((v) => {
      const ini = parseLocalDate(v.fechaInicio);
      const fin = parseLocalDate(v.fechaFin);
      const mesIni = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const mesFin = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      return ini <= mesFin && fin >= mesIni;
    });
  }, [vacaciones, cursor]);

  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className={BTN_NAV}
          aria-label="Mes anterior"
        >
          <ChevronLeft size={15} strokeWidth={1.75} />
        </button>
        <h4 className="text-sm font-semibold text-slate-800 tracking-tight">
          {MESES[cursor.getMonth()]} {cursor.getFullYear()}
        </h4>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className={BTN_NAV}
          aria-label="Mes siguiente"
        >
          <ChevronRight size={15} strokeWidth={1.75} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celdas.map((celda, idx) => {
          if (!celda) {
            return <div key={`empty-${idx}`} className="aspect-square rounded-lg bg-transparent" />;
          }

          const esHoy = mismaFecha(celda.date, hoy);
          const marcados = eventosMes.filter((v) =>
            estaEnRango(celda.date, parseLocalDate(v.fechaInicio), parseLocalDate(v.fechaFin)),
          );
          const tieneAprobada = marcados.some((v) => v.estado === 'Aprobada');
          const tienePendiente = marcados.some((v) => v.estado === 'Pendiente');

          return (
            <div
              key={celda.date.toISOString()}
              title={marcados.map((v) => `${v.colaborador} (${v.estado})`).join('\n')}
              className={[
                'aspect-square rounded-lg border text-xs flex flex-col items-center justify-center gap-0.5 transition-colors',
                esHoy
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-transparent bg-slate-50 text-slate-700 hover:bg-slate-100',
              ].join(' ')}
            >
              <span>{celda.date.getDate()}</span>
              {(tieneAprobada || tienePendiente) && (
                <span className="flex items-center gap-0.5">
                  {tieneAprobada && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  {tienePendiente && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Aprobada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Pendiente
        </span>
      </div>
    </div>
  );
};

export default VacationCalendar;
