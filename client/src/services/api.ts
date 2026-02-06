import axios, { type AxiosRequestConfig } from "axios";

const getBaseURL = (): string => {
  const url = import.meta.env.VITE_API_URL;
  if (!url) throw new Error("VITE_API_URL is not set");
  return url;
};

export const getApiUrl = getBaseURL;

export function authHeaders(
  token: string | null
): AxiosRequestConfig["headers"] {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export const api = axios.create({
  baseURL: getBaseURL(),
  headers: { "Content-Type": "application/json" },
});

export function createConfig(token: string | null): AxiosRequestConfig {
  return { headers: authHeaders(token) };
}
