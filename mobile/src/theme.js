// Uygulama genelinde kullanılan ortak renkler.
// Web tarafındaki Tailwind paletiyle (indigo/slate) uyumlu tutuldu.
export const renkler = {
  arka: '#f1f5f9',       // slate-100 — sayfa arka planı
  beyaz: '#ffffff',
  kart: '#ffffff',
  kenar: '#e2e8f0',      // slate-200
  metin: '#1e293b',      // slate-800
  metinSoluk: '#64748b', // slate-500
  metinGri: '#94a3b8',   // slate-400
  indigo: '#4f46e5',
  indigoKoyu: '#4338ca',
  mor: '#7c3aed',
  yesil: '#10b981',
  yesilArka: '#ecfdf5',
  kirmizi: '#ef4444',
  kirmiziArka: '#fef2f2',
  turuncu: '#f97316',
  turuncuArka: '#fff7ed',
  sari: '#f59e0b',
  sariArka: '#fffbeb',
};

// Para birimini Türkçe biçimde gösterir: 1234567 -> "₺1.234.567"
export const formatPara = (v) => `₺${(v || 0).toLocaleString('tr-TR')}`;
