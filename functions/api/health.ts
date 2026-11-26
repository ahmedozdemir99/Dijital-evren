export const onRequestGet = ({ env }: { env: { GEMINI_API_KEY?: string } }) => Response.json({ status: 'ok', app: 'Dijital Evrenim', aiConfigured: Boolean(env.GEMINI_API_KEY) });
