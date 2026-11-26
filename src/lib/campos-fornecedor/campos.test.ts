import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { camposDa, detalhesParaForm, lerDetalhes, nomeCampo, resumoDetalhes } from "./index";

function fd(campos: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const x of [v].flat()) f.append(k.startsWith("d_") ? k : nomeCampo(k), x);
  return f;
}

const ler = (categoria: string, campos: Record<string, string | string[]>) => lerDetalhes(categoria, fd(campos));

describe("lerDetalhes", () => {
  it("espaço: converte cada tipo e omite o que ficou vazio", () => {
    assert.deepEqual(
      ler("local", { capacidade: "180", cerimonia_no_local: "sim", plano_b_chuva: "nao", horario_limite: "02:00", estacionamento: "" }),
      { detalhes: { capacidade: 180, cerimonia_no_local: true, plano_b_chuva: false, horario_limite: "02:00" } },
    );
  });

  it("buffet: dinheiro em centavos, data, opção e múltipla na ordem da lista", () => {
    assert.deepEqual(
      ler("buffet", {
        preco_por_pessoa: "185,50",
        tipo_servico: "volante",
        data_degustacao: "2027-03-20",
        inclusos: ["bem_casados", "bolo", "bolo"],
        garcons: "12",
      }),
      {
        detalhes: { preco_por_pessoa: 18550, tipo_servico: "volante", data_degustacao: "2027-03-20", inclusos: ["bolo", "bem_casados"], garcons: 12 },
      },
    );
  });

  it("descarta campos desconhecidos e campos de outra categoria", () => {
    assert.deepEqual(ler("musica", { formato: "dj", capacidade: "100", d_hack: "x", "d___proto__": "y" }), {
      detalhes: { formato: "dj" },
    });
  });

  it("categoria sem campos próprios: detalhes vazio", () => {
    assert.deepEqual(ler("aliancas", { capacidade: "100" }), { detalhes: {} });
    assert.deepEqual(camposDa("aliancas"), []);
  });

  const invalidos: [string, Record<string, string | string[]>, RegExp][] = [
    ["local", { capacidade: "abc" }, /Capacidade/],
    ["local", { capacidade: "0" }, /de 1 a 5000/],
    ["local", { capacidade: "5001" }, /Capacidade/],
    ["local", { capacidade: "12.5" }, /Capacidade/],
    ["local", { cerimonia_no_local: "talvez" }, /sim ou não/],
    ["local", { horario_limite: "25:00" }, /horário inválido/],
    ["buffet", { data_degustacao: "2027-02-30" }, /data inválida/],
    ["buffet", { tipo_servico: "churrasco" }, /opção inválida/],
    ["buffet", { inclusos: ["bolo", "salgados"] }, /opção inválida/],
    ["buffet", { preco_por_pessoa: "cento e vinte" }, /valor inválido/],
    ["foto_video", { prazo_entrega_dias: "999" }, /Prazo de entrega/],
    ["assessoria", { tipo: "__proto__" }, /opção inválida/],
  ];
  for (const [categoria, campos, msg] of invalidos) {
    it(`recusa ${categoria} ${JSON.stringify(campos)}`, () => {
      const r = ler(categoria, campos);
      assert.ok("erro" in r, "deveria dar erro");
      assert.match(r.erro, msg);
    });
  }
});

describe("ida e volta", () => {
  it("o que o formulário mostra volta igual ao ler de novo", () => {
    const original = { capacidade: 180, cerimonia_no_local: true, plano_b_chuva: false, horario_limite: "02:00" };
    const valores = detalhesParaForm("local", original);
    assert.deepEqual(valores, { capacidade: "180", cerimonia_no_local: "sim", plano_b_chuva: "nao", horario_limite: "02:00" });
    assert.deepEqual(ler("local", valores), { detalhes: original });
  });

  it("dinheiro: 18550 ↔ '185,50'", () => {
    assert.deepEqual(detalhesParaForm("buffet", { preco_por_pessoa: 18550 }), { preco_por_pessoa: "185,50" });
  });
});

describe("resumoDetalhes", () => {
  it("só o que está preenchido, formatado", () => {
    assert.deepEqual(resumoDetalhes("local", { capacidade: 1200, estacionamento: false, horario_limite: "02:30", lixo: 1 }), [
      { rotulo: "Capacidade", texto: "1.200 pessoas" },
      { rotulo: "Horário limite da festa", texto: "02h30" },
      { rotulo: "Estacionamento", texto: "Não" },
    ]);
  });
});
