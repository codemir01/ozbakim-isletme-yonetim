import { useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';

export default function RaporlarPage() {
  const mevcutYil = new Date().getFullYear();
  const mevcutAy = new Date().getMonth() + 1;

  const [yil, setYil] = useState(mevcutYil);
  const [ay, setAy] = useState(mevcutAy);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);
  const [excelYukleniyor, setExcelYukleniyor] = useState(false);

  const aylar = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  // PDF indir — Axios ile blob olarak al, tarayıcıda indir
  async function pdfIndir() {
    setPdfYukleniyor(true);
    try {
      const res = await api.get(`/raporlar/aylik-ozet?yil=${yil}&ay=${ay}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aylik-ozet-${yil}-${String(ay).padStart(2, '0')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('PDF oluşturulurken hata oluştu.');
    } finally {
      setPdfYukleniyor(false);
    }
  }

  // Excel indir
  async function excelIndir() {
    setExcelYukleniyor(true);
    try {
      const res = await api.get('/raporlar/musteriler-excel', {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `musteriler-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Excel oluşturulurken hata oluştu.');
    } finally {
      setExcelYukleniyor(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Aylık Özet PDF */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Aylık Özet Raporu</h3>
              <p className="text-sm text-slate-500">Satış, gelir/gider ve bakım istatistikleri — PDF formatında</p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Yıl</label>
              <select
                value={yil}
                onChange={e => setYil(Number(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[mevcutYil - 1, mevcutYil, mevcutYil + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ay</label>
              <select
                value={ay}
                onChange={e => setAy(Number(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {aylar.map((a, i) => (
                  <option key={i + 1} value={i + 1}>{a}</option>
                ))}
              </select>
            </div>
            <button
              onClick={pdfIndir}
              disabled={pdfYukleniyor}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {pdfYukleniyor ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {pdfYukleniyor ? 'Hazırlanıyor...' : 'PDF İndir'}
            </button>
          </div>
        </div>

        {/* Müşteri Listesi Excel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Müşteri Listesi</h3>
              <p className="text-sm text-slate-500">Tüm müşteri bilgileri ve borç/tahsilat durumu — Excel formatında</p>
            </div>
          </div>

          <button
            onClick={excelIndir}
            disabled={excelYukleniyor}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {excelYukleniyor ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {excelYukleniyor ? 'Hazırlanıyor...' : 'Müşteri Listesi Excel İndir'}
          </button>
        </div>

      </div>
    </Layout>
  );
}
