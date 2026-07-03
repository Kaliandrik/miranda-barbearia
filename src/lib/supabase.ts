import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Atenção: Variáveis de ambiente do Supabase não encontradas. Verifique o seu arquivo .env");
}

const globalThisAny = globalThis as any;
const _supabase =
  globalThisAny.__supabase ||
  createClient(supabaseUrl || '', supabaseAnonKey || '');
if (typeof globalThis !== 'undefined') globalThisAny.__supabase = _supabase;
export const supabase = _supabase;

// Tipagens para o TypeScript nos ajudar no desenvolvimento
export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  active: boolean;
}

export interface Professional {
  id: string;
  name: string;
  avatar_url?: string;
  work_days: Record<string, boolean>;
  work_start: string;
  work_end: string;
  blocked_times?: string[];
  blocked_slots?: Record<string, string[]>;
  blocked_dates?: string[];
}

export interface AppointmentInput {
  clientName: string;
  clientPhone: string;
  professionalId: string | null;
  services: string[];
  date: string;
  time: string;
  paymentMethod: string;
  totalPrice: number;
}

export interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  professional_id: string | null;
  services: string[];
  appointment_date: string;
  appointment_time: string;
  payment_method: string;
  total_price: number;
  status: string | null;
  created_at: string;
  reminders_sent?: string[];
}

// Funções para buscar e salvar dados do Miranda
export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .order('name');
  
  if (error) throw error;
  const seen = new Set<string>();
  return ((data as Service[]) || []).filter((svc) => {
    if (seen.has(svc.name)) return false;
    seen.add(svc.name);
    return true;
  });
}

export async function getProfessionals(): Promise<Professional[]> {
  const { data, error } = await supabase
    .from('professionals')
    .select('*');
  
  if (error) throw error;
  return data || [];
}

export async function createAppointment(appointmentData: AppointmentInput) {
  // Define o ID do profissional de forma segura, aceitando nulo ou UUID válido
  const validProfessionalId = 
    appointmentData.professionalId && 
    typeof appointmentData.professionalId === 'string' && 
    !appointmentData.professionalId.includes("ID_DO_MIRANDA")
      ? appointmentData.professionalId
      : null;

  const { data, error } = await supabase
    .from('appointments')
    .insert([{
      client_name: appointmentData.clientName,
      client_phone: appointmentData.clientPhone,
      professional_id: validProfessionalId,
      services: appointmentData.services,
      appointment_date: appointmentData.date,
      appointment_time: appointmentData.time,
      payment_method: appointmentData.paymentMethod,
      total_price: Number(appointmentData.totalPrice)
    }])
    .select()
    .single();

  if (error) {
    console.error("Erro detalhado do Supabase:", error);
    throw error;
  }
  return data;
}

export async function getAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("appointment_date", date)
    .order("appointment_time", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateAppointment(
  id: string,
  updates: {
    services?: string[];
    appointment_date?: string;
    appointment_time?: string;
    payment_method?: string;
    total_price?: number;
    status?: string;
  }
) {
  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfessional(
  id: string,
  updates: {
    work_days?: Record<string, boolean>;
    work_start?: string;
    work_end?: string;
    blocked_times?: string[];
    blocked_slots?: Record<string, string[]>;
    blocked_dates?: string[];
  }
) {
  const { data, error } = await supabase
    .from("professionals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAppointmentsByPhone(phone: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("client_phone", phone)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getActiveServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error) throw error;
  const seen = new Set<string>();
  return ((data as Service[]) || []).filter((svc) => {
    if (seen.has(svc.name)) return false;
    seen.add(svc.name);
    return true;
  });
}