import { decryptKey } from "./crypto";

export type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  modelId: string;
};

type UserRecord = {
  llmEndpoint?: string | null;
  llmApiKey?: string | null;
  llmModel?: string | null;
};

function normalizeBaseUrl(rawUrl: string): string {
  // Prevent double /v1 injection — check the path component only, not domain
  const hasV1 = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).pathname.includes("/v1");
  if (hasV1) return rawUrl.replace(/\/+$/, "");
  return `${rawUrl.replace(/\/+$/, "")}/v1`;
}

export function resolveProviderConfig(user: UserRecord | null | undefined): ProviderConfig {
  const userEndpoint = user?.llmEndpoint?.trim() || null;
  const systemBaseUrl = process.env.LLM_BASE_URL || "https://mino.redemption.pw/x/zai/glm-5";
  const isCustomEndpoint = userEndpoint != null && userEndpoint !== systemBaseUrl;

  const rawBaseUrl = userEndpoint || systemBaseUrl;
  const baseUrl = normalizeBaseUrl(rawBaseUrl);

  const apiKey = user?.llmApiKey
    ? decryptKey(user.llmApiKey)
    : (isCustomEndpoint ? "" : (process.env.LLM_API_KEY || ""));

  const modelId = user?.llmModel?.trim()
    ? user.llmModel
    : (isCustomEndpoint ? "local-model" : (process.env.LLM_MODEL || "glm-5.1"));

  return { baseUrl, apiKey, modelId };
}
