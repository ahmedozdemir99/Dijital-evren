import { createClient } from '@supabase/supabase-js';
import type { ExportBundle } from '../types/entities';

import { productionSupabase } from './productionSupabase';

const overrideUrl = import.meta.env?.VITE_SUPABASE_URL?.trim();
const overrideKey = (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)?.trim();
const useProductionConfig = import.meta.env?.PROD && !overrideUrl && !overrideKey;
const url = useProductionConfig ? productionSupabase.url : overrideUrl;
const key = useProductionConfig ? productionSupabase.publishableKey : overrideKey;

function cloudClient() {
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) return null;
    if (key.startsWith('sb_secret_')) return null;
    if (!key.startsWith('sb_publishable_')) {
      const payload = JSON.parse(atob(key.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role !== 'anon') return null;
    }
    return createClient(url, key);
  } catch {
    return null;
  }
}

export const supabase = cloudClient();

export interface CloudBackup {
  revision: number;
  created_at: string;
}

export async function listBackups(): Promise<CloudBackup[]> {
  if (!supabase) throw new Error('Supabase yapılandırması eksik.');
  const { data, error } = await supabase.from('dijital_evren_backups')
    .select('revision,created_at').order('revision', { ascending: false }).limit(20);
  if (error) throw new Error('Bulut yedekleri okunamadı. Oturumu ve veri tabanı kurulumunu kontrol edin.');
  return data;
}

export async function readBackup(revision: number): Promise<ExportBundle> {
  if (!supabase) throw new Error('Supabase yapılandırması eksik.');
  const { data, error } = await supabase.from('dijital_evren_backups')
    .select('bundle').eq('revision', revision).single();
  if (error) throw new Error('Seçilen yedek okunamadı.');
  return data.bundle;
}

export async function writeBackup(bundle: ExportBundle, previousRevision: number): Promise<void> {
  if (!supabase) throw new Error('Supabase yapılandırması eksik.');
  if (new Blob([JSON.stringify(bundle)]).size > 7 * 1024 * 1024) {
    throw new Error('Bulut yedeği 7 MB sınırını aşıyor. Tam veriyi JSON dosyası olarak indirebilirsiniz.');
  }
  const { error } = await supabase.from('dijital_evren_backups').insert({
    revision: previousRevision + 1, bundle,
  });
  if (error?.code === '23505') throw new Error('Başka bir cihaz yeni yedek kaydetti. Eşitlemeyi tekrar başlatın.');
  if (error) throw new Error('Bulut yedeği kaydedilemedi. Yerel kayıtlarınız korunuyor.');
}

export async function requestAssistant(body: object): Promise<Response> {
  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw new Error('Evren Asistanı için Ayarlar sayfasından Supabase oturumu açın.');
  return fetch('/api/ai/assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35000),
  });
}
