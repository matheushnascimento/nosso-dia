"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { CamposData } from "@/components/campos-data";
import { Aviso, Botao, Campo, Entrada, Selecao, Titulo, cx } from "@/components/ui";
import { ESTADO_INICIAL } from "@/lib/erros";
import { FAIXAS_CONVIDADOS, UFS } from "@/lib/rotulos";
import { criarEvento } from "./actions";

const PASSOS = [
  { titulo: "Como vocês se chamam?", texto: "É assim que o casamento vai aparecer para vocês dois." },
  { titulo: "Quando é o grande dia?", texto: "Os prazos de todas as tarefas são calculados a partir daqui." },
  { titulo: "Onde vai ser?", texto: "Só a cidade, por enquanto." },
  { titulo: "Qual o tamanho da festa?", texto: "Uma estimativa já ajuda. Dá para mudar depois." },
];

/**
 * Todos os campos ficam montados (só os passos inativos são escondidos),
 * então o formulário inteiro vai junto no envio final.
 */
export function FormOnboarding({ meuNome, hoje }: { meuNome: string; hoje: string }) {
  const [passo, setPasso] = useState(0);
  const [estado, acao, pendente] = useActionState(criarEvento, ESTADO_INICIAL);
  const [nomes, setNomes] = useState({ nome1: meuNome, nome2: "" });
  const convidadosRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const ultimo = passo === PASSOS.length - 1;

  function avancar() {
    // valida só os campos visíveis do passo atual
    const secao = formRef.current?.querySelector<HTMLElement>(`[data-passo="${passo}"]`);
    const invalido = secao?.querySelector<HTMLInputElement>(":invalid");
    if (invalido) {
      invalido.reportValidity();
      return;
    }
    setPasso((p) => Math.min(p + 1, PASSOS.length - 1));
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="flex flex-col gap-8"
      // Envio manual (sem `action`) para o React não limpar os campos se o servidor devolver erro.
      onSubmit={(e) => {
        e.preventDefault();
        if (!ultimo) return avancar();
        const fd = new FormData(e.currentTarget);
        startTransition(() => acao(fd));
      }}
    >
      <div>
        <ol className="mb-6 flex gap-1.5" aria-label={`Passo ${passo + 1} de ${PASSOS.length}`}>
          {PASSOS.map((_, i) => (
            <li key={i} className={cx("h-1 flex-1 rounded-full", i <= passo ? "bg-rose" : "bg-linha")} />
          ))}
        </ol>
        <Titulo>{PASSOS[passo].titulo}</Titulo>
        <p className="mt-2 text-tinta-suave">{PASSOS[passo].texto}</p>
      </div>

      {estado.erro && <Aviso>{estado.erro}</Aviso>}

      <section data-passo={0} hidden={passo !== 0} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Seu nome">
            <Entrada
              name="nome1"
              required
              value={nomes.nome1}
              onChange={(e) => setNomes((n) => ({ ...n, nome1: e.target.value }))}
            />
          </Campo>
          <Campo rotulo="Nome do seu amor">
            <Entrada
              name="nome2"
              required
              value={nomes.nome2}
              onChange={(e) => setNomes((n) => ({ ...n, nome2: e.target.value }))}
            />
          </Campo>
        </div>
        {nomes.nome1 && nomes.nome2 && (
          <p className="text-center font-serif text-3xl">
            {nomes.nome1} <span className="italic text-rose">&</span> {nomes.nome2}
          </p>
        )}
      </section>

      <section data-passo={1} hidden={passo !== 1}>
        <CamposData hoje={hoje} />
      </section>

      <section data-passo={2} hidden={passo !== 2} className="grid grid-cols-[1fr_6rem] gap-3">
        <Campo rotulo="Cidade">
          <Entrada name="cidade" autoComplete="address-level2" placeholder="Ex.: Holambra" />
        </Campo>
        <Campo rotulo="UF">
          <Selecao name="uf" defaultValue="">
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </Selecao>
        </Campo>
      </section>

      <section data-passo={3} hidden={passo !== 3} className="flex flex-col gap-5">
        <Campo rotulo="Convidados (estimativa)">
          <div className="mb-2 flex flex-wrap gap-2">
            {FAIXAS_CONVIDADOS.map((f) => (
              <button
                key={f.rotulo}
                type="button"
                onClick={() => {
                  if (convidadosRef.current) convidadosRef.current.value = String(f.valor);
                }}
                className="rounded-full border border-linha bg-cartao px-3 py-1 text-sm hover:border-tinta/40"
              >
                {f.rotulo}
              </button>
            ))}
          </div>
          <Entrada ref={convidadosRef} name="convidados" type="number" inputMode="numeric" min={1} max={5000} placeholder="Ex.: 120" />
        </Campo>
        <Campo rotulo="Orçamento total" dica="Opcional. Ex.: 45.000">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-tinta-suave">R$</span>
            <Entrada name="orcamento" inputMode="decimal" placeholder="Ainda não sabemos" className="pl-10" />
          </div>
        </Campo>
      </section>

      <div className="flex items-center justify-between gap-3">
        {passo > 0 ? (
          <Botao type="button" variante="fantasma" onClick={() => setPasso((p) => p - 1)}>
            Voltar
          </Botao>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {passo === 2 && (
            <Botao type="button" variante="fantasma" onClick={() => setPasso((p) => p + 1)}>
              Pular
            </Botao>
          )}
          {/* `key` diferente: sem ela o React reaproveita o mesmo <button> e só troca o type
              para "submit" no meio do clique em "Continuar", e o navegador envia o formulário
              ao terminar o clique, pulando o último passo. */}
          {ultimo ? (
            <Botao key="enviar" type="submit" disabled={pendente} aria-busy={pendente}>
              {pendente ? "Preparando tudo…" : "Criar nosso casamento"}
            </Botao>
          ) : (
            <Botao key="continuar" type="button" onClick={avancar}>
              Continuar
            </Botao>
          )}
        </div>
      </div>
    </form>
  );
}
