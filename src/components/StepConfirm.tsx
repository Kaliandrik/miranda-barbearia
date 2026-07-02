import { CheckCircle, Calendar, Clock, CreditCard, DollarSign } from "lucide-react";
import { type Service } from "../lib/supabase";
interface StepConfirmProps {
  selectedServices: Service[];
  date: string;
  time: string;
  totalPrice: number;
  paymentMethod: string;
  onReset: () => void;
}

export default function StepConfirm({
  selectedServices,
  date,
  time,
  totalPrice,
  paymentMethod,
  onReset,
}: StepConfirmProps) {
  
  function formatDateBr(dateStr: string) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-4 space-y-6">
      <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center relative">
        <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" style={{ animationDuration: "2.5s" }} />
        <CheckCircle className="text-green-400 relative z-10" size={32} />
      </div>

      <div>
        <h3 className="text-white text-xl font-extrabold tracking-tight">Agendamento Confirmado!</h3>
        <p className="text-zinc-500 text-xs mt-1">Seu horário já foi garantido na agenda do Miranda.</p>
      </div>

      {/* Card do Recibo */}
      <div className="w-full bg-zinc-800/30 border border-zinc-800/80 rounded-xl p-4 text-left space-y-3">
        <div className="border-b border-zinc-800/60 pb-2">
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">Serviço(s)</p>
          <p className="text-white text-sm font-semibold mt-0.5">
            {selectedServices.map((s) => s.name).join(" + ")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 border-b border-zinc-800/60 pb-2">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
              <Calendar size={10} /> Data
            </p>
            <p className="text-zinc-200 text-xs font-medium mt-0.5">{formatDateBr(date)}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
              <Clock size={10} /> Horário
            </p>
            <p className="text-zinc-200 text-xs font-medium mt-0.5">{time}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
              <CreditCard size={10} /> Pagamento
            </p>
            <p className="text-zinc-200 text-xs font-medium mt-0.5 uppercase">{paymentMethod}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
              <DollarSign size={10} /> Valor Total
            </p>
            <p className="text-green-400 text-sm font-extrabold mt-0.5">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalPrice)}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs font-medium underline"
      >
        Realizar um novo agendamento
      </button>
    </div>
  );
}