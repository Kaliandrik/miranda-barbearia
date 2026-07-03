import { useState, useEffect } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase, getProfessionals } from "../lib/supabase";

interface StepDateTimeProps {
  selectedDate: string;
  selectedTime: string;
  clientName: string;
  clientPhone: string;
  selectedServicesCount: number;
  professionalId?: string;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onChangeName: (name: string) => void;
  onChangePhone: (phone: string) => void;
}

const DAY_MAP: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function StepDateTime({
  selectedDate,
  selectedTime,
  clientName,
  clientPhone,
  selectedServicesCount,
  professionalId,
  onSelectDate,
  onSelectTime,
  onChangeName,
  onChangePhone,
}: StepDateTimeProps) {
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<Record<string, string[]>>({});
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("20:00");
  const [workDays, setWorkDays] = useState<Record<string, boolean> | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [loadingProf, setLoadingProf] = useState(true);
  const [profError, setProfError] = useState<string | null>(null);

  const dateBlockedSlots = selectedDate && blockedSlots[selectedDate]
    ? blockedSlots[selectedDate]
    : [];

  const allBlocked = [
    ...occupiedTimes,
    ...(Array.isArray(blockedTimes) ? blockedTimes : []),
    ...dateBlockedSlots,
  ];

  useEffect(() => {
    setLoadingProf(true);
    setProfError(null);
    getProfessionals()
      .then((profs) => {
        applyProfessionalData(profs);
        setLoadingProf(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar profissional:", err);
        setProfError("Erro ao carregar horários do barbeiro.");
        setLoadingProf(false);
      });
  }, [professionalId, calendarMonth, selectedDate]);

  function applyProfessionalData(profs: any[]) {
    const prof = professionalId
      ? (profs.find((p) => p.id === professionalId) || profs[0])
      : (profs.find((p) => p.name === "Miranda") || profs[0]);
    if (!prof) return;
    setWorkStart(prof.work_start || "08:00");
    setWorkEnd(prof.work_end || "20:00");
    setWorkDays(prof.work_days || null);
    setBlockedTimes(Array.isArray(prof.blocked_times) ? prof.blocked_times : []);
    setBlockedSlots(prof.blocked_slots || {});
    setBlockedDates(Array.isArray(prof.blocked_dates) ? prof.blocked_dates : []);
  }

  const [startH, startM] = workStart.split(":").map(Number);
  const [endH, endM] = workEnd.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const availableHours: string[] = [];
  for (let m = startMinutes; m <= endMinutes; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    availableHours.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
  }

  const fetchDone = !loadingProf;
  const hasActiveDays = workDays && Object.values(workDays).some((v) => String(v) === "true");

  // Calendar helpers
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function isAvailableDay(date: Date) {
    if (date < today) return false;
    if (date > maxDate) return false;
    if (!fetchDone) return false;
    const iso = formatISODate(date);
    if (blockedDates.includes(iso)) return false;
    const wk = DAY_MAP[date.getDay()];
    return String(workDays?.[wk]) === "true";
  }

  function formatISODate(date: Date) {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().split("T")[0];
  }

  function isSelected(day: number) {
    const d = new Date(year, month, day);
    return selectedDate === formatISODate(d);
  }

  function isToday(day: number) {
    const d = new Date(year, month, day);
    return d.toDateString() === today.toDateString();
  }

  function prevMonth() {
    setCalendarMonth(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCalendarMonth(new Date(year, month + 1, 1));
  }

  const canGoPrev = new Date(year, month - 1, 1) >= new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoNext = new Date(year, month + 1, 1) <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  // Busca horários já ocupados
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchOccupiedTimes() {
      setLoadingTimes(true);
      const { data, error } = await supabase
        .from("appointments")
        .select("appointment_time, services")
        .eq("appointment_date", selectedDate)
        .not("status", "eq", "Cancelado");

      if (!error && data) {
        const slots: string[] = [];
        data.forEach((ap: { appointment_time: string; services: string[] }) => {
          slots.push(ap.appointment_time);
          const servicesArray = Array.isArray(ap.services) ? ap.services : [];
          if (servicesArray.length >= 2) {
            const [h, m] = ap.appointment_time.split(":").map(Number);
            const nextMinutes = m === 0 ? 30 : 0;
            const nextHour = m === 0 ? h : h + 1;
            const nextSlot = `${nextHour.toString().padStart(2, "0")}:${nextMinutes.toString().padStart(2, "0")}`;
            slots.push(nextSlot);
          }
        });
        setOccupiedTimes(slots);
      }
      setLoadingTimes(false);
    }

    fetchOccupiedTimes();
  }, [selectedDate]);

  const requires60Min = selectedServicesCount >= 2;

  function renderCalendar() {
    const cells: React.ReactNode[] = [];
    const emptyCells = firstDay;

    for (let i = 0; i < emptyCells; i++) {
      cells.push(<div key={`empty-${i}`} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const available = isAvailableDay(date);
      const selected = isSelected(day);
      const todayHighlight = isToday(day);
      const isoDate = formatISODate(date);

      cells.push(
        <button
          key={day}
          type="button"
          disabled={!available}
          onClick={() => {
            if (available) {
              onSelectDate(isoDate);
              onSelectTime("");
            }
          }}
          className={`w-full aspect-square rounded-xl text-sm font-bold transition-all flex items-center justify-center ${
            selected
              ? "bg-white text-black shadow-lg scale-105"
              : available
                ? todayHighlight
                  ? "bg-blue-950/30 border border-blue-900/50 text-blue-400 hover:bg-blue-950/50"
                  : "bg-zinc-950 border border-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white"
                : "text-zinc-800 cursor-not-allowed"
          }`}
        >
          {day}
        </button>
      );
    }

    return cells;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 hidden">
        <input type="text" value={clientName} onChange={(e) => onChangeName(e.target.value)} />
        <input type="tel" value={clientPhone} onChange={(e) => onChangePhone(e.target.value)} />
      </div>

      {/* Loading / Error states */}
      {loadingProf && (
        <div className="flex items-center justify-center py-8 gap-2">
          <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-xs">Carregando horários disponíveis...</p>
        </div>
      )}

      {profError && (
        <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-4 text-center">
          <p className="text-red-400 text-xs font-semibold">{profError}</p>
          <p className="text-zinc-600 text-[10px] mt-1">
            Verifique as RLS policies no Supabase (SELECT anônimo na tabela <span className="font-mono">professionals</span>)
          </p>
        </div>
      )}

      {fetchDone && !profError && !hasActiveDays && (
        <div className="text-center py-8 border border-dashed border-zinc-800 rounded-2xl">
          <p className="text-zinc-500 text-xs">Nenhum dia de atendimento configurado.</p>
        </div>
      )}

      {/* Mini Calendar */}
      {fetchDone && !profError && hasActiveDays && (
      <div className="space-y-2">
        <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <Calendar size={14} /> Escolha o Dia
        </p>

        <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              disabled={!canGoPrev}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-white font-bold text-sm capitalize">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              disabled={!canGoNext}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-wider py-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>
        </div>
      </div>
      )}

      {/* Grid de Horários */}
      {selectedDate && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Clock size={14} /> Horários Disponíveis
            <span className="text-zinc-600 font-normal normal-case ml-auto">
              ({requires60Min ? "Sessão de 60 min" : "Sessão de 30 min"})
            </span>
          </p>
          {loadingTimes ? (
            <div className="text-center py-4 text-zinc-600 text-xs">Buscando horários livres...</div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableHours.map((hour) => {
                let isOccupied = allBlocked.includes(hour);

                if (requires60Min && !isOccupied) {
                  const [h, m] = hour.split(":").map(Number);
                  const slotMinutes = h * 60 + m;
                  if (slotMinutes + 60 > endMinutes) {
                    isOccupied = true;
                  } else {
                    const nextMinutes = m === 0 ? 30 : 0;
                    const nextHour = m === 0 ? h : h + 1;
                    const nextSlot = `${nextHour.toString().padStart(2, "0")}:${nextMinutes.toString().padStart(2, "0")}`;
                    if (allBlocked.includes(nextSlot)) {
                      isOccupied = true;
                    }
                  }
                }

                const isSelected = selectedTime === hour;

                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={isOccupied}
                    onClick={() => onSelectTime(hour)}
                    className={`py-3 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-white border-white text-black font-bold"
                        : isOccupied
                          ? "bg-zinc-950 border-zinc-950 text-zinc-800 cursor-not-allowed line-through opacity-40"
                          : "bg-zinc-950 border-zinc-900 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
