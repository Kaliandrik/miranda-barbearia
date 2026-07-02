import { useEffect, useState } from "react";
import { Scissors, Clock, Check } from "lucide-react";
import { getServices, type Service } from "../lib/supabase";
interface StepServicesProps {
  selected: Service[];
  onToggle: (service: Service) => void;
}

export default function StepServices({ selected, onToggle }: StepServicesProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getServices()
      .then((data) => {
        setServices(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar serviços:", err);
        setLoading(false);
      });
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-xs">Carregando serviços disponíveis...</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
        <p className="text-zinc-500 text-sm">Nenhum serviço ativo encontrado no banco.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
      <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-2">
        Selecione os serviços desejados:
      </p>

      {services.map((service) => {
        const isSelected = selected.some((s) => s.id === service.id);

        return (
          <div
            key={service.id}
            onClick={() => onToggle(service)}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none group ${
              isSelected
                ? "bg-blue-600/10 border-blue-500/40 shadow-[0_0_15px_rgba(37,99,235,0.05)]"
                : "bg-zinc-800/30 border-zinc-800 hover:border-zinc-700/60 hover:bg-zinc-800/50"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                  isSelected
                    ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                    : "bg-zinc-800 border-zinc-700/50 text-zinc-400 group-hover:text-zinc-300"
                }`}
              >
                {isSelected ? <Check size={18} /> : <Scissors size={18} />}
              </div>

              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate group-hover:text-blue-400 transition-colors">
                  {service.name}
                </p>
                <span className="text-zinc-500 text-xs flex items-center gap-1 mt-0.5">
                  <Clock size={12} />
                  {service.duration_minutes} min
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-white font-bold text-sm">
                {formatCurrency(Number(service.price))}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}