import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Atenção: Variáveis de ambiente do Supabase não encontradas. Verifique o seu arquivo .env");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

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
}

export interface AppointmentInput {
  clientName: string;
  clientPhone: string;
  professionalId: string;
  services: string[];
  date: string;
  time: string;
  paymentMethod: string;
  totalPrice: number;
}

// Funções para buscar e salvar dados do Miranda
export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .order('name');
  
  if (error) throw error;
  return data || [];
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