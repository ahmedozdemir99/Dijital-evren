interface Env { GEMINI_API_KEY?: string; GEMINI_MODEL?: string; AI_ACCESS_TOKEN?: string }
export const onRequestPost = async ({request, env}: {request: Request; env: Env}) => {
  const reply = (body: object, status = 200) => Response.json(body, {status, headers: {'Cache-Control':'no-store'}});
  if (!env.GEMINI_API_KEY || !env.AI_ACCESS_TOKEN) return reply({configured:false,error:'Yapay zekâ servisi güvenli erişim için yapılandırılmadı.'},503);
  if (request.headers.get('Authorization') !== 'Bearer '+env.AI_ACCESS_TOKEN) return reply({error:'Yetkili oturum gerekli.'},401);
  try {
    const raw = await request.text();
    if (raw.length > 24000) return reply({error:'İstek çok büyük.'},413);
    const body = JSON.parse(raw);
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > 4000) return reply({error:'Geçersiz soru.'},400);
    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent', {
      method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],systemInstruction:{parts:[{text:'Türkçe yanıt ver. Kaynak uydurma. Kişisel kayıtları değiştirme.'}]}})
    });
    if (!res.ok) return reply({error:'Yapay zekâ servisi yanıt veremedi.'},502);
    const data = await res.json() as {candidates?: {content?: {parts?: {text?: string}[]}}[]};
    return reply({configured:true,reply:data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('') || 'Yanıt üretilemedi.'});
  } catch { return reply({error:'İstek işlenemedi.'},400); }
};
