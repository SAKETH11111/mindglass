export const DEFAULT_MODEL_ID = 'gpt-oss-120b' as const;

export type ModelTier = typeof DEFAULT_MODEL_ID;

export const MODEL_LABEL = 'GPT-OSS 120B';

export function normalizeModelParam(_model?: string | null): ModelTier {
  return DEFAULT_MODEL_ID;
}
