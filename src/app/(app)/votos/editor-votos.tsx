"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Aviso, Botao, cx } from "@/components/ui";
import { salvarVotos } from "./actions";

const ESPERA_MS = 1200;

type Estado = "salvo" | "pendente" | "salvando" | "erro";

function contarPalavras(texto: string) {
  return texto.trim() ? texto.trim().split(/\s+/).length : 0;
}

function tempoDeLeitura(palavras: number, porMinuto: number) {
  const segundos = Math.round((palavras / porMinuto) * 60);
  if (segundos < 60) return `${segundos} s`;
  const min = Math.floor(segundos / 60);
  const s = segundos % 60;
  return s ? `${min} min ${s} s` : `${min} min`;
}

export function EditorVotos({
  inicial,
  meuNome,
  limite,
  porMinuto,
}: {
  inicial: { texto: string; pronto: boolean };
  meuNome: string;
  limite: number;
  porMinuto: number;
}) {
  const [texto, setTexto] = useState(inicial.texto);
  const [pronto, setPronto] = useState(inicial.pronto);
  const [estado, setEstado] = useState<Estado>("salvo");
  const [erro, setErro] = useState<string | null>(null);
  const [marcando, iniciar] = useTransition();

  // Último texto confirmado pelo servidor e número da última requisição (ignora respostas antigas).
  const salvoRef = useRef(inicial.texto);
  const seqRef = useRef(0);
  const textoRef = useRef(inicial.texto);

  const salvar = useCallback(async (valor: string) => {
    if (valor === salvoRef.current) {
      setEstado("salvo");
      return;
    }
    const seq = ++seqRef.current;
    setEstado("salvando");
    const r = await salvarVotos(valor);
    if (seq !== seqRef.current) return; // chegou uma digitação mais nova
    if (r.ok) {
      salvoRef.current = valor;
      setPronto(r.pronto); // apagar tudo desmarca "prontos" no banco
      setErro(null);
      setEstado(valor === textoRef.current ? "salvo" : "pendente");
    } else {
      setErro(r.erro);
      setEstado("erro");
    }
  }, []);

  // Salvamento automático: espera a pessoa parar de digitar.
  useEffect(() => {
    if (texto === salvoRef.current) return;
    const id = setTimeout(() => void salvar(texto), ESPERA_MS);
    return () => clearTimeout(id);
  }, [texto, salvar]);

  // Trocou de aba ou minimizou: salva na hora. Fechando com algo por salvar: avisa.
  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState === "hidden" && textoRef.current !== salvoRef.current) {
        void salvar(textoRef.current);
      }
    };
    const antesDeSair = (e: BeforeUnloadEvent) => {
      if (textoRef.current !== salvoRef.current) e.preventDefault();
    };
    document.addEventListener("visibilitychange", aoEsconder);
    window.addEventListener("beforeunload", antesDeSair);
    return () => {
      document.removeEventListener("visibilitychange", aoEsconder);
      window.removeEventListener("beforeunload", antesDeSair);
    };
  }, [salvar]);

  function alternarPronto() {
    const novo = !pronto;
    iniciar(async () => {
      seqRef.current++; // invalida um autosave em andamento: este envio já leva o texto atual
      const valor = textoRef.current;
      const r = await salvarVotos(valor, novo);
      if (r.ok) {
        salvoRef.current = valor;
        setPronto(r.pronto);
        setErro(null);
        setEstado(valor === textoRef.current ? "salvo" : "pendente");
      } else {
        setErro(r.erro);
      }
    });
  }

  const palavras = contarPalavras(texto);
  const vazio = palavras === 0;

  return (
    <>
      <div className="flex flex-col gap-3 print:hidden">
        <textarea
          value={texto}
          onChange={(e) => {
            textoRef.current = e.target.value;
            setTexto(e.target.value);
            setEstado(e.target.value === salvoRef.current ? "salvo" : "pendente");
          }}
          maxLength={limite}
          rows={16}
          aria-label="Seus votos"
          placeholder="Comece por uma lembrança: o dia em que vocês se conheceram, uma viagem, uma frase que ficou…"
          className="w-full resize-y rounded-2xl border border-linha bg-cartao px-5 py-4 font-serif text-xl leading-relaxed placeholder:font-sans placeholder:text-base placeholder:text-tinta-suave/70 focus:border-rose focus:outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-tinta-suave">
          <p>
            {palavras} {palavras === 1 ? "palavra" : "palavras"}
            {!vazio && <> · ≈ {tempoDeLeitura(palavras, porMinuto)} lendo em voz alta</>}
          </p>
          <p role="status" aria-live="polite" className={cx(estado === "erro" && "text-alerta")}>
            {estado === "salvo" && !vazio && "Salvo"}
            {estado === "pendente" && "Alterações não salvas…"}
            {estado === "salvando" && "Salvando…"}
            {estado === "erro" && "Não salvou"}
          </p>
        </div>

        {erro && <Aviso>{erro}</Aviso>}

        <div className="flex flex-wrap items-center gap-2">
          <Botao
            type="button"
            variante={pronto ? "secundario" : "primario"}
            onClick={alternarPronto}
            disabled={marcando || (vazio && !pronto)}
            aria-busy={marcando}
          >
            {pronto ? "Voltar a editar como rascunho" : "Marcar como prontos"}
          </Botao>
          <Botao type="button" variante="fantasma" onClick={() => window.print()} disabled={vazio}>
            Imprimir
          </Botao>
          {pronto && <span className="text-sm text-salvia">Prontos ✓ · seu amor vê só isso, nunca o texto.</span>}
        </div>
      </div>

      {/* Versão para levar no dia: só aparece na impressão. */}
      <article className="hidden print:block">
        <p className="mb-8 text-sm uppercase tracking-[0.2em]">Votos de {meuNome}</p>
        <div className="whitespace-pre-wrap font-serif text-2xl leading-relaxed">{texto}</div>
      </article>
    </>
  );
}
