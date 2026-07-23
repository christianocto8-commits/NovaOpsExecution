"use client";

import { useMemo } from "react";

type TaskWeekCalendarStripProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  taskCountByDate: Map<string, number>;
};

function formatKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getWeekDays(anchor: Date) {
  const start = new Date(anchor);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function TaskWeekCalendarStrip({
  selectedDate,
  onSelectDate,
  taskCountByDate,
}: TaskWeekCalendarStripProps) {
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const todayKey = formatKey(new Date());
  const selectedKey = formatKey(selectedDate);

  return (
    <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {weekDays.map((date) => {
        const key = formatKey(date);
        const count = taskCountByDate.get(key) ?? 0;
        const isSelected = key === selectedKey;
        const isToday = key === todayKey;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectDate(date)}
            className={[
              "flex min-w-[52px] flex-col items-center rounded-xl px-2 py-2 transition",
              isSelected
                ? "bg-emerald-700 text-white"
                : isToday
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            <span className="text-[10px] font-semibold uppercase">
              {date.toLocaleDateString("en-US", { weekday: "short" })}
            </span>
            <span className="mt-0.5 text-lg font-bold">{date.getDate()}</span>
            {count > 0 ? (
              <span
                className={[
                  "mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700",
                ].join(" ")}
              >
                {count}
              </span>
            ) : (
              <span className="mt-1 h-4" />
            )}
          </button>
        );
      })}
    </div>
  );
}
