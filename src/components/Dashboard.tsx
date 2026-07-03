import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  LogOut,
  CheckCircle2,
  XCircle,
  Clock,
  Scissors,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Copy,
  Check,
  Phone,
  Mail,
  Lock,
  Settings,
  Calendar,
  Edit3,
  Save,
  User,
  DollarSign,
  AlertTriangle,
  Send,
  X,
} from "lucide-react";
import {
  supabase,
  getAppointments,
  updateAppointment,
  getProfessionals,
  updateProfessional,
  getActiveServices,
  type Appointment,
  type Professional,
  type Service,
} from "../lib/supabase";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pendente: {
    label: "Pendente",
    color: "text-yellow-400 border-yellow-900/50 bg-yellow-950/30",
    icon: <Clock size={14} />,
  },
  Confirmado: {
    label: "Confirmado",
    color: "text-blue-400 border-blue-900/50 bg-blue-950/30",
    icon: <CheckCircle2 size={14} />,
  },
  "Em Andamento": {
    label: "Em Andamento",
    color: "text-orange-400 border-orange-900/50 bg-orange-950/30",
    icon: <Scissors size={14} />,
  },
  Concluído: {
    label: "Concluído",
    color: "text-emerald-400 border-emerald-900/50 bg-emerald-950/30",
    icon: <CheckCircle2 size={14} />,
  },
  Cancelado: {
    label: "Cancelado",
    color: "text-red-400 border-red-900/50 bg-red-950/30",
    icon: <XCircle size={14} />,
  },
};

const WEEKDAYS = [
  { key: "sun", label: "Dom" },
  { key: "mon", label: "Seg" },
  { key: "tue", label: "Ter" },
  { key: "wed", label: "Qua" },
  { key: "thu", label: "Qui" },
  { key: "fri", label: "Sex" },
  { key: "sat", label: "Sáb" },
];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function groupByDate(appointments: Appointment[]) {
  const groups: Record<string, Appointment[]> = {};
  for (const apt of appointments) {
    if (!groups[apt.appointment_date]) {
      groups[apt.appointment_date] = [];
    }
    groups[apt.appointment_date].push(apt);
  }
  return groups;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getDayStatus(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.toDateString() === today.toDateString()) return "today";
  if (date < today) return "past";
  return "future";
}

