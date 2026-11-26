import type { Enums } from "@/lib/database.types";
import { hojeSP } from "@/lib/datas";
import { texto } from "@/lib/formato";

export type DadosData = {
  data_status: Enums<"data_status">;
  data?: string;
  horario_cerimonia?: string;
  horario_festa?: string;
};

/**
 * Lê os campos de <CamposData> (onboarding e configurações).
 * Recusa data (ou mês) no passado. `atual` é o que já está salvo: um casamento que já aconteceu
 * pode continuar com a própria data ao salvar outros campos. O banco aplica a mesma regra.
 */
export function lerData(
  fd: FormData,
  atual?: { data_status: Enums<"data_status">; data: string | null },
): DadosData | { erro: string } {
  const hoje = hojeSP();
  const status = texto(fd, "data_status");
  if (status === "definida") {
    const data = texto(fd, "data");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Escolha a data do casamento." };
    const mantida = atual?.data_status === "definida" && atual.data === data;
    if (data < hoje && !mantida) return { erro: "A data do casamento não pode estar no passado." };
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
    const mantido = atual?.data_status === "mes_estimado" && atual.data?.slice(0, 7) === mes;
    if (mes < hoje.slice(0, 7) && !mantido) return { erro: "O mês do casamento não pode estar no passado." };
    return { data_status: status, data: `${mes}-01` };
  }
  return { data_status: "indefinida" };
}
