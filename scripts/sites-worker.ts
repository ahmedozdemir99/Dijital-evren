import { onRequestPost } from '../functions/api/ai/assist';
import { onRequestGet, type AssistantEnv } from '../functions/api/health';

interface Env extends AssistantEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health' && request.method === 'GET') return onRequestGet({ env });
    if (url.pathname === '/api/ai/assist' && request.method === 'POST') return onRequestPost({ request, env });
    if (url.pathname.startsWith('/api/')) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });

    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404 || request.method !== 'GET' ||
      !request.headers.get('Accept')?.includes('text/html') || /\.[^/]+$/.test(url.pathname)) return asset;
    return env.ASSETS.fetch(new Request(new URL('/index.html', url), { headers: request.headers }));
  },
};
