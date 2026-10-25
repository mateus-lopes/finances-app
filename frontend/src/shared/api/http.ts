import axios from "axios";

/**
 * Cliente HTTP da API. O frontend é servido pela mesma origem do backend
 * (monólito), então o cookie de sessão é enviado automaticamente.
 * Em desenvolvimento o Vite faz proxy de /api para o backend.
 */
export const http = axios.create({ baseURL: "/api" });
