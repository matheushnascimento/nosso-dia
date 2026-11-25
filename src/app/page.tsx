import { BotaoLink, Logo } from "@/components/ui";

// Página estática: não lê sessão. Usuário logado é redirecionado para /painel pelo proxy.
export default function Inicio() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-6">
        <Logo />
        <BotaoLink href="/entrar" variante="fantasma">
          Entrar
        </BotaoLink>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-10 py-12">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-rose">Planejamento de casamento</p>
          <h1 className="font-serif text-5xl font-medium leading-[1.05] sm:text-6xl">
            Do “sim” ao grande dia, <em className="text-rose">sem planilha</em>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-tinta-suave">
            Um checklist que se ajusta sozinho à data de vocês, feito para os dois planejarem juntos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <BotaoLink href="/cadastrar">Começar grátis</BotaoLink>
            <BotaoLink href="/entrar" variante="secundario">
              Já tenho conta
            </BotaoLink>
          </div>
        </div>

        <ul className="grid gap-4 sm:grid-cols-3">
          {[
            ["Prazos que se ajustam", "Mudou a data? Todas as tarefas se reorganizam na hora."],
            ["Para os dois", "Convide seu amor e dividam as tarefas com responsáveis."],
            ["Sem susto", "Começando tarde? A gente mostra o que fazer primeiro, sem culpa."],
          ].map(([titulo, texto]) => (
            <li key={titulo} className="rounded-2xl border border-linha bg-cartao p-5">
              <p className="font-serif text-xl">{titulo}</p>
              <p className="mt-1 text-sm text-tinta-suave">{texto}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="py-6 text-xs text-tinta-suave">Nosso Dia</footer>
    </div>
  );
}
