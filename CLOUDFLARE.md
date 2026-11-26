# Cloudflare Pages yayını

- GitHub: ahmedozdemir99/Dijital-evren, main
- Framework: Vite
- Build command: npm run build
- Output directory: dist
- Root: repository root
- Node: 22
- HTTPS zorunlu; PWA manifest ve simgeler Vite tarafından üretilir.
- Pages Functions API uç noktaları functions/api altında bulunur. Express sunucusu Pages üzerinde çalıştırılmaz.
- AI endpoint güvenli varsayılan olarak kapalıdır. GEMINI_API_KEY ve AI_ACCESS_TOKEN sunucu sırlarıdır; istemciye gömülmemelidir. Gerçek oturum doğrulaması ve istemci bağlantısı tamamlanana kadar AI kapalı tutulmalıdır.
- GitHub depo adresleri veri senkronizasyonu değildir. Gerçek API veya dışa aktarılan dosya gereklidir.
- Yayın öncesi npm run lint, npx tsx --test src/core/__tests__/core.test.ts ve npm run build çalıştırılmalıdır.
