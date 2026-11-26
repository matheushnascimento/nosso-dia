import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { respostasDasTags, tagsDasRespostas } from "./estilo";

const GRUPO = {
  tradicional: "formato", noite: "periodo", ao_ar_livre: "ambiente", misto: "ambiente", fechado: "ambiente",
  rustico: "estilo", boho: "estilo",
};

describe("estilo", () => {
  it("respostas viram tags ordenadas, sem repetição", () => {
    assert.deepEqual(tagsDasRespostas({ formato: ["tradicional"], estilo: ["rustico", "boho", "boho"] }), ["boho", "rustico", "tradicional"]);
  });
  it("misto leva também ao_ar_livre", () => {
    assert.deepEqual(tagsDasRespostas({ ambiente: ["misto"] }), ["ao_ar_livre", "misto"]);
  });
  it("ida e volta: misto continua misto (ao_ar_livre implícito não vira resposta)", () => {
    const r = { formato: ["tradicional"], periodo: ["noite"], ambiente: ["misto"], estilo: ["boho", "rustico"] };
    assert.deepEqual(respostasDasTags(tagsDasRespostas(r), GRUPO), r);
  });
  it("ao ar livre sozinho continua ao ar livre", () => {
    assert.deepEqual(respostasDasTags(["ao_ar_livre"], GRUPO), { ambiente: ["ao_ar_livre"] });
  });
});
