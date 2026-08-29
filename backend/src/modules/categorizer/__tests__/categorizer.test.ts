import { describe, it, expect } from "vitest";
import { categorize } from "../categorizer.rules";

// Todos os 74 pares únicos extraídos do banco real (user 11).
// Cada linha representa uma ou mais transações categorizadas — todas devem passar.
const CASES: [string, string][] = [
  // ── Assinaturas (2) ──────────────────────────────────────────────────────
  ["15/06 21:45 DLOCAL BRASIL INSTITUICAO",  "Assinaturas"],
  ["APPFIN.NET MEIOS DE PAGAMENTO",           "Assinaturas"],

  // ── Casamento (3) ────────────────────────────────────────────────────────
  ["Cerimonialista",                          "Casamento"],
  ["LUA de mel",                              "Casamento"],
  ["Presente Familia Neco",                   "Casamento"],

  // ── Casa (1) ─────────────────────────────────────────────────────────────
  ["OUROCARD FACIL VISA",                     "Casa"],

  // ── Investimentos (2) ────────────────────────────────────────────────────
  ["Valor que pagou os investimentos",        "Investimentos"],
  ["HB20 (23x)",                              "Investimentos"],

  // ── Lanches (13) ─────────────────────────────────────────────────────────
  ["07/03 14:46 SUPERMERCADO DIASVILLE",      "Lanches"],
  ["08/02 22:13 FORT ATACADISTA",             "Lanches"],
  ["13/05 10:44 SUPERMERCADO ALBINO",         "Lanches"],
  ["20/07 18:28 Supermercado",                "Lanches"],
  ["20/07 22:00 FORT ATACADISTA",             "Lanches"],
  ["21/07 15:51 FORT ATACADISTA",             "Lanches"],
  ["22/07 10:21 SNACK BAR",                   "Lanches"],
  ["24/07 13:47 CAPPTA *OFC CHICKEN",         "Lanches"],
  ["30/07 13:49 FORT ATACADISTA",             "Lanches"],
  ['Compra no debito: "No estabelecimento CAPPTA *LOJA COR E ART JOINVILLE BRA"', "Lanches"],
  ['Compra no debito: "No estabelecimento Supermercado JOINVILLE BRA"',           "Lanches"],
  ['Pix enviado: "Cp :14796606-IFOODCOM AGENCIA DE RESTAURANTES ONLINE SA"',     "Lanches"],
  ['Pix enviado: "Cp :60701190-SUPERMERCADO ALBINO"',                             "Lanches"],

  // ── Mariana (19) ─────────────────────────────────────────────────────────
  ["05/01 17:16 MARIANA ADACIA DA SILVA",     "Mariana"],
  ["06/04 19:46 MARIANA ADACIA DA SILVA",     "Mariana"],
  ["06/04 21:29 MARIANA ADACIA DA SILVA",     "Mariana"],
  ["11/06 18:37 HELOISA LOPES ALBANO",        "Mariana"],
  ["15/02 11:28 MARIANA ADACIA DA SILVA",     "Mariana"],
  ["16/06 15:35 HELOISA LOPES ALBANO",        "Mariana"],
  ["16/07 01:59 MARIANA ADACIA DA SILVA",     "Mariana"],
  ["17/06 11:59 HELOISA LOPES ALBANO",        "Mariana"],
  ["18/06 12:40 HELOISA LOPES ALBANO",        "Mariana"],
  ["19/03 21:26 MARIANA ADACIA DA SILVA",     "Mariana"],
  ["02/05 12:04 08534924929 MARIANA ADACIA",  "Mariana"],
  ["05/03 09:00 08534924929 MARIANA ADACIA",  "Mariana"],
  ["06/05 14:46 08534924929 MARIANA ADACIA",  "Mariana"],
  ["09/01 06:29 08534924929 MARIANA ADACIA",  "Mariana"],
  ["13/05 11:55 08534924929 MARIANA ADACIA",  "Mariana"],
  ["31/03 21:52 08534924929 MARIANA ADACIA",  "Mariana"],
  ['Pix recebido: "Cp :00000000-MARIANA ADACIA DA SILVA"',                        "Mariana"],
  ['Pix recebido: "Cp :00360305-MARIANA ADACIA DA SILVA"',                        "Mariana"],
  ['Pix enviado: "Cp :00000000-Mariana Adacia da Silva"',                         "Mariana"],

  // ── Mateus (1) ───────────────────────────────────────────────────────────
  ["SK luthier",                              "Mateus"],

  // ── Roupas (3) ───────────────────────────────────────────────────────────
  ["07/04 19:14 HAVAN S.A",                   "Roupas"],
  ["22/07 06:08 HAVAN AUTO CENTER LT",        "Roupas"],
  ['Pix enviado: "Cp :60746948-HAVAN SA"',    "Roupas"],

  // ── Salario Mateus (2) ───────────────────────────────────────────────────
  ["AJUSTE DE SALARIO DESPESA",               "Salario Mateus"],
  ["TS SOLUTIONS AJUSTE DE SALARIO",          "Salario Mateus"],

  // ── Saúde (3) ────────────────────────────────────────────────────────────
  ["05/03 21:19 DROGARIA LUFARMA LTD",        "Saúde"],
  ["30/07 22:21 DROGARIA CATARINE",           "Saúde"],
  ['Compra no debito: "No estabelecimento SAO JOAO FARMACIAS JOINVILLE BRA"',     "Saúde"],

  // ── Uber (25) ────────────────────────────────────────────────────────────
  ["01/04 13:04 99 TECNOLOGIA LTDA",          "Uber"],
  ["03/02 16:29 99 TECNOLOGIA LTDA",          "Uber"],
  ["05/02 15:45 99 TECNOLOGIA LTDA",          "Uber"],
  ["06/02 08:09 99 TECNOLOGIA LTDA",          "Uber"],
  ["06/02 08:12 99 TECNOLOGIA LTDA",          "Uber"],
  ["06/02 18:58 99 TECNOLOGIA LTDA",          "Uber"],
  ["07/03 00:07 99 TECNOLOGIA LTDA",          "Uber"],
  ["07/03 00:09 99 TECNOLOGIA LTDA",          "Uber"],
  ["07/03 17:06 99 TECNOLOGIA LTDA",          "Uber"],
  ["08/02 23:02 UBER DO BRASIL TECNOLOGIA",   "Uber"],
  ["08/03 03:35 99 TECNOLOGIA LTDA",          "Uber"],
  ["09/02 19:53 99 TECNOLOGIA LTDA",          "Uber"],
  ["09/02 19:54 99 TECNOLOGIA LTDA",          "Uber"],
  ["19/07 22:39 99 TECNOLOGIA LTDA",          "Uber"],
  ["20/03 20:33 99 TECNOLOGIA LTDA",          "Uber"],
  ["21/03 19:32 99 TECNOLOGIA LTDA",          "Uber"],
  ["30/01 19:33 99 TECNOLOGIA LTDA",          "Uber"],
  ["30/01 19:36 99 TECNOLOGIA LTDA",          "Uber"],
  ["30/01 23:31 99 TECNOLOGIA LTDA",          "Uber"],
  ["31/03 07:30 99 TECNOLOGIA LTDA",          "Uber"],
  ['Compra no debito: "No estabelecimento Uber UBER *TRIP HELP.U SP BRA"',        "Uber"],
  ['Pix enviado: "Cp :14796606-99 TECNOLOGIA LTDA"',                              "Uber"],
  ['Pix enviado: "Cp :24313102-99 TECNOLOGIA LTDA"',                              "Uber"],
  ['Pix enviado: "Cp :30306294-99 TECNOLOGIA LTDA"',                              "Uber"],
  ['Pix enviado: "Cp :14796606-UBER DO BRASIL TECNOLOGIA LTDA"',                  "Uber"],
];

describe("categorize()", () => {
  it.each(CASES)('"%s" → %s', (desc, expected) => {
    expect(categorize(desc)).toBe(expected);
  });
});
