import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MODELO_CSV,
  adivinharMapeamento,
  agrupar,
  chaveTelefone,
  decodificar,
  interpretar,
  lerCsv,
  pareceCabecalho,
  type Contexto,
} from "./importar-convidados";

const ctx: Contexto = { nomesLado: { a: "Ana", b: "Bruno" }, ladoPadrao: "ambos" };

test("lerCsv: ponto e vírgula, vírgula, aspas, quebra dentro de aspas, \\r\\n e linhas vazias", () => {
  assert.deepEqual(lerCsv("﻿nome;grupo\r\nJoão;Família\r\n\r\n"), [["nome", "grupo"], ["João", "Família"]]);
  assert.deepEqual(lerCsv('nome,obs\n"Silva, João","disse ""oi""\nduas linhas"'), [
    ["nome", "obs"],
    ["Silva, João", 'disse "oi"\nduas linhas'],
  ]);
  assert.deepEqual(lerCsv("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]);
});

test("decodificar: UTF-8 e, se não for, Windows-1252 (Excel)", () => {
  assert.equal(decodificar(new TextEncoder().encode("﻿João")), "João");
  assert.equal(decodificar(new Uint8Array([0x4a, 0x6f, 0xe3, 0x6f])), "João");
});

test("adivinharMapeamento reconhece nomes comuns, sem acento e sem repetir coluna", () => {
  const m = adivinharMapeamento(["Nome completo", "Família", "Celular", "E-mail", "Restrição alimentar", "Obs.", "Idade", "Lado"]);
  assert.deepEqual(
    [m.nome, m.convite, m.telefone, m.email, m.restricao, m.observacao, m.idade, m.lado, m.grupo],
    [0, 1, 2, 3, 4, 5, 6, 7, null],
  );
  assert.equal(pareceCabecalho(["João", "Maria"]), false);
  assert.equal(pareceCabecalho(["nome"]), true);
});

test("o modelo para baixar é reconhecido inteiro", () => {
  const linhas = lerCsv(MODELO_CSV);
  const mapa = adivinharMapeamento(linhas[0]);
  assert.ok(Object.values(mapa).filter((v) => v !== null).length >= 10);
  const r = interpretar(linhas, { mapa, temCabecalho: true, contexto: ctx, existentes: [] });
  assert.equal(r.filter((l) => l.pessoa).length, 4);
  assert.equal(r[2].pessoa?.faixa, "crianca");
  assert.equal(r[2].pessoa?.idade, 8);
});

test("valores: lado pelo primeiro nome, faixa pela idade, confirmação, e linha inválida sem derrubar as outras", () => {
  const linhas = lerCsv(
    "nome;de quem;faixa;idade;email;confirmação\n" +
      "Lia;Bruno;;4;;sim\n" +
      ";ana;;;;\n" +
      "Téo;da Ana;;200;x@;não\n" +
      "Rui;vizinho;idoso;;RUI@X.COM;talvez\n",
  );
  const r = interpretar(linhas, { mapa: adivinharMapeamento(linhas[0]), temCabecalho: true, contexto: ctx, existentes: [] });
  assert.equal(r[0].numero, 2);
  assert.deepEqual([r[0].pessoa?.lado, r[0].pessoa?.faixa, r[0].pessoa?.confirmacao], ["b", "bebe", "confirmado"]);
  assert.deepEqual(r[1].erros, ["Sem nome."]);
  assert.equal(r[2].pessoa, null);
  assert.equal(r[2].erros.length, 2);
  assert.deepEqual([r[3].pessoa?.lado, r[3].pessoa?.faixa, r[3].pessoa?.email, r[3].pessoa?.confirmacao], ["ambos", "adulto", "rui@x.com", "pendente"]);
  assert.equal(r[3].avisos.length, 2);
});

test("duplicados: nome sem acento, telefone ou e-mail, na lista ou na própria planilha", () => {
  const linhas = lerCsv(
    "nome;telefone;email\nJOSE da Silva;;\nOutro;+55 (11) 99999-0000;\nMaria;;m@x.com\nMaria;;\nNova;;\n",
  );
  const r = interpretar(linhas, {
    mapa: adivinharMapeamento(linhas[0]),
    temCabecalho: true,
    contexto: ctx,
    existentes: [{ nome: "José da Silva", telefone: "11 99999-0000", email: null }],
  });
  assert.match(r[0].duplicado ?? "", /Mesmo nome de José da Silva \(já na lista\)/);
  assert.match(r[1].duplicado ?? "", /Mesmo telefone/);
  assert.equal(r[2].duplicado, null);
  assert.match(r[3].duplicado ?? "", /linha anterior/);
  assert.equal(r[4].duplicado, null);
  assert.equal(chaveTelefone("1234"), null);
});

test("importar o mesmo arquivo de novo marca todos como repetidos", () => {
  const linhas = lerCsv(MODELO_CSV);
  const mapa = adivinharMapeamento(linhas[0]);
  const primeira = interpretar(linhas, { mapa, temCabecalho: true, contexto: ctx, existentes: [] });
  const existentes = primeira.flatMap((l) => (l.pessoa ? [l.pessoa] : []));
  const segunda = interpretar(linhas, { mapa, temCabecalho: true, contexto: ctx, existentes });
  assert.ok(segunda.every((l) => l.duplicado));
});

test("agrupar: mesma coluna convite vai junto, convite existente recebe, sem convite cada um sozinho", () => {
  const p = (nome: string, convite: string | null) => ({
    nome, convite, lado: "a" as const, grupo: null, faixa: "adulto" as const, idade: null,
    telefone: null, email: null, restricao: null, observacao: null, confirmacao: "pendente" as const,
  });
  const g = agrupar(
    [p("João", "Família Silva"), p("Maria", "familia silva"), p("Rui", null), p("Bia", "Os Souza"), p("Gil", null)],
    [{ id: "x", nome: "Os Souza" }],
  );
  assert.deepEqual(g.novos.map((c) => [c.nome, c.pessoas.length]), [["Família Silva", 2], ["Rui", 1], ["Gil", 1]]);
  assert.deepEqual([...g.emExistentes].map(([id, ps]) => [id, ps.map((x) => x.nome)]), [["x", ["Bia"]]]);
});
