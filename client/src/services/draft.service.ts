import { api, createConfig } from "./api";

export interface DraftRecord {
  _id: string;
  title: string;
  category: string;
  tags?: string[];
  desc: string;
  content: string;
  img?: string;
  updatedAt: string;
}

export async function getDrafts(token: string): Promise<DraftRecord[]> {
  const { data } = await api.get<DraftRecord[]>("/drafts", createConfig(token));
  return data;
}

export async function getDraft(
  draftId: string,
  token: string
): Promise<DraftRecord> {
  const { data } = await api.get<DraftRecord>(
    `/drafts/${draftId}`,
    createConfig(token)
  );
  return data;
}

export async function createDraft(
  body: Partial<DraftRecord>,
  token: string
): Promise<DraftRecord> {
  const { data } = await api.post<DraftRecord>(
    "/drafts",
    body,
    createConfig(token)
  );
  return data;
}

export async function updateDraft(
  draftId: string,
  body: Partial<DraftRecord>,
  token: string
): Promise<DraftRecord> {
  const { data } = await api.put<DraftRecord>(
    `/drafts/${draftId}`,
    body,
    createConfig(token)
  );
  return data;
}

export async function deleteDraft(
  draftId: string,
  token: string
): Promise<void> {
  await api.delete(`/drafts/${draftId}`, createConfig(token));
}
