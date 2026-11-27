import assert from "node:assert/strict";
import { test } from "node:test";
import {
  contar,
  filtrar,
  gruposEmUso,
  gruposParaSugerir,
  lerNomes,
  nomeDoConvite,
  normalizarNome,
  rotulosLado,
  type ConviteFamilia,
  type Pessoa,
} from "./convidados";

function pessoa(nome: string, extra: Partial<Pessoa> = {}): Pessoa {
  return {
    id: nome, conviteId: "c", nome, faixa: "adulto", idade: null, confirmacao: "pendente",
    telefone: null, email: null, restricaoAlimentar: null, observacao: null, ...extra,
  };
}

const lista: ConviteFamilia[] = [
  {
    id: "1", nome: "Família Conceição", lado: "a", grupo: "Família",
    pessoas: [
      pessoa("José Conceição", { confirmacao: "confirmado", restricaoAlimentar: "sem glúten" }),
      pessoa("Lia Conceição", { faixa: "crianca", confirmacao: "confirmado" }),
      pessoa("Téo Conceição", { faixa: "bebe" }),
    ],
  },
  { id: "2", nome: "Marcos", lado: "b", grupo: "trabalho", pessoas: [pessoa("Marcos", { confirmacao: "recusado" })] },
  { id: "3", nome: "Vazio", lado: "ambos", grupo: null, pessoas: [] },
];

test("normalizarNome tira acento, maiúsculas e espaços extras", () => {
  assert.equal(normalizarNome("  José   da CONCEIÇÃO "), "jose da conceicao");
});

test("lerNomes separa por linha, vírgula e ponto e vírgula, sem vazios nem repetidos", () => {
  assert.deepEqual(lerNomes("Ana\n\n bruno  silva ,Carla; ana\nBRUNO SILVA"), ["Ana", "bruno silva", "Carla"]);
  assert.deepEqual(lerNomes("  \n , "), []);
});

test("nomeDoConvite usa o informado ou monta a partir dos nomes", () => {
  assert.equal(nomeDoConvite("  Família   Silva ", ["X"]), "Família Silva");
  assert.equal(nomeDoConvite("", ["Ana"]), "Ana");
  assert.equal(nomeDoConvite("", ["Ana", "Bruno"]), "Ana e Bruno");
  assert.equal(nomeDoConvite("", ["Ana", "Bruno", "Lia"]), "Ana e família");
});

test("contar soma confirmações, faixas, restrições e só convites com gente", () => {
  assert.deepEqual(contar(lista), {
    convites: 2, pessoas: 4, confirmados: 2, pendentes: 1, recusados: 1,
    adultos: 2, criancas: 1, bebes: 1, comRestricao: 1,
  });
  assert.equal(contar([]).pessoas, 0);
});

test("filtrar por lado e grupo (sem acento nem maiúsculas) olha o convite", () => {
  assert.deepEqual(filtrar(lista, { lado: "b" }).map((c) => c.id), ["2"]);
  assert.deepEqual(filtrar(lista, { grupo: "Trabalho" }).map((c) => c.id), ["2"]);
});

test("filtrar por faixa e confirmação olha as pessoas e esconde convites vazios", () => {
  const r = filtrar(lista, { confirmacao: "confirmado", faixa: "crianca" });
  assert.deepEqual(r.map((c) => c.pessoas.map((p) => p.nome)), [["Lia Conceição"]]);
  assert.deepEqual(filtrar(lista, {}).map((c) => c.id), ["1", "2"]);
});

test("busca acha pela pessoa ou pelo nome do convite, sem acento", () => {
  assert.deepEqual(filtrar(lista, { busca: "teo" }).flatMap((c) => c.pessoas.map((p) => p.nome)), ["Téo Conceição"]);
  assert.equal(filtrar(lista, { busca: "familia conceicao" })[0]?.pessoas.length, 3);
});

test("rótulos de lado usam o primeiro nome de cada membro", () => {
  assert.deepEqual(rotulosLado([{ nome: "Ana Souza" }, { nome: "Bruno" }]), {
    a: "Ana", b: "Bruno", ambos: "Dos dois",
  });
  assert.equal(rotulosLado([{ nome: "Ana" }]).b, "Seu amor");
});

test("grupos: sugestões sem repetir os já usados; em uso em ordem alfabética", () => {
  const sugestoes = gruposParaSugerir(lista);
  assert.equal(sugestoes.filter((g) => normalizarNome(g) === "trabalho").length, 1);
  assert.equal(sugestoes[0], "Família");
  assert.deepEqual(gruposEmUso(lista), ["Família", "trabalho"]);
});
