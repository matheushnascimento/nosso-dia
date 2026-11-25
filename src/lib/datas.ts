/**
 * Datas do casamento são "datas de calendário" (YYYY-MM-DD), sem hora.
 * Tudo é calculado em America/Sao_Paulo para a contagem não "pular" à noite.
 */

export const FUSO = "America/Sao_Paulo";

/** Hoje em São Paulo, como YYYY-MM-DD. */
export function hojeSP(agora: Date = new Date()): string {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

function paraUTC(iso: string): number {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

/** Dias de `de` até `ate` (positivo se `ate` está no futuro). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((paraUTC(ate) - paraUTC(de)) / 86_400_000);
}

const fmtLonga = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const fmtCurta = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "short" });
const fmtCurtaAno = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const fmtMes = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });

/** "sábado, 3 de abril de 2027" */
export function dataPorExtenso(iso: string): string {
  return fmtLonga.format(paraUTC(iso));
}

/** "abril de 2027" */
export function mesPorExtenso(iso: string): string {
  return fmtMes.format(paraUTC(iso));
}

/** "3 de abr." (ou com ano, se não for o ano corrente) */
export function dataCurta(iso: string, hoje: string): string {
  const mesmoAno = iso.slice(0, 4) === hoje.slice(0, 4);
  return (mesmoAno ? fmtCurta : fmtCurtaAno).format(paraUTC(iso)).replace(/\.$/, "");
}

/** "16:00:00" -> "16h" / "16:30:00" -> "16h30" */
export function horario(hhmmss: string | null): string | null {
  if (!hhmmss) return null;
  const [h, m] = hhmmss.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}
