import { productionSupabase } from '../../src/core/services/productionSupabase';

export interface AssistantEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  AI_ALLOWED_USER_IDS?: string;
}

export function getAssistantConfig(env: AssistantEnv, request?: Request) {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const allowedUsers = new Set(env.AI_ALLOWED_USER_IDS?.split(',').map((id) => id.trim()).filter(Boolean));
  let supabaseUrl = env.SUPABASE_URL?.trim();
  let publishableKey = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl && !publishableKey && request && new URL(request.url).origin === 'https://dijital-evren.pages.dev') {
    ({ url: supabaseUrl, publishableKey } = productionSupabase);
  }
  if (!apiKey || !allowedUsers.size || !supabaseUrl || !publishableKey || publishableKey.startsWith('sb_secret_')) return null;

  try {
    const authUrl = new URL('/auth/v1/user', supabaseUrl);
    if (authUrl.protocol !== 'https:' || authUrl.username || authUrl.password) return null;
    return { apiKey, allowedUsers, authUrl, publishableKey, model: env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite' };
  } catch {
    return null;
  }
}

export const onRequestGet = ({ env, request }: { env: AssistantEnv; request?: Request }) => Response.json({
  status: 'ok', app: 'Dijital Evrenim', aiConfigured: Boolean(getAssistantConfig(env, request)),
}, { headers: { 'Cache-Control': 'no-store' } });
