import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Clock, Phone, User, Loader2 } from "lucide-react";
import { getAppointmentsByPhone, type Appointment } from "../lib/supabase";

const STATUS_LABELS: Record<string, string> = {
  Pendente: "Pendente",
  Confirmado: "Confirmado",
  "Em Andamento": "Em Andamento",
  Concluído: "Concluído",
  Cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  Pendente: "text-yellow-400 border-yellow-400/30",
  Confirmado: "text-emerald-400 border-emerald-400/30",
  "Em Andamento": "text-blue-400 border-blue-400/30",
  Concluído: "text-zinc-500 border-zinc-700",
  Cancelado: "text-red-400 border-red-400/30",
};

interface MyAppointmentsProps {
  clientPhone: string;
  clientName: string;
  onClose: () => void;
}

export default function MyAppointments({ clientPhone, clientName, onClose }: MyAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointments() {
      setIsLoading(true);
      try {
        const data = await getAppointmentsByPhone(clientPhone);
        setAppointments(data);
      } catch (err) {
        console.error("Erro ao buscar agendamentos:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAppointments();
  }, [clientPhone]);

  function formatDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  const confirmedAppointments = appointments.filter(
    (a) => a.status !== "Cancelado" && new Date(`${a.appointment_date}T${a.appointment_time}`) >= new Date()
  );
  const previousAppointments = appointments.filter(
    (a) => a.status === "Cancelado" || new Date(`${a.appointment_date}T${a.appointment_time}`) < new Date()
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-black border border-zinc-900 rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <User size={16} className="text-zinc-500" />
            <div>
              <h3 className="text-white font-bold text-sm">Meus Agendamentos</h3>
              <p className="text-[11px] text-zinc-500">{clientName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-72px)] custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={24} className="animate-spin text-zinc-600" />
              <p className="text-zinc-500 text-sm">Buscando agendamentos...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Calendar size={32} className="text-zinc-800" />
              <p className="text-zinc-500 text-sm">Nenhum agendamento encontrado</p>
              <p className="text-zinc-700 text-xs">Este número ainda não possui agendamentos</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Próximos agendamentos */}
              {confirmedAppointments.length > 0 && (
                <div className="space-y-3">
                  <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Clock size={12} /> Próximos Agendamentos
                  </p>
                  {confirmedAppointments.map((apt) => (
                    <AppointmentCard key={apt.id} appointment={apt} formatDate={formatDate} />
                  ))}
                </div>
              )}

              {/* Histórico */}
              {previousAppointments.length > 0 && (
                <div className="space-y-3">
                  <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Calendar size={12} /> Histórico
                  </p>
                  {previousAppointments.map((apt) => (
                    <AppointmentCard key={apt.id} appointment={apt} formatDate={formatDate} muted />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AppointmentCard({
  appointment,
  formatDate,
  muted,
}: {
  appointment: Appointment;
  formatDate: (d: string) => string;
  muted?: boolean;
}) {
  return (
    <div
      className={`bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4 space-y-2 ${
        muted ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          <Calendar size={14} className="text-zinc-500 flex-shrink-0" />
          {formatDate(appointment.appointment_date)}
        </div>
        <span
          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
            STATUS_COLORS[appointment.status || "Pendente"] || STATUS_COLORS.Pendente
          }`}
        >
          {STATUS_LABELS[appointment.status || "Pendente"] || appointment.status}
        </span>
      </div>
      <div className="flex items-center gap-2 text-zinc-400 text-xs">
        <Clock size={12} className="flex-shrink-0" />
        {appointment.appointment_time}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {appointment.services?.map((svc, i) => (
          <span
            key={i}
            className="text-[10px] bg-zinc-900 text-zinc-400 px-2.5 py-1 rounded-full font-medium"
          >
            {svc}
          </span>
        ))}
      </div>
      {!muted && appointment.status === "Pendente" && (
        <div className="flex items-center gap-1.5 pt-1">
          <Phone size={10} className="text-zinc-600" />
          <span className="text-[10px] text-zinc-600">{appointment.client_phone}</span>
        </div>
      )}
    </div>
  );
}
