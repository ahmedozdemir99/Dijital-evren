export interface AssistantEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  AI_ALLOWED_USER_IDS?: string;
}

export function isAssistantConfigured(env: AssistantEnv): boolean {
  return Boolean(env.GEMINI_API_KEY?.trim() && env.SUPABASE_URL?.trim() &&
    env.SUPABASE_PUBLISHABLE_KEY?.trim() && env.AI_ALLOWED_USER_IDS?.trim());
}

export const onRequestGet = ({ env }: { env: AssistantEnv }) => Response.json({
  status: 'ok', app: 'Dijital Evrenim', aiConfigured: isAssistantConfigured(env),
}, { headers: { 'Cache-Control': 'no-store' } });