export default function Dashboard() {
  const [session, setSession] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string;
  const [tab, setTab] = useState<"appointments" | "hours">("appointments");

  // Appointments state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [searchDate, setSearchDate] = useState("");
  const [copied, setCopied] = useState(false);

  // Edit modal state
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [editServices, setEditServices] = useState<string[]>([]);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editPayment, setEditPayment] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [servicesList, setServicesList] = useState<Service[]>([]);

  // Working hours state
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [workDays, setWorkDays] = useState<Record<string, boolean>>({});
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("20:00");
  const [blockedTimes, setBlockedTimes] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<Record<string, string[]>>({});
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);
  const [hoursError, setHoursError] = useState<string | null>(null);

  // Conflict modal
  const [conflictAppointments, setConflictAppointments] = useState<Appointment[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictResolve, setConflictResolve] = useState<((notify: boolean) => void) | null>(null);

  // Close today modal
  const [showCloseTodayModal, setShowCloseTodayModal] = useState(false);
  const [closeTodaySlots, setCloseTodaySlots] = useState<string[]>([]);
  const [blockedCalMonth, setBlockedCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const publicUrl = `${window.location.origin}/agendar`;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }: { data: { session: import("@supabase/supabase-js").Session | null } }) => {
      setSession(!!s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: import("@supabase/supabase-js").AuthChangeEvent, s: import("@supabase/supabase-js").Session | null) => {
      setSession(!!s);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchAppointments();
    fetchProfessional();
    fetchServices();
  }, [session]);

  async function fetchServices() {
    try {
      const data = await getActiveServices();
      setServicesList(data);
    } catch {
      // ignore
    }
  }

  async function fetchProfessional() {
    try {
      const profs = await getProfessionals();
      const miranda = profs.find((p) => p.name === "Miranda") || profs[0];
      if (miranda) {
        setProfessional(miranda);
        setWorkDays(miranda.work_days || {});
        setWorkStart(miranda.work_start || "08:00");
        setWorkEnd(miranda.work_end || "20:00");
        setBlockedTimes(miranda.blocked_times || []);
        setBlockedSlots(miranda.blocked_slots || {});
        setBlockedDates(miranda.blocked_dates || []);
      }
    } catch {
      // ignore
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = publicUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function shareWhatsApp() {
    const text = `Olá! Agende seu horário na MD Barbearia:\n${publicUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function fetchAppointments() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAppointments();
      setAppointments(data);

      const start = new Date();
      start.setDate(start.getDate() - 2);
      const end = new Date();
      end.setDate(end.getDate() + 7);

      const autoExpand = new Set<string>();
      for (const apt of data) {
        const [y, m, d] = apt.appointment_date.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        if (date >= start && date <= end) {
          autoExpand.add(apt.appointment_date);
        }
      }
      if (autoExpand.size === 0 && data.length > 0) {
        autoExpand.add(data[0].appointment_date);
      }
      setExpandedDates(autoExpand);
    } catch (err) {
      console.error("Erro ao buscar agendamentos:", err);
      setError("Erro ao carregar agendamentos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail || adminEmail,
        password: authPassword,
      });
      if (signInError) throw signInError;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao fazer login";
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  }

  function openEditModal(apt: Appointment) {
    setEditingApt(apt);
    setEditServices([...apt.services]);
    setEditDate(apt.appointment_date);
    setEditTime(apt.appointment_time);
    setEditPayment(apt.payment_method);
  }

  function toggleEditService(svcName: string) {
    setEditServices((prev) =>
      prev.includes(svcName)
        ? prev.filter((s) => s !== svcName)
        : [...prev, svcName]
    );
  }

  function computedEditPrice() {
    return editServices.reduce((sum, name) => {
      const svc = servicesList.find((s) => s.name === name);
      return sum + (svc ? svc.price : 0);
    }, 0);
  }

  async function saveEdit() {
    if (!editingApt) return;
    setSavingEdit(true);
    try {
      const oldApt = editingApt;
      const editPrice = computedEditPrice();
      const changed: string[] = [];

      const oldServices = oldApt.services.join(", ");
      const newServices = editServices.join(", ");
      if (oldServices !== newServices) changed.push(`Serviços: ${oldServices} → ${newServices}`);

      if (oldApt.appointment_date !== editDate) {
        changed.push(`Data: ${oldApt.appointment_date} → ${editDate}`);
      }
      if (oldApt.appointment_time !== editTime) {
        changed.push(`Horário: ${oldApt.appointment_time} → ${editTime}`);
      }
      if (oldApt.payment_method !== editPayment) {
        changed.push(`Pagamento: ${oldApt.payment_method} → ${editPayment}`);
      }
      if (Number(oldApt.total_price) !== editPrice) {
        changed.push(`Valor: R$ ${Number(oldApt.total_price).toFixed(2)} → R$ ${editPrice.toFixed(2)}`);
      }

      const updated = await updateAppointment(editingApt.id, {
        services: editServices,
        appointment_date: editDate,
        appointment_time: editTime,
        payment_method: editPayment,
        total_price: editPrice,
      });

      setAppointments((prev) =>
        prev.map((a) => (a.id === editingApt.id ? { ...a, ...updated } : a))
      );

      if (changed.length > 0) {
        const message = `Olá! Seu agendamento na MD Barbearia foi atualizado:\n${changed.join("\n")}\n\nNovo resumo:\n${editServices.join(", ")}\n${editDate} às ${editTime}\nPagamento: ${editPayment}\nTotal: R$ ${editPrice.toFixed(2).replace(".", ",")}`;

        try {
          await supabase.functions.invoke("disparar-whatsapp", {
            body: {
              clientPhone: editingApt.client_phone,
              professionalName: "Miranda",
              services: editServices,
              date: editDate,
              time: editTime,
              paymentMethod: editPayment,
              total: editPrice,
            },
          });
        } catch {
          // fallback: open WhatsApp Web
          window.open(
            `https://wa.me/${editingApt.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
            "_blank"
          );
        }
      }

      setEditingApt(null);
    } catch (err) {
      console.error("Erro ao editar agendamento:", err);
    } finally {
      setSavingEdit(false);
    }
  }

  async function saveHours() {
    if (!professional) return;
    setSavingHours(true);
    setHoursError(null);

    const oldDays = professional.work_days || {};
    const removedDays: string[] = Object.keys(oldDays).filter((key) => !(key in workDays));

    // 1. Verifica conflitos ANTES de salvar
    const affected = await findAffectedAppointments(removedDays);
    if (affected.length > 0) {
      setConflictAppointments(affected);
      setShowConflictModal(true);
      setConflictResolve(() => async (notify: boolean) => {
        setShowConflictModal(false);
        await performSave(notify, affected);
      });
      setSavingHours(false);
      return;
    }

    // 2. Sem conflitos → salva direto
    await performSave(false, []);
  }

  async function findAffectedAppointments(removedDays: string[]): Promise<Appointment[]> {
    if (removedDays.length === 0) return [];
    const reverseMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const removedDayNums = removedDays.map((k) => reverseMap[k]).filter((n) => n !== undefined);
    try {
      const { data: futureApts } = await supabase
        .from("appointments")
        .select("*")
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .not("status", "eq", "Cancelado");
      return (futureApts || []).filter((apt: Appointment) => {
        const d = new Date(apt.appointment_date + "T12:00:00");
        return removedDayNums.includes(d.getDay());
      });
    } catch {
      return [];
    }
  }

  async function notifyClients(affected: Appointment[]) {
    for (const apt of affected) {
      try {
        await supabase.functions.invoke("disparar-whatsapp", {
          body: {
            clientPhone: apt.client_phone,
            professionalName: "Miranda",
            services: apt.services,
            date: apt.appointment_date,
            time: apt.appointment_time,
            paymentMethod: apt.payment_method,
            total: apt.total_price,
          },
        });
      } catch {
        window.open(
          `https://wa.me/${apt.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
            `Olá! Seu agendamento na MD Barbearia para ${apt.appointment_date} às ${apt.appointment_time} precisou ser alterado devido a mudanças nos horários de funcionamento. Por favor, entre em contato para mais informações.`
          )}`,
          "_blank"
        );
      }
    }
  }

  async function performSave(notify: boolean, affected: Appointment[]) {
    if (!professional) return;
    setSavingHours(true);
    try {
      await updateProfessional(professional.id, {
        work_days: workDays,
        work_start: workStart,
        work_end: workEnd,
        blocked_times: blockedTimes,
        blocked_slots: blockedSlots,
        blocked_dates: blockedDates,
      });
      setProfessional((prev) => prev ? { ...prev, work_days: workDays, work_start: workStart, work_end: workEnd, blocked_times: blockedTimes, blocked_slots: blockedSlots, blocked_dates: blockedDates } : prev);

      if (notify && affected.length > 0) {
        await notifyClients(affected);
      }

      setHoursSaved(true);
      setTimeout(() => setHoursSaved(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar horários:", err);
      try {
        await updateProfessional(professional.id, {
          work_days: workDays,
          work_start: workStart,
          work_end: workEnd,
          blocked_slots: blockedSlots,
          blocked_dates: blockedDates,
        });
        setProfessional((prev) => prev ? { ...prev, work_days: workDays, work_start: workStart, work_end: workEnd, blocked_slots: blockedSlots, blocked_dates: blockedDates } : prev);

        if (notify && affected.length > 0) {
          await notifyClients(affected);
        }

        setHoursSaved(true);
        setTimeout(() => setHoursSaved(false), 3000);
      } catch (e) {
        console.error("Erro ao salvar horários (tentativa sem blocked_times):", e);
        setHoursError("Erro ao salvar. Verifique as RLS policies no Supabase.");
      }
    } finally {
      setSavingHours(false);
    }
  }

  function toggleDay(key: string) {
    setWorkDays((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: true };
    });
  }

  function addBlockedTime(time: string) {
    if (!blockedTimes.includes(time)) {
      setBlockedTimes((prev) => [...prev, time].sort());
    }
  }

  function removeBlockedTime(time: string) {
    setBlockedTimes((prev) => prev.filter((t) => t !== time));
  }

  function generateHourSlots() {
    const [sh, sm] = workStart.split(":").map(Number);
    const [eh, em] = workEnd.split(":").map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    const slots: string[] = [];
    for (let m = startM; m <= endM; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
    }
    return slots;
  }

  function handleCloseToday() {
    const [startH, startM] = workStart.split(":").map(Number);
    const [endH, endM] = workEnd.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const slots: string[] = [];
    for (let m = startMinutes; m < endMinutes; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
    }

    if (slots.length === 0) return;
    setCloseTodaySlots(slots);
    setShowCloseTodayModal(true);
  }

  function confirmCloseToday() {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setBlockedSlots((prev) => ({
      ...prev,
      [iso]: closeTodaySlots,
    }));
    setShowCloseTodayModal(false);
    setCloseTodaySlots([]);
  }

  function removeBlockedDate(date: string) {
    setBlockedDates((prev) => prev.filter((d) => d !== date));
  }

  function formatDateBr(dateStr: string) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  if (!session) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm mx-auto bg-black border border-zinc-900 rounded-3xl shadow-2xl overflow-hidden p-8"
        >
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center p-2 shadow-xl overflow-hidden mb-4">
              <img
                src="/img/logobarbearia.png"
                alt="MD Barbearia"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <h2 className="text-white font-bold text-xl tracking-wide">Painel do Barbeiro</h2>
            <p className="text-zinc-500 text-xs mt-1">Acesso restrito</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl pl-11 pr-4 py-4 text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-700 text-sm font-medium transition-all"
                autoFocus
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="password"
                placeholder="Senha"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl pl-11 pr-4 py-4 text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-700 text-sm font-medium transition-all"
              />
            </div>
            {authError && (
              <p className="text-red-400 text-xs text-center">{authError}</p>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-600 text-black font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.99]"
            >
              {authLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              Entrar
            </button>
          </form>

          <a
            href="/agendar"
            className="block text-center text-zinc-600 text-xs mt-6 hover:text-zinc-400 transition-colors"
          >
            ← Voltar para agendamento
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-zinc-500 text-sm">Gerencie os agendamentos</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-1.5 px-4 py-3 text-zinc-400 hover:text-white transition-all text-sm font-medium hover:bg-zinc-800"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                {copied ? "Copiado" : "Copiar Link"}
              </button>
              <div className="w-px h-6 bg-zinc-800" />
              <button
                type="button"
                onClick={shareWhatsApp}
                className="flex items-center gap-1.5 px-4 py-3 text-emerald-400 hover:text-emerald-300 transition-all text-sm font-medium hover:bg-zinc-800"
              >
                <Phone size={16} /> WhatsApp
              </button>
            </div>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white px-4 py-3 rounded-2xl border border-zinc-800 transition-all text-sm font-medium"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-black border border-zinc-900 rounded-2xl p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab("appointments")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === "appointments"
                ? "bg-white text-black shadow-lg"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <Calendar size={16} />
            Agendamentos
          </button>
          <button
            type="button"
            onClick={() => setTab("hours")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === "hours"
                ? "bg-white text-black shadow-lg"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <Settings size={16} />
            Horários
          </button>
        </div>

        {/* Tab: Appointments */}
        {tab === "appointments" && (
          <>
            <div className="mb-6">
              <div className="relative max-w-xs">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full bg-black border border-zinc-900 rounded-2xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-zinc-700 text-sm transition-all"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 size={32} className="animate-spin text-zinc-600" />
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  type="button"
                  onClick={fetchAppointments}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-2xl border border-zinc-800 transition-all text-sm"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <AppointmentList
                appointments={appointments}
                searchDate={searchDate}
                expandedDates={expandedDates}
                toggleDate={(date) =>
                  setExpandedDates((prev) => {
                    const next = new Set(prev);
                    if (next.has(date)) next.delete(date);
                    else next.add(date);
                    return next;
                  })
                }
                onEdit={openEditModal}
              />
            )}
          </>
        )}

        {/* Tab: Working Hours */}
        {tab === "hours" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl"
          >
            <div className="bg-black border border-zinc-900 rounded-3xl p-6 shadow-xl">
              <h2 className="text-white font-bold text-lg mb-1">Horários de Atendimento</h2>
              <p className="text-zinc-500 text-sm mb-6">Os clientes só poderão agendar nos dias e horários disponíveis.</p>

              <div className="space-y-6">
                {/* Days of week */}
                <div>
                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-3">
                    Dias da Semana
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const active = workDays[day.key];
                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => toggleDay(day.key)}
                          className={`px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                            active
                              ? "bg-white border-white text-black shadow-lg"
                              : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Start / End time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-2">
                      Início
                    </p>
                    <input
                      type="time"
                      value={workStart}
                      onChange={(e) => setWorkStart(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-zinc-700 text-sm transition-all"
                    />
                  </div>
                  <div>
                    <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-2">
                      Fim
                    </p>
                    <input
                      type="time"
                      value={workEnd}
                      onChange={(e) => setWorkEnd(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-zinc-700 text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Blocked times */}
                <div>
                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-3">
                    Horários Bloqueados (ex: almoço)
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {generateHourSlots().map((slot) => {
                      const isBlocked = blockedTimes.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() =>
                            isBlocked ? removeBlockedTime(slot) : addBlockedTime(slot)
                          }
                          className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                            isBlocked
                              ? "bg-red-950/50 border-red-900/50 text-red-400 line-through"
                              : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                  {blockedTimes.length > 0 && (
                    <p className="text-zinc-600 text-xs">
                      {blockedTimes.length} horário{blockedTimes.length !== 1 ? "s" : ""} bloqueado
                      {blockedTimes.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* Blocked dates */}
                <div>
                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-3">
                    Bloqueio de Datas Inteiras
                  </p>

                  {(() => {
                    const calYear = blockedCalMonth.getFullYear();
                    const calMonth = blockedCalMonth.getMonth();
                    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                    const firstDay = new Date(calYear, calMonth, 1).getDay();
                    const todayStr = new Date().toISOString().slice(0, 10);

                    const cells: React.ReactNode[] = [];
                    for (let i = 0; i < firstDay; i++) {
                      cells.push(<div key={`e-${i}`} />);
                    }
                    for (let day = 1; day <= daysInMonth; day++) {
                      const iso = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const blocked = blockedDates.includes(iso);
                      const isPast = iso < todayStr;
                      cells.push(
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (blocked) {
                              removeBlockedDate(iso);
                            } else {
                              setBlockedDates((prev) => [...prev, iso].sort());
                            }
                          }}
                          className={`w-full aspect-square rounded-xl text-sm font-bold transition-all flex items-center justify-center ${
                            blocked
                              ? "bg-red-950/70 border border-red-900/60 text-red-400 shadow-lg"
                              : isPast
                                ? "text-zinc-800 cursor-not-allowed"
                                : "bg-zinc-950 border border-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    }

                    return (
                      <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4">
                        {/* Month nav */}
                        <div className="flex items-center justify-between mb-4">
                          <button
                            type="button"
                            onClick={() =>
                              setBlockedCalMonth(new Date(calYear, calMonth - 1, 1))
                            }
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <span className="text-white font-bold text-sm capitalize">
                            {MONTHS[calMonth]} {calYear}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setBlockedCalMonth(new Date(calYear, calMonth + 1, 1))
                            }
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                            <div
                              key={d}
                              className="text-center text-zinc-600 text-[10px] uppercase tracking-wider font-semibold"
                            >
                              {d}
                            </div>
                          ))}
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-7 gap-1">{cells}</div>

                        {/* Legend */}
                        <p className="text-zinc-600 text-[10px] mt-3 text-center">
                          Clique nos dias para bloquear/desbloquear
                        </p>
                      </div>
                    );
                  })()}

                  <div className="flex flex-wrap gap-2 mt-3">
                    {blockedDates.map((date) => (
                      <button
                        key={date}
                        type="button"
                        onClick={() => removeBlockedDate(date)}
                        className="px-3 py-2 rounded-lg border border-red-900/50 bg-red-950/50 text-red-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-red-900/30 transition-all"
                      >
                        {formatDateBr(date)}
                        <X size={12} />
                      </button>
                    ))}
                    {blockedDates.length === 0 && (
                      <p className="text-zinc-700 text-xs">Nenhuma data bloqueada</p>
                    )}
                  </div>
                </div>

                {/* Fechar Expediente de Hoje */}
                <button
                  type="button"
                  onClick={handleCloseToday}
                  className="w-full flex items-center justify-center gap-2 bg-red-950/50 border border-red-900/50 hover:bg-red-900/30 text-red-400 font-bold py-4 rounded-2xl transition-all"
                >
                  <XCircle size={16} />
                  Fechar Expediente de Hoje
                </button>

                <button
                  type="button"
                  onClick={saveHours}
                  disabled={savingHours}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-600 text-black font-bold py-4 rounded-2xl transition-all shadow-lg"
                >
                  {savingHours ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : hoursSaved ? (
                    <Check size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {savingHours ? "Salvando..." : hoursSaved ? "Salvo!" : "Salvar Horários"}
                </button>
                {hoursError && (
                  <p className="text-red-400 text-xs text-center mt-3">{hoursError}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingApt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setEditingApt(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-black border border-zinc-900 rounded-3xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-bold text-lg">Editar Agendamento</h2>
                <button
                  type="button"
                  onClick={() => setEditingApt(null)}
                  className="text-zinc-600 hover:text-white transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Client info */}
              <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4 mb-5">
                <div className="flex items-center gap-2 text-white font-semibold mb-1">
                  <User size={16} className="text-zinc-500" />
                  {editingApt.client_name}
                </div>
                <p className="text-zinc-500 text-xs">{editingApt.client_phone}</p>
              </div>

              {/* Services */}
              <div className="mb-5">
                <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-2">
                  Serviços
                </p>
                <div className="space-y-1.5">
                  {servicesList.map((svc) => {
                    const selected = editServices.includes(svc.name);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleEditService(svc.name)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                          selected
                            ? "bg-white border-white text-black font-bold"
                            : "bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span>{svc.name}</span>
                        <span className="text-xs">
                          R$ {svc.price.toFixed(2).replace(".", ",")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date */}
              <div className="mb-5">
                <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-2">
                  Data
                </p>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-zinc-700 text-sm transition-all"
                />
              </div>

              {/* Time */}
              <div className="mb-5">
                <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-2">
                  Horário
                </p>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-zinc-700 text-sm transition-all"
                />
              </div>

              {/* Payment */}
              <div className="mb-5">
                <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-2">
                  Pagamento
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {["pix", "dinheiro", "débito", "crédito"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setEditPayment(method)}
                      className={`px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                        editPayment === method
                          ? "bg-white border-white text-black"
                          : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-white"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price (auto) */}
              <div className="mb-6">
                <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-2">
                  Valor Total
                </p>
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl px-4 py-3.5 flex items-center gap-2">
                  <DollarSign size={16} className="text-zinc-600 flex-shrink-0" />
                  <span className="text-white font-bold text-lg">
                    R$ {computedEditPrice().toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <p className="text-zinc-600 text-[10px] mt-1.5 pl-1">
                  Calculado automaticamente com base nos serviços selecionados
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingApt(null)}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold py-4 rounded-2xl transition-all border border-zinc-800 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={savingEdit || editServices.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-600 text-black font-bold py-4 rounded-2xl transition-all shadow-lg text-sm"
                >
                  {savingEdit ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {savingEdit ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict Modal */}
      <AnimatePresence>
        {showConflictModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowConflictModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-black border border-zinc-900 rounded-3xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-400" />
                  <h2 className="text-white font-bold text-lg">Atenção!</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConflictModal(false)}
                  className="text-zinc-600 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-zinc-400 text-sm mb-4">
                {conflictAppointments.length} agendamento(s) futuro(s) está(ão) em dias que você desativou:
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto mb-5">
                {conflictAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-zinc-950/50 border border-zinc-900 rounded-xl p-3"
                  >
                    <p className="text-white font-semibold text-sm">{apt.client_name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {apt.appointment_date} às {apt.appointment_time}
                    </p>
                    <p className="text-zinc-600 text-[10px] mt-0.5">{apt.client_phone}</p>
                  </div>
                ))}
              </div>

              <p className="text-zinc-500 text-xs mb-5">
                Deseja notificá-los sobre a alteração via WhatsApp?
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (conflictResolve) conflictResolve(false);
                  }}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold py-4 rounded-2xl transition-all border border-zinc-800 text-sm"
                >
                  Ignorar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (conflictResolve) conflictResolve(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-2xl transition-all shadow-lg text-sm"
                >
                  <Send size={16} />
                  Notificar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close Today Modal */}
      <AnimatePresence>
        {showCloseTodayModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCloseTodayModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-black border border-zinc-900 rounded-3xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <XCircle size={18} className="text-red-400" />
                  <h2 className="text-white font-bold text-lg">Fechar Expediente de Hoje</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCloseTodayModal(false)}
                  className="text-zinc-600 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-zinc-400 text-sm mb-4">
                Os seguintes horários serão bloqueados hoje:
              </p>

              <div className="flex flex-wrap gap-2 mb-5">
                {closeTodaySlots.map((slot) => (
                  <span
                    key={slot}
                    className="px-3 py-1.5 rounded-lg bg-red-950/50 border border-red-900/50 text-red-400 text-xs font-semibold"
                  >
                    {slot}
                  </span>
                ))}
              </div>

              <p className="text-zinc-500 text-xs mb-5">
                Lembre-se de salvar os horários depois para aplicar as alterações.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCloseTodayModal(false)}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold py-4 rounded-2xl transition-all border border-zinc-800 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmCloseToday}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg text-sm"
                >
                  Bloquear
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppointmentList({
  appointments,
  searchDate,
  expandedDates,
  toggleDate,
  onEdit,
}: {
  appointments: Appointment[];
  searchDate: string;
  expandedDates: Set<string>;
  toggleDate: (date: string) => void;
  onEdit: (apt: Appointment) => void;
}) {
  const filteredAppointments = searchDate
    ? appointments.filter((apt) => apt.appointment_date === searchDate)
    : appointments;

  const grouped = groupByDate(filteredAppointments);
  const sortedDates = Object.keys(grouped).sort();

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Nenhum agendamento encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map((date) => {
        const dayStatus = getDayStatus(date);
        const dayApts = grouped[date];
        const isExpanded = expandedDates.has(date);
        const pendingCount = dayApts.filter(
          (a) => a.status === "Pendente" || !a.status
        ).length;

        return (
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black border border-zinc-900 rounded-3xl overflow-hidden shadow-xl"
          >
            <button
              type="button"
              onClick={() => toggleDate(date)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-950/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    dayStatus === "today"
                      ? "text-emerald-400 border-emerald-900/50 bg-emerald-950/30"
                      : dayStatus === "past"
                        ? "text-zinc-600 border-zinc-800 bg-zinc-950"
                        : "text-blue-400 border-blue-900/50 bg-blue-950/30"
                  }`}
                >
                  {dayStatus === "today"
                    ? "Hoje"
                    : dayStatus === "past"
                      ? "Passado"
                      : "Futuro"}
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm capitalize">
                    {formatDate(date)}
                  </p>
                  <p className="text-zinc-500 text-xs">
                    {dayApts.length} agendamento{dayApts.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {pendingCount > 0 && (
                  <span className="text-[10px] font-bold bg-yellow-950/50 text-yellow-400 border border-yellow-900/50 px-2.5 py-1 rounded-full">
                    {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp size={18} className="text-zinc-600" />
                ) : (
                  <ChevronDown size={18} className="text-zinc-600" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-4 space-y-3">
                    {dayApts.map((apt) => {
                      const currentStatus = apt.status || "Pendente";
                      const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG["Pendente"];

                      return (
                        <div
                          key={apt.id}
                          className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-bold text-base">
                                  {apt.client_name}
                                </span>
                                <span
                                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.color}`}
                                >
                                  {statusCfg.icon}
                                  {statusCfg.label}
                                </span>
                              </div>
                              <p className="text-zinc-400 text-sm">
                                {apt.appointment_time} — {apt.services.join(", ")}
                              </p>
                              <p className="text-zinc-600 text-xs mt-0.5">
                                {apt.client_phone} ·{" "}
                                {apt.payment_method.charAt(0).toUpperCase() +
                                  apt.payment_method.slice(1)}{" "}
                                · R$ {Number(apt.total_price).toFixed(2).replace(".", ",")}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onEdit(apt)}
                                className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
                                title="Editar"
                              >
                                <Edit3 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
