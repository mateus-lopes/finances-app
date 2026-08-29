import { describe, it, expect } from "vitest";
import { api } from "../helpers/client";
import { TEST_EMAIL, TEST_PASSWORD } from "../setup";

describe("POST /api/auth/login", () => {
  it("retorna cookie e dados do usuário com credenciais válidas", async () => {
    const res = await api.post("/api/auth/login").send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(TEST_EMAIL);

    const cookies = res.headers["set-cookie"] as string | string[];
    const arr = Array.isArray(cookies) ? cookies : [cookies];
    expect(arr.some((c) => c.startsWith("auth_token="))).toBe(true);
  });

  it("retorna 401 com senha errada", async () => {
    const res = await api.post("/api/auth/login").send({ email: TEST_EMAIL, password: "senhaerrada" });
    expect(res.status).toBe(401);
  });

  it("retorna 401 com email inexistente", async () => {
    const res = await api.post("/api/auth/login").send({ email: "naoexiste@test.com", password: TEST_PASSWORD });
    expect(res.status).toBe(401);
  });

  it("retorna 400 com corpo inválido", async () => {
    const res = await api.post("/api/auth/login").send({ email: "nao-e-email" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("retorna usuário com cookie válido", async () => {
    const loginRes = await api.post("/api/auth/login").send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const raw = loginRes.headers["set-cookie"] as string | string[];
    const cookie = (Array.isArray(raw) ? raw : [raw]).find((c) => c.startsWith("auth_token="))!;

    const res = await api.get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(TEST_EMAIL);
  });

  it("retorna 401 sem cookie", async () => {
    const res = await api.get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
