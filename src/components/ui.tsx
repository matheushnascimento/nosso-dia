import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Componentes visuais básicos, sem estado. */

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const botaoBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
const variantes = {
  primario: "bg-tinta text-papel hover:bg-tinta/85",
  secundario: "border border-linha bg-cartao text-tinta hover:border-tinta/40",
  fantasma: "text-tinta-suave hover:text-tinta hover:bg-linha/40",
  perigo: "text-alerta hover:bg-alerta-claro",
};

export function Botao({
  variante = "primario",
  className,
  ...props
}: ComponentProps<"button"> & { variante?: keyof typeof variantes }) {
  return <button className={cx(botaoBase, variantes[variante], className)} {...props} />;
}

export function BotaoLink({
  variante = "primario",
  className,
  ...props
}: ComponentProps<typeof Link> & { variante?: keyof typeof variantes }) {
  return <Link className={cx(botaoBase, variantes[variante], className)} {...props} />;
}

export function Cartao({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cx("rounded-2xl border border-linha bg-cartao p-5 sm:p-6", className)}
      {...props}
    />
  );
}

export function Titulo({ className, ...props }: ComponentProps<"h1">) {
  return <h1 className={cx("font-serif text-4xl font-medium leading-tight", className)} {...props} />;
}

export function Subtitulo({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cx("font-serif text-2xl font-medium", className)} {...props} />;
}

export function Campo({
  rotulo,
  dica,
  children,
  className,
}: {
  rotulo: string;
  dica?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("flex flex-col gap-1.5 text-sm", className)}>
      <span className="font-medium">{rotulo}</span>
      {children}
      {dica && <span className="text-xs text-tinta-suave">{dica}</span>}
    </label>
  );
}

export const classeInput =
  "w-full rounded-xl border border-linha bg-cartao px-3.5 py-2.5 text-base text-tinta placeholder:text-tinta-suave/70 focus:border-rose focus:outline-none sm:text-sm";

export function Entrada({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(classeInput, className)} {...props} />;
}

export function Selecao({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(classeInput, "pr-8", className)} {...props} />;
}

export function AreaTexto({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(classeInput, "min-h-20", className)} {...props} />;
}

export function Aviso({
  tipo = "erro",
  children,
}: {
  tipo?: "erro" | "ok" | "info";
  children: ReactNode;
}) {
  const estilos = {
    erro: "bg-alerta-claro text-alerta",
    ok: "bg-salvia-claro text-salvia",
    info: "bg-rose-claro text-tinta",
  };
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={cx("rounded-xl px-4 py-3 text-sm", estilos[tipo])}>
      {children}
    </p>
  );
}

export function Selo({
  tom = "neutro",
  children,
  title,
}: {
  tom?: "neutro" | "rose" | "salvia" | "alerta";
  children: ReactNode;
  title?: string;
}) {
  const estilos = {
    neutro: "bg-linha/60 text-tinta-suave",
    rose: "bg-rose-claro text-rose",
    salvia: "bg-salvia-claro text-salvia",
    alerta: "bg-alerta-claro text-alerta",
  };
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs", estilos[tom])}>
      {children}
    </span>
  );
}

export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-2xl bg-linha/50", className)} />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("font-serif text-2xl font-medium tracking-tight", className)}>
      Nosso <span className="italic text-rose">Dia</span>
    </span>
  );
}

export { cx };
