import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SUGESTAO, distribuir, pesos, type Prioridades } from "./orcamento";

const soma = (r: Record<string, number>) => Object.values(r).reduce((s, v) => s + v, 0);

describe("SUGESTAO", () => {
  it("soma 100%", () => assert.equal(soma(SUGESTAO), 10000));
});

describe("pesos", () => {
  it("sem prioridades, é a própria sugestão", () => {
    const w = pesos();
    for (const [c, v] of Object.entries(SUGESTAO)) assert.ok(Math.abs(w[c as keyof typeof w] - v) < 1e-9, c);
  });

  it("com prioridades: as priorizadas sobem, as outras cedem na mesma proporção, a reserva fica", () => {
    const w = pesos({ 1: "foto_video", 2: "musica" });
    assert.ok(Math.abs(soma(w) - 10000) < 1e-6);
    assert.equal(w.foto_video, 1500);
    assert.equal(w.musica, 810);
    assert.equal(w.reserva, 500);
    // buffet e espaço cedem pelo mesmo fator
    assert.ok(w.buffet < 3000 && w.local < 1500);
    assert.ok(Math.abs(w.buffet / 3000 - w.local / 1500) < 1e-12);
  });

  it("prioridade na reserva é ignorada", () => {
    assert.deepEqual(pesos({ 1: "reserva" }), pesos());
  });
});

describe("distribuir", () => {
  const casos: [number, Prioridades][] = [
    [0, {}],
    [1, {}],
    [99, {}],
    [100, {}],
    [4_500_000, {}],
    [4_500_050, {}],
    [3_333_333, { 1: "buffet" }],
    [12_345_678, { 1: "foto_video", 2: "decoracao", 3: "musica" }],
    [7_777_777, { 1: "local", 2: "buffet", 3: "foto_video" }],
    [100_000_000_000, { 1: "beleza" }],
  ];

  for (const [total, prioridades] of casos) {
    it(`distribui exatamente ${total} centavos (${JSON.stringify(prioridades)})`, () => {
      const r = distribuir(total, prioridades);
      assert.equal(soma(r), total);
      for (const v of Object.values(r)) assert.ok(Number.isInteger(v) && v >= 0);
    });
  }

  it("aleatório: 2.000 totais e combinações de prioridade somam exato", () => {
    const cats = Object.keys(SUGESTAO) as (keyof typeof SUGESTAO)[];
    let semente = 42;
    const rand = (n: number) => ((semente = (semente * 1103515245 + 12345) % 2 ** 31), semente % n);
    for (let i = 0; i < 2000; i++) {
      const total = rand(2 ** 30) * (rand(3) + 1) + rand(100);
      const p: Prioridades = {};
      for (const pr of [1, 2, 3] as const) if (rand(2)) p[pr] = cats[rand(cats.length)];
      assert.equal(soma(distribuir(total, p)), total);
    }
  });

  it("valores em reais inteiros; os centavos que sobram vão para a reserva", () => {
    const r = distribuir(4_500_037);
    for (const [c, v] of Object.entries(r)) if (c !== "reserva") assert.equal(v % 100, 0, c);
    assert.equal(r.reserva % 100, 37);
  });

  it("R$ 45.000 sem prioridades segue a sugestão", () => {
    const r = distribuir(4_500_000);
    assert.equal(r.buffet, 1_350_000); // 30%
    assert.equal(r.local, 675_000); // 15%
    assert.equal(r.cerimonia, 0);
    assert.equal(r.reserva, 225_000); // 5%
  });

  it("recusa total negativo ou não inteiro", () => {
    assert.throws(() => distribuir(-1));
    assert.throws(() => distribuir(10.5));
  });
});
