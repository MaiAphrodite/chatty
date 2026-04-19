import type { ModelConfig } from "./types";

export const MODEL_CONFIG_STORAGE_PREFIX = "chatty:model-config:";
export const MODEL_CONFIG_UPDATED_EVENT = "chatty:model-config-updated";

export type ModelConfigUpdatedDetail = {
  characterId: string;
  config: ModelConfig;
};

export const MODEL_CONFIG_LIMITS = {
  temperature: { min: 0, max: 2, step: 0.05 },
  topP: { min: 0, max: 1, step: 0.05 },
  maxTokens: { min: 128, max: 4096, step: 64 },
  frequencyPenalty: { min: -2, max: 2, step: 0.05 },
  presencePenalty: { min: -2, max: 2, step: 0.05 },
} as const;

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  systemPromptOverride: "",
  temperature: 0.8,
  topP: 0.9,
  maxTokens: 2048,
  frequencyPenalty: 0,
  presencePenalty: 0,
  negativePrompt: "",
};

type LegacyModelConfig = Partial<ModelConfig> & {
  repPenalty?: unknown;
};

function modelNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function modelText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function modelConfigStorageKey(characterId: string): string {
  return `${MODEL_CONFIG_STORAGE_PREFIX}${characterId}`;
}

export function sanitizeModelConfig(raw: LegacyModelConfig | null | undefined): ModelConfig {
  const candidate = raw ?? {};
  const frequencyPenaltySource = candidate.frequencyPenalty ?? candidate.repPenalty;

  return {
    systemPromptOverride: modelText(candidate.systemPromptOverride),
    temperature: clamp(
      modelNumber(candidate.temperature, DEFAULT_MODEL_CONFIG.temperature),
      MODEL_CONFIG_LIMITS.temperature.min,
      MODEL_CONFIG_LIMITS.temperature.max,
    ),
    topP: clamp(
      modelNumber(candidate.topP, DEFAULT_MODEL_CONFIG.topP),
      MODEL_CONFIG_LIMITS.topP.min,
      MODEL_CONFIG_LIMITS.topP.max,
    ),
    maxTokens: Math.round(
      clamp(
        modelNumber(candidate.maxTokens, DEFAULT_MODEL_CONFIG.maxTokens),
        MODEL_CONFIG_LIMITS.maxTokens.min,
        MODEL_CONFIG_LIMITS.maxTokens.max,
      ),
    ),
    frequencyPenalty: clamp(
      modelNumber(frequencyPenaltySource, DEFAULT_MODEL_CONFIG.frequencyPenalty),
      MODEL_CONFIG_LIMITS.frequencyPenalty.min,
      MODEL_CONFIG_LIMITS.frequencyPenalty.max,
    ),
    presencePenalty: clamp(
      modelNumber(candidate.presencePenalty, DEFAULT_MODEL_CONFIG.presencePenalty),
      MODEL_CONFIG_LIMITS.presencePenalty.min,
      MODEL_CONFIG_LIMITS.presencePenalty.max,
    ),
    negativePrompt: modelText(candidate.negativePrompt),
  };
}

export function loadModelConfig(characterId: string | undefined): ModelConfig {
  if (!characterId || typeof window === "undefined") {
    return DEFAULT_MODEL_CONFIG;
  }

  try {
    const raw = localStorage.getItem(modelConfigStorageKey(characterId));
    if (!raw) return DEFAULT_MODEL_CONFIG;
    return sanitizeModelConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_MODEL_CONFIG;
  }
}

export function saveModelConfig(characterId: string, config: ModelConfig): ModelConfig {
  const normalized = sanitizeModelConfig(config);
  if (typeof window !== "undefined") {
    localStorage.setItem(modelConfigStorageKey(characterId), JSON.stringify(normalized));
  }
  return normalized;
}

export function notifyModelConfigUpdated(characterId: string, config: ModelConfig): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent<ModelConfigUpdatedDetail>(MODEL_CONFIG_UPDATED_EVENT, {
    detail: {
      characterId,
      config: sanitizeModelConfig(config),
    },
  }));
}
