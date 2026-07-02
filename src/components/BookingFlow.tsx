import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Calendar, Phone, ArrowRight, CheckCircle2 } from "lucide-react";
import { createAppointment, supabase, type Service } from "../lib/supabase";
import StepServices from "./StepServices";
import StepDateTime from "./StepDateTime";
import StepConfirm from "./StepConfirm";

export default function BookingFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Estados de dados unificados
  const [clientPhone, setClientPhone] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [isNewClient, setIsNewClient] = useState<boolean | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState<boolean>(false);

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const totalPrice = selectedServices.reduce((acc, svc) => acc + Number(svc.price), 0);

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value);
    setClientPhone(formatted);
    if (isNewClient !== null) {
      setIsNewClient(null);
      setClientName("");
    }
  }

  async function handleVerifyClient() {
    const cleanPhone = clientPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return;

    setIsCheckingPhone(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("client_name")
        .eq("client_phone", clientPhone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data && data.client_name) {
        setClientName(data.client_name);
        setIsNewClient(false);
      } else {
        setIsNewClient(true);
        setClientName("");
      }
    } catch (err) {
      console.error("Erro ao buscar cliente:", err);
      setIsNewClient(true);
    } finally {
      setIsCheckingPhone(false);
    }
  }

  function handleToggleService(svc: Service) {
    setSelectedServices((prev) =>
      prev.some((x) => x.id === svc.id)
        ? prev.filter((x) => x.id !== svc.id)
        : [...prev, svc]
    );
  }

  function handleResetFlow() {
    setSelectedServices([]);
    setSelectedDate("");
    setSelectedTime("");
    setClientName("");
    setClientPhone("");
    setIsNewClient(null);
    setPaymentMethod("pix");
    setStep(1);
  }

  async function handleFinalizeBooking() {
    if (!clientName.trim() || !clientPhone.trim() || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      const { data: prof } = await supabase
        .from("professionals")
        .select("id")
        .eq("name", "Miranda")
        .maybeSingle();

      const professionalId = prof?.id || null;

      await createAppointment({
        clientName,
        clientPhone,
        professionalId,
        services: selectedServices.map(s => s.name),
        date: selectedDate,
        time: selectedTime,
        paymentMethod,
        totalPrice
      });

      try {
        await supabase.functions.invoke("disparar-whatsapp", {
          body: {
            clientPhone,
            professionalName: "Miranda",
            services: selectedServices.map(s => s.name),
            date: selectedDate,
            time: selectedTime,
            paymentMethod,
            total: totalPrice
          }
        });
      } catch (innerErr) {
        console.error("Falha ao comunicar com a Edge Function:", innerErr);
      }

      setStep(3);
    } catch (err) {
      console.error("Erro crítico no fluxo de agendamento:", err);
      alert("Erro ao processar seu agendamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const cleanPhoneLength = clientPhone.replace(/\D/g, "").length;
  const isStep1Valid = isNewClient === false || (isNewClient === true && clientName.trim().length > 2);

  return (
    <div className="w-full max-w-md mx-auto bg-black border border-zinc-900 rounded-3xl shadow-2xl overflow-hidden relative font-sans flex flex-col justify-between min-h-[550px]">
      
      {/* BANNER HERO SUPERIOR (FOTO DA ENTRADA) */}
      <div className="relative w-full h-36 border-b border-zinc-900 overflow-hidden bg-zinc-950 flex-shrink-0">
        {/* Camada de Gradiente para fundir a foto com o fundo preto do app (invertido para o topo) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 z-10 pointer-events-none" />
        <img 
          src="/img/barbeariaMD.webp" 
          alt="Entrada MD Barbearia" 
          className="w-full h-full object-cover opacity-50 select-none pointer-events-none filter brightness-90 contrast-105"
        />
      </div>

      <div>
        {/* Cabeçalho Minimalista */}
        <div className="relative z-10 flex justify-between items-center px-6 pt-6 pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-2 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-white transition-all"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-white font-bold text-base tracking-tight">MD Barbearia</h2>
              <p className="text-[11px] text-zinc-500">Agendamento Online</p>
            </div>
          </div>
          <span className="text-[10px] bg-zinc-950 text-zinc-400 font-bold px-3 py-1.5 rounded-full border border-zinc-900 uppercase tracking-widest">
            {step === 3 ? "Fim" : `${step} / 2`}
          </span>
        </div>

        {/* Corpo do Fluxo */}
        <div className="p-6 pt-10 relative z-10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 text-center"
              >
                {/* Espaço da Logo MD Barbearia */}
                <div className="mx-auto w-24 h-24 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center p-2 shadow-xl overflow-hidden mb-4">
                  <img 
                    src="/img/logobarbearia.png" 
                    alt="MD Barbearia Logo" 
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.opacity = '0';
                    }}
                  />
                </div>

                {/* Informações da Localidade da MD Barbearia */}
                <div className="space-y-2">
                  <h3 className="text-white font-bold text-xl tracking-wide uppercase">MD BARBEARIA</h3>
                  <p className="text-zinc-400 text-xs px-6 leading-relaxed flex flex-col items-center justify-center gap-1">
                    <span className="text-zinc-500 font-medium">
                      Rua Vereador Raimundo Lima, 248 - lado par, Centro, Tianguá - CE, 62320-037
                    </span>
                  </p>

                  {/* Botões de Redes Sociais */}
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <a 
                      href="https://instagram.com" 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-bold text-[11px] px-4 py-2 rounded-full transition-all hover:opacity-90"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                      Instagram
                    </a>
                    <a 
                      href="https://wa.me/5588999999999" 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-1.5 bg-emerald-600 text-white font-bold text-[11px] px-4 py-2 rounded-full transition-all hover:opacity-90"
                    >
                      <Phone size={12} /> WhatsApp
                    </a>
                  </div>
                </div>

                <div className="w-full h-[1px] bg-zinc-900 my-2" />

                {/* Campo do WhatsApp */}
                <div className="space-y-4 text-left">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center text-zinc-600">
                      <Phone size={16} />
                    </span>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={clientPhone}
                      onChange={handlePhoneChange}
                      disabled={isCheckingPhone}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl pl-11 pr-4 py-4 text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-700 text-base font-medium tracking-wide transition-all shadow-inner text-center"
                    />
                  </div>

                  {/* Botão de Verificação Primário */}
                  {isNewClient === null && cleanPhoneLength >= 10 && (
                    <button
                      type="button"
                      onClick={handleVerifyClient}
                      disabled={isCheckingPhone}
                      className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.99]"
                    >
                      {isCheckingPhone ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          Verificar Número <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  )}

                  {/* Feedback Dinâmico */}
                  <AnimatePresence>
                    {isNewClient === false && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex items-center gap-3"
                      >
                        <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="text-zinc-500 text-xs">Cliente reconhecido</p>
                          <p className="text-white font-semibold">{clientName}</p>
                        </div>
                      </motion.div>
                    )}

                    {isNewClient === true && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2 pt-2"
                      >
                        <label className="text-zinc-500 text-xs uppercase tracking-wider font-semibold pl-1">
                          É sua primeira vez aqui? Nos diga seu nome:
                        </label>
                        <input
                          type="text"
                          placeholder="Digite seu nome completo"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl px-4 py-4 text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-700 text-sm font-medium transition-all"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Botão para Avançar de Etapa */}
                {isStep1Valid && (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-zinc-900 to-zinc-800 hover:from-zinc-800 hover:to-zinc-700 text-white font-bold py-4 rounded-2xl transition-all border border-zinc-800 shadow-md"
                  >
                    Avançar para Serviços <ArrowRight size={16} />
                  </button>
                )}
              </motion.div>
            )}

            {/* Passo 2 */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <StepServices selected={selectedServices} onToggle={handleToggleService} />

                <StepDateTime
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  clientName={clientName}
                  clientPhone={clientPhone}
                  selectedServicesCount={selectedServices.length}
                  onSelectDate={setSelectedDate}
                  onSelectTime={setSelectedTime}
                  onChangeName={setClientName}
                  onChangePhone={setClientPhone}
                />

                {selectedDate && selectedTime && clientName.trim() && clientPhone.trim() && selectedServices.length > 0 && (
                  <div className="space-y-3 pt-1">
                    <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold pl-1">Forma de Pagamento</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "pix", label: "Pix" },
                        { id: "dinheiro", label: "Dinheiro" },
                        { id: "débito", label: "Débito" },
                        { id: "crédito", label: "Crédito" }
                      ].map((method) => {
                        const isSelected = paymentMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setPaymentMethod(method.id)}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                              isSelected
                                ? "bg-white border-white text-black font-extrabold shadow-lg"
                                : "bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-white"
                            }`}
                          >
                            <span className={`flex-shrink-0 ${isSelected ? "text-black" : "text-zinc-500"}`}>
                              {method.id === "pix" && (
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                  <path d="M12 .33a1.12 1.12 0 0 0-.79.33l-3 3a1.13 1.13 0 0 0 0 1.58l3 3a1.15 1.15 0 0 0 1.58 0l3-3a1.13 1.13 0 0 0 0-1.58l-3-3A1.12 1.12 0 0 0 12 .33zm-4.59 7.5a1.12 1.12 0 0 0-.79.33l-6 6a1.13 1.13 0 0 0 0 1.58l6 6a1.15 1.15 0 0 0 1.58 0l6-6a1.13 1.13 0 0 0 0-1.58l-6-6a1.12 1.12 0 0 0-.79-.33zm9.18 0a1.12 1.12 0 0 0-.79.33l-6 6a1.13 1.13 0 0 0 0 1.58l6 6a1.15 1.15 0 0 0 1.58 0l6-6a1.13 1.13 0 0 0 0-1.58l-6-6a1.12 1.12 0 0 0-.79-.33z"/>
                                </svg>
                              )}
                              {method.id === "dinheiro" && (
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                              )}
                              {method.id === "débito" && (
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                              )}
                              {method.id === "crédito" && (
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line><circle cx="6" cy="15" r="1"></circle></svg>
                              )}
                            </span>
                            <span>{method.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!clientName.trim() || !clientPhone.trim() || !selectedDate || !selectedTime || selectedServices.length === 0 || isSubmitting}
                  onClick={handleFinalizeBooking}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-950 disabled:border-zinc-900 disabled:text-zinc-700 text-black font-bold py-4 rounded-2xl transition-all disabled:cursor-not-allowed border border-transparent shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Confirmando...
                    </>
                  ) : (
                    <>
                      <Calendar size={16} /> Confirmar Agendamento
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* Passo 3 */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <StepConfirm
                  selectedServices={selectedServices}
                  date={selectedDate}
                  time={selectedTime}
                  totalPrice={totalPrice}
                  paymentMethod={paymentMethod}
                  onReset={handleResetFlow}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}