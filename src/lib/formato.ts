const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlSemCentavos = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** Dinheiro é sempre guardado em centavos inteiros. */
export function formatarBRL(centavos: number, { semCentavos = false } = {}): string {
  return (semCentavos ? brlSemCentavos : brl).format(centavos / 100);
}

/**
 * Converte o que a pessoa digitou em centavos.
 * Aceita "45000", "45.000", "45.000,50", "R$ 45.000,50", "45000.5".
 * Retorna null se vazio, NaN se inválido.
 */
export function parseBRL(texto: string | null | undefined): number | null {
  const limpo = (texto ?? "").replace(/[R$\s]/g, "");
  if (!limpo) return null;

  let normalizado: string;
  if (limpo.includes(",")) {
    // formato brasileiro: ponto = milhar, vírgula = decimal
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // "45.000" = quarenta e cinco mil
    normalizado = limpo.replace(/\./g, "");
  } else {
    normalizado = limpo;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return Number.NaN;
  return Math.round(Number(normalizado) * 100);
}

/** Inteiro positivo opcional vindo de formulário. */
export function parseInteiro(texto: FormDataEntryValue | null): number | null {
  const s = String(texto ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : Number.NaN;
}

export function texto(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim();
}

export function pluralizar(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
