import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.get('/api/health', (_req, res) => {
  const aiClient = getGeminiClient();
  res.json({
    status: 'ok',
    app: 'Dijital Evrenim',
    stage: 2,
    aiConfigured: Boolean(aiClient),
    timestamp: new Date().toISOString(),
  });
});

interface AssistRequestBody {
  prompt?: unknown;
  activeModule?: unknown;
  contextSummary?: unknown;
  history?: unknown;
}

const MAX_PROMPT_CHARS = 4000;
const MAX_CONTEXT_CHARS = 8000;
const MAX_MODULE_CHARS = 200;
const MAX_HISTORY_ITEM_CHARS = 1500;

const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
app.use('/api/ai/assist', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let record = ipRequestCounts.get(ip);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + 60000 };
    ipRequestCounts.set(ip, record);
  }
  record.count++;
  if (record.count > 15) {
    res.status(429).json({ error: 'Çok fazla istek gönderildi. Lütfen 1 dakika bekleyin.' });
    return;
  }
  next();
});

app.post('/api/ai/assist', async (req, res) => {
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as AssistRequestBody;
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

  if (!prompt) {
    res.status(400).json({ error: 'Lütfen bir soru veya yönerge girin.' });
    return;
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    res.status(400).json({ error: `İstek metni en fazla ${MAX_PROMPT_CHARS} karakter olabilir.` });
    return;
  }

  const activeModule =
    typeof body.activeModule === 'string' ? body.activeModule.trim().slice(0, MAX_MODULE_CHARS) : '';
  const contextSummary =
    typeof body.contextSummary === 'string'
      ? body.contextSummary.trim().slice(0, MAX_CONTEXT_CHARS)
      : '';

  const safeHistory = Array.isArray(body.history)
    ? body.history
        .slice(-6)
        .filter(
          (item): item is { role: 'user' | 'model'; text: string } =>
            Boolean(item) &&
            typeof item === 'object' &&
            ((item as { role?: unknown }).role === 'user' ||
              (item as { role?: unknown }).role === 'model') &&
            typeof (item as { text?: unknown }).text === 'string' &&
            (item as { text: string }).text.trim().length > 0
        )
        .map((item) => ({
          role: item.role,
          text: item.text.trim().slice(0, MAX_HISTORY_ITEM_CHARS),
        }))
    : [];

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      configured: false,
      error:
        'Yapay zekâ servisi şu anda sunucuda yapılandırılmamış. Temel modüller ve yerel bilgi akışı tam olarak çalışmaya devam etmektedir.',
    });
    return;
  }

  const systemInstruction = [
    'Sen "Dijital Evrenim" kişisel bilgi, düşünce ve yaşam ekosisteminin Evren Asistanısın.',
    'Türkçe, ölçülü, entelektüel, açık ve kaynaklara saygılı bir dille yanıt ver.',
    'Kullanıcının kendi kayıtlarından gelen bilgiler ile senin ürettiğin öneri/yorumları kesin biçimde ayır.',
    'Kullanıcı onayı olmadan hiçbir kaydın değiştirilmeyeceğini veya silinmeyeceğini unutma; yalnızca öneri sun.',
    'Eğer kesin tarihsel/dinî kaynak verilmiyorsa uydurma kaynak yazma; emin olmadığın noktaları açıkça belirt.',
    activeModule ? `Aktif modül bağlamı: ${activeModule}` : '',
    contextSummary ? `Kullanıcının izin verdiği güncel bağlam özeti:\n${contextSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const historyParts = safeHistory
      .map((item) => `${item.role === 'user' ? 'Kullanıcı' : 'Evren Asistanı'}: ${item.text}`)
      .join('\n');

    const fullContents = historyParts
      ? `${historyParts}\nKullanıcı: ${prompt}`
      : prompt;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: fullContents,
      config: {
        systemInstruction,
      },
    });

    res.json({
      configured: true,
      reply: response.text ?? 'Yanıt üretilemedi.',
      generatedNotice: 'Bu yanıt yapay zekâ tarafından üretilmiştir; kaynaklı kişisel kayıtlarınızdan ayrıdır.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen sunucu hatası';
    console.error('Gemini API error:', message);
    res.status(502).json({
      configured: true,
      error: `Yapay zekâ servisi yanıt veremedi: ${message}`,
    });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const allowedHosts = ['.run.app'];
    if (process.env.APP_URL) {
      try {
        allowedHosts.push(new URL(process.env.APP_URL).hostname);
      } catch {
        // Ignore invalid APP_URL
      }
    }
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        ws: { server: httpServer },
        allowedHosts,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Dijital Evrenim sunucusu http://0.0.0.0:${PORT} adresinde çalışıyor.`);
  });
}

startServer();
