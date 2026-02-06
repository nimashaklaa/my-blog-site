import { api, createConfig } from "./api";
import type { Series, SeriesResponse } from "../types";

export interface GetSeriesParams {
  page?: number;
  limit?: number;
  cat?: string;
  tag?: string;
  search?: string;
  sort?: string;
  [key: string]: unknown;
}

export async function getSeries(
  params: GetSeriesParams = {},
  token: string | null = null
): Promise<SeriesResponse> {
  const { data } = await api.get<SeriesResponse>("/series", {
    ...createConfig(token),
    params: { page: 1, limit: 10, ...params },
  });
  return data;
}

export async function getSeriesBySlug(
  slug: string,
  token: string | null = null
): Promise<Series> {
  const { data } = await api.get<Series>(
    `/series/${slug}`,
    createConfig(token)
  );
  return data;
}

export async function getSeriesById(
  id: string,
  token: string | null = null
): Promise<Series> {
  const { data } = await api.get<Series>(
    `/series/id/${id}`,
    createConfig(token)
  );
  return data;
}

export async function createSeries(
  body: {
    img?: string;
    name: string;
    category: string;
    tags: string[];
    desc?: string;
    posts?: Array<{ post: string; order: number }>;
  },
  token: string
) {
  const { data } = await api.post<Series>("/series", body, createConfig(token));
  return data;
}

export async function updateSeries(
  seriesId: string,
  body: {
    img?: string;
    name: string;
    category: string;
    tags: string[];
    desc?: string;
    posts?: Array<{ post: string; order: number }>;
  },
  token: string
) {
  const { data } = await api.put<Series>(
    `/series/${seriesId}`,
    body,
    createConfig(token)
  );
  return data;
}

export async function deleteSeries(seriesId: string, token: string) {
  await api.delete(`/series/${seriesId}`, createConfig(token));
}
