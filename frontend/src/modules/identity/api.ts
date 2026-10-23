import { http } from "@/shared/api/http";

export interface User {
  id: number;
  name: string;
  email: string;
}

export const authApi = {
  async me(): Promise<User> {
    const { data } = await http.get<{ user: User }>("/auth/me");
    return data.user;
  },

  async login(email: string, password: string): Promise<User> {
    const { data } = await http.post<{ user: User }>("/auth/login", { email, password });
    return data.user;
  },

  async logout(): Promise<void> {
    await http.post("/auth/logout");
  },

  async resetPassword(input: { adminPassword: string; email: string; newPassword: string }): Promise<void> {
    await http.post("/auth/reset-password", input);
  },
};
