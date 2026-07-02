import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";

interface StepDateTimeProps {
  selectedDate: string;
  selectedTime: string;
  clientName: string;
  clientPhone: string;
  selectedServicesCount: number; // Nova prop para saber a quantidade de serviços
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onChangeName: (name: string) => void;
  onChangePhone: (phone: string) => void;
}

export default function StepDateTime({
  selectedDate,
  selectedTime,
  clientName,
  clientPhone,
  selectedServicesCount,
  onSelectDate,
  onSelectTime,
  onChangeName,
  onChangePhone,
}: StepDateTimeProps) {
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  // 1. Gera dinamicamente os horários das 08:00 às 20:00 de 30 em 30 minutos
  const availableHours: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    const hStr = hour.toString().padStart(2, "0");
    availableHours.push(`${hStr}:00`);
    if (hour < 20) {
      availableHours.push(`${hStr}:30`); // O último horário é 20:00 estrito
    }
  }

  // Gera os próximos 7 dias a partir de hoje
  const daysList = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      isoString: d.toISOString().split("T")[0],
      dayName: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      dayNum: d.getDate(),
    };
  });

  // Busca horários já ocupados no banco de dados para o dia selecionado
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
        
        data.forEach((ap) => {
          slots.push(ap.appointment_time);
          
          // Se o agendamento já existente no banco tinha 2 ou mais serviços, 
          // ele também bloqueia o slot subsequente de 30 minutos automaticamente
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

  // Define a duração com base na quantidade de serviços selecionados pelo cliente atual
  const requires60Min = selectedServicesCount >= 2;

  return (
    <div className="space-y-5">
      {/* Dados do Cliente (Inputs ocultos visualmente caso já preenchidos no step 1) */}
      <div className="space-y-3 hidden">
        <input type="text" value={clientName} onChange={(e) => onChangeName(e.target.value)} />
        <input type="tel" value={clientPhone} onChange={(e) => onChangePhone(e.target.value)} />
      </div>

      {/* Carrossel de Dias */}
      <div className="space-y-2">
        <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <Calendar size={14} /> Escolha o Dia
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {daysList.map((day) => {
            const isSelected = selectedDate === day.isoString;
            return (
              <button
                key={day.isoString}
                type="button"
                onClick={() => { onSelectDate(day.isoString); onSelectTime(""); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border min-w-[65px] transition-all ${
                  isSelected
                    ? "bg-white border-white text-black shadow-lg"
                    : "bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                }`}
              >
                <span className={`text-[10px] uppercase font-bold ${isSelected ? "text-zinc-900" : "text-zinc-600"}`}>
                  {day.dayName}
                </span>
                <span className="text-base font-extrabold mt-0.5">{day.dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

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
                // Validação de Ocupação Padrão
                let isOccupied = occupiedTimes.includes(hour);

                // Regra Especial de 60 minutos (2+ serviços)
                if (requires60Min && !isOccupied) {
                  const [h, m] = hour.split(":").map(Number);
                  
                  // Se for 20:00, não dá pra agendar 60 min pois fecha às 20:30
                  if (hour === "20:00") {
                    isOccupied = true;
                  } else {
                    // Calcula qual seria o próximo bloco de 30 minutos
                    const nextMinutes = m === 0 ? 30 : 0;
                    const nextHour = m === 0 ? h : h + 1;
                    const nextSlot = `${nextHour.toString().padStart(2, "0")}:${nextMinutes.toString().padStart(2, "0")}`;
                    
                    // Se o próximo bloco estiver ocupado, o horário atual fica indisponível para o corte longo
                    if (occupiedTimes.includes(nextSlot)) {
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
                    className={`py-2.5 rounded-lg border text-xs font-semibold transition-all ${
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