import type { Enums } from "@/lib/database.types";
import { texto } from "@/lib/formato";

export type DadosData = {
  data_status: Enums<"data_status">;
  data?: string;
  horario_cerimonia?: string;
  horario_festa?: string;
};

/** Lê os campos de <CamposData> (onboarding e configurações). */
export function lerData(fd: FormData): DadosData | { erro: string } {
  const status = texto(fd, "data_status");
  if (status === "definida") {
    const data = texto(fd, "data");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Escolha a data do casamento." };
    return {
      data_status: status,
      data,
      horario_cerimonia: texto(fd, "horario_cerimonia") || undefined,
      horario_festa: texto(fd, "horario_festa") || undefined,
    };
  }
  if (status === "mes_estimado") {
    const mes = texto(fd, "mes"); // YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(mes)) return { erro: "Escolha o mês do casamento." };
    return { data_status: status, data: `${mes}-01` };
  }
  return { data_status: "indefinida" };
}
