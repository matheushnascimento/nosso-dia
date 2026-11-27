"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { AreaTexto, Aviso, Botao, Cartao, Selecao, Selo, cx } from "@/components/ui";
import { CONFIRMACOES, FAIXAS, LADOS, type Lado } from "@/lib/convidados";
import {
  CAMPOS,
  LIMITE_BYTES,
  LIMITE_LINHAS,
  LISTA_CAMPOS,
  MODELO_CSV,
  adivinharMapeamento,
  decodificar,
  interpretar,
  lerCsv,
  pareceCabecalho,
  type Campo,
  type Existentes,
  type Mapeamento,
} from "@/lib/importar-convidados";
import { importarConvidados, type EstadoImportacao } from "./actions";

type Planilha = { texto: string; origem: string; linhas: string[][] };

function mapaVazio(): Mapeamento {
  return Object.fromEntries(LISTA_CAMPOS.map((c) => [c, null])) as Mapeamento;
}

export function Importar({ rotulosLado, existentes }: { rotulosLado: Record<Lado, string>; existentes: Existentes }) {
  const [planilha, setPlanilha] = useState<Planilha | null>(null);
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);
  const [colado, setColado] = useState("");
  const [cabecalho, setCabecalho] = useState(true);
  const [mapa, setMapa] = useState<Mapeamento>(mapaVazio);
  const [ladoPadrao, setLadoPadrao] = useState<Lado>("ambos");
  const [forcar, setForcar] = useState<Set<number>>(new Set());
  const [estado, acao] = useActionState(
    async (anterior: EstadoImportacao, fd: FormData) => {
      const r = await importarConvidados(anterior, fd);
      if (r.ok) setPlanilha(null);
      return r;
    },
    {},
  );

  function carregar(texto: string, origem: string) {
    setErroLeitura(null);
    const linhas = lerCsv(texto);
    if (!linhas.length) return setErroLeitura("A planilha está vazia.");
    const temCab = pareceCabecalho(linhas[0]);
    if (linhas.length - (temCab ? 1 : 0) > LIMITE_LINHAS) {
      return setErroLeitura(`Dá para importar até ${LIMITE_LINHAS} pessoas de uma vez. Divida a planilha.`);
    }
    setCabecalho(temCab);
    setMapa(temCab ? adivinharMapeamento(linhas[0]) : { ...mapaVazio(), nome: 0 });
    setForcar(new Set());
    setPlanilha({ texto, origem, linhas });
  }

  async function escolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    if (arquivo.size > LIMITE_BYTES) return setErroLeitura("O arquivo passou de 500 KB.");
    if (/\.(xlsx?|ods|numbers)$/i.test(arquivo.name)) {
      return setErroLeitura("Salve a planilha como CSV antes (no Excel: Arquivo › Salvar como › CSV), ou copie e cole as células aqui embaixo.");
    }
    carregar(decodificar(new Uint8Array(await arquivo.arrayBuffer())), arquivo.name);
  }

  function baixarModelo() {
    const url = URL.createObjectURL(new Blob([MODELO_CSV], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "modelo-convidados.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  const resultado = useMemo(
    () =>
      planilha && mapa.nome !== null
        ? interpretar(planilha.linhas, {
            mapa,
            temCabecalho: cabecalho,
            contexto: { nomesLado: { a: rotulosLado.a, b: rotulosLado.b }, ladoPadrao },
            existentes,
          })
        : [],
    [planilha, mapa, cabecalho, ladoPadrao, rotulosLado, existentes],
  );

  if (!planilha) {
    return (
      <div className="flex flex-col gap-4">
        {estado.ok && (
          <Aviso tipo="ok">
            {estado.ok}{" "}
            <Link href="/convidados" className="underline underline-offset-4">
              Ver a lista
            </Link>
          </Aviso>
        )}
        <Cartao className="flex flex-col gap-4">
          <div>
            <p className="font-serif text-xl">1. Escolha a planilha</p>
            <p className="mt-1 text-sm text-tinta-suave">
              Arquivo CSV (no Excel ou no Google Planilhas: salvar ou baixar como CSV). Os nomes das colunas não precisam
              ser iguais aos do modelo: na próxima etapa vocês conferem.{" "}
              <button type="button" onClick={baixarModelo} className="underline underline-offset-4 hover:text-tinta">
                Baixar o modelo
              </button>
            </p>
          </div>
          {erroLeitura && <Aviso>{erroLeitura}</Aviso>}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Arquivo</span>
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain"
              onChange={(e) => escolherArquivo(e.target.files?.[0])}
              className="text-sm file:mr-3 file:rounded-full file:border file:border-linha file:bg-cartao file:px-4 file:py-2 file:text-sm hover:file:border-tinta/40"
            />
          </label>
          <div className="flex flex-col gap-1.5 text-sm">
            <label htmlFor="colar" className="font-medium">
              Ou copie as células da planilha e cole aqui
            </label>
            <AreaTexto id="colar" rows={4} value={colado} onChange={(e) => setColado(e.target.value)} placeholder={"nome\tconvite\nJoão Silva\tFamília Silva"} />
            <div>
              <Botao type="button" variante="secundario" disabled={!colado.trim()} onClick={() => carregar(colado, "texto colado")}>
                Usar o texto colado
              </Botao>
            </div>
          </div>
        </Cartao>
      </div>
    );
  }

  const colunas = Math.max(...planilha.linhas.map((l) => l.length));
  const titulos = Array.from({ length: colunas }, (_, i) => (cabecalho ? planilha.linhas[0][i] || `Coluna ${i + 1}` : `Coluna ${i + 1}`));
  // primeiro valor preenchido da coluna, para ajudar a reconhecer
  const exemplo = (i: number) => planilha.linhas.slice(cabecalho ? 1 : 0).find((l) => l[i])?.[i] || "vazia";
  const campoDaColuna = (i: number) => LISTA_CAMPOS.find((c) => mapa[c] === i) ?? "";
  const definirColuna = (i: number, campo: Campo | "") => {
    const novo = { ...mapa };
    for (const c of LISTA_CAMPOS) if (novo[c] === i) novo[c] = null;
    if (campo) novo[campo] = i;
    setMapa(novo);
  };

  const prontas = resultado.filter((l) => l.pessoa && !l.duplicado);
  const repetidas = resultado.filter((l) => l.pessoa && l.duplicado);
  const comErro = resultado.filter((l) => !l.pessoa);
  const entram = prontas.length + repetidas.filter((l) => forcar.has(l.numero)).length;
  // problemas primeiro; das prontas, só as primeiras na prévia
  const visiveis = [...comErro, ...repetidas, ...prontas.slice(0, 30)];

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="csv" value={planilha.texto} />
      <input type="hidden" name="mapa" value={JSON.stringify(mapa)} />
      <input type="hidden" name="cabecalho" value={cabecalho ? "1" : "0"} />
      {[...forcar].map((n) => (
        <input key={n} type="hidden" name="forcar" value={n} />
      ))}
      {estado.erro && <Aviso>{estado.erro}</Aviso>}

      <Cartao className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-serif text-xl">2. Confiram as colunas</p>
          <button type="button" onClick={() => setPlanilha(null)} className="text-sm text-tinta-suave underline-offset-4 hover:text-tinta hover:underline">
            Trocar a planilha ({planilha.origem})
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cabecalho} onChange={(e) => setCabecalho(e.target.checked)} className="size-4 accent-tinta" />
          A primeira linha tem os nomes das colunas
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {titulos.map((t, i) => (
            <label key={i} className="flex flex-col gap-1.5 text-sm">
              <span className="truncate font-medium" title={t}>
                {t}
                <span className="font-normal text-tinta-suave"> · ex.: {exemplo(i)}</span>
              </span>
              <Selecao value={campoDaColuna(i)} onChange={(e) => definirColuna(i, e.target.value as Campo | "")} aria-label={`Campo da coluna ${t}`}>
                <option value="">Não importar</option>
                {LISTA_CAMPOS.map((c) => (
                  <option key={c} value={c}>
                    {CAMPOS[c].rotulo}
                  </option>
                ))}
              </Selecao>
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1.5 text-sm sm:max-w-xs">
          <span className="font-medium">Sem “de quem” na planilha, considerar</span>
          <Selecao name="lado_padrao" value={ladoPadrao} onChange={(e) => setLadoPadrao(e.target.value as Lado)}>
            {LADOS.map((l) => (
              <option key={l} value={l}>
                {rotulosLado[l]}
              </option>
            ))}
          </Selecao>
        </label>
        {mapa.convite === null && (
          <p className="text-sm text-tinta-suave">
            Sem a coluna de convite, cada pessoa vira um convite. Depois dá para juntar quem vem junto, ou incluam uma
            coluna com o nome da família.
          </p>
        )}
      </Cartao>

      <Cartao className="flex flex-col gap-4">
        <p className="font-serif text-xl">3. Prévia</p>
        {mapa.nome === null ? (
          <Aviso>Escolham a coluna com o nome.</Aviso>
        ) : (
          <>
            <p className="text-sm">
              <span className="text-salvia">{prontas.length} prontas para entrar</span>
              {repetidas.length > 0 && <> · <span className="text-rose">{repetidas.length} parecem repetidas</span> (ficam de fora, a não ser que vocês marquem)</>}
              {comErro.length > 0 && <> · <span className="text-alerta">{comErro.length} com erro</span> (ficam de fora)</>}
            </p>
            <div className="-mx-5 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-xs text-tinta-suave">
                  <tr>
                    <th className="py-2 pr-3 pl-5 font-normal sm:pl-0">Linha</th>
                    <th className="py-2 pr-3 font-normal">Nome</th>
                    <th className="py-2 pr-3 font-normal">Convite</th>
                    <th className="py-2 pr-3 font-normal">Detalhes</th>
                    <th className="py-2 pr-5 font-normal sm:pr-0">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha">
                  {visiveis.map((l) => (
                    <tr key={l.numero} className={cx(!l.pessoa && "text-tinta-suave")}>
                      <td className="py-2 pr-3 pl-5 align-top tabular-nums sm:pl-0">{l.numero}</td>
                      <td className="py-2 pr-3 align-top font-medium">{l.pessoa?.nome ?? (l.nomeBruto || "—")}</td>
                      <td className="py-2 pr-3 align-top">{l.pessoa?.convite ?? (l.pessoa ? <span className="text-tinta-suave">próprio</span> : "")}</td>
                      <td className="py-2 pr-3 align-top text-xs text-tinta-suave">
                        {l.pessoa && (
                          <>
                            {rotulosLado[l.pessoa.lado]}
                            {l.pessoa.grupo && ` · ${l.pessoa.grupo}`}
                            {l.pessoa.faixa !== "adulto" && ` · ${FAIXAS[l.pessoa.faixa].curto}`}
                            {l.pessoa.confirmacao !== "pendente" && ` · ${CONFIRMACOES[l.pessoa.confirmacao].rotulo.toLowerCase()}`}
                          </>
                        )}
                        {l.avisos.map((a) => (
                          <span key={a} className="block text-rose">
                            {a}
                          </span>
                        ))}
                      </td>
                      <td className="py-2 pr-5 align-top sm:pr-0">
                        {!l.pessoa ? (
                          <span className="text-alerta">{l.erros.join(" ")}</span>
                        ) : l.duplicado ? (
                          <span className="flex flex-col gap-1">
                            <span className="text-xs">{l.duplicado}</span>
                            <label className="flex items-center gap-1.5 text-xs">
                              <input
                                type="checkbox"
                                className="size-4 accent-tinta"
                                checked={forcar.has(l.numero)}
                                onChange={(e) => {
                                  const novo = new Set(forcar);
                                  if (e.target.checked) novo.add(l.numero);
                                  else novo.delete(l.numero);
                                  setForcar(novo);
                                }}
                              />
                              Importar mesmo assim
                            </label>
                          </span>
                        ) : (
                          <Selo tom="salvia">entra</Selo>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {prontas.length > 30 && <p className="text-xs text-tinta-suave">E mais {prontas.length - 30} prontas para entrar.</p>}
          </>
        )}
      </Cartao>

      <div className="flex flex-wrap items-center gap-3">
        <BotaoEnviar pendente="Importando…" disabled={mapa.nome === null || entram === 0}>
          {entram === 1 ? "Importar 1 pessoa" : `Importar ${entram} pessoas`}
        </BotaoEnviar>
        <Link href="/convidados" className="text-sm text-tinta-suave hover:text-tinta">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
