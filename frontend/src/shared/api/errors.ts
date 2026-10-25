import axios from "axios";

/** Mensagem de erro devolvida pela API (`{ error: string }`) ou o fallback. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === "string") {
    return err.response.data.error;
  }
  return fallback;
}
