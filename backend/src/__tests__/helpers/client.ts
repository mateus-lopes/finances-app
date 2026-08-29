import supertest from "supertest";
import app from "../../app";
import { TEST_EMAIL, TEST_PASSWORD } from "../setup";

export const api = supertest(app);

export async function getAuthCookie(): Promise<string> {
  const res = await api
    .post("/api/auth/login")
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

  if (res.status !== 200) throw new Error(`Login falhou: ${JSON.stringify(res.body)}`);

  const raw = res.headers["set-cookie"] as string | string[];
  const cookies = Array.isArray(raw) ? raw : [raw];
  const authCookie = cookies.find((c) => c.startsWith("auth_token="));
  if (!authCookie) throw new Error("Cookie auth_token não retornado pelo login");

  return authCookie.split(";")[0]; // só "auth_token=xxx"
}

export type AuthedAgent = {
  get: (url: string) => supertest.Test;
  post: (url: string) => supertest.Test;
  put: (url: string) => supertest.Test;
  patch: (url: string) => supertest.Test;
  delete: (url: string) => supertest.Test;
};

export async function authed(): Promise<AuthedAgent> {
  const cookie = await getAuthCookie();
  const set = (req: supertest.Test) => req.set("Cookie", cookie);
  return {
    get: (url) => set(api.get(url)),
    post: (url) => set(api.post(url)),
    put: (url) => set(api.put(url)),
    patch: (url) => set(api.patch(url)),
    delete: (url) => set(api.delete(url)),
  };
}
