import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';

export default function LisansPage() {
  const [lisans, setLisans] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    api.get('/lisans')
      .then(res => setLisans(res.data.veri))
      .catch(() => {})
      .finally(() => setYukleniyor(false));
  }, []);

  if (yukleniyor) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  if (!lisans) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto mt-10 bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700 text-center">
          Lisans bilgisi yüklenemedi.
        </div>
      </Layout>
    );
  }

  const toplamGun = Math.max(
    1,
    Math.round((new Date(lisans.bitisTarihi) - new Date(lisans.baslangicTarihi)) / 86400000)
  );
  const kalanGun = Math.max(0, lisans.kalanGun);
  const gecenGun = toplamGun - kalanGun;
  const yuzde = Math.min(100, Math.round((gecenGun / toplamGun) * 100));

  const durumRenk = kalanGun <= 0
    ? 'text-rose-600'
    : kalanGun <= 30
      ? 'text-amber-600'
      : 'text-emerald-600';

  const barRenk = kalanGun <= 0
    ? 'bg-rose-500'
    : kalanGun <= 30
      ? 'bg-amber-500'
      : 'bg-indigo-600';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Durum Kartı */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{lisans.isletmeAdi}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{lisans.adminEposta}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              lisans.aktif
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {lisans.aktif ? 'Aktif' : 'Pasif'}
            </span>
          </div>

          {/* Tarihler */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 font-medium mb-1">Başlangıç Tarihi</p>
              <p className="text-sm font-bold text-slate-900">
                {new Date(lisans.baslangicTarihi).toLocaleDateString('tr-TR')}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 font-medium mb-1">Bitiş Tarihi</p>
              <p className="text-sm font-bold text-slate-900">
                {new Date(lisans.bitisTarihi).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>

          {/* Kalan Gün */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Lisans Kullanımı</span>
              <span className={`text-sm font-bold ${durumRenk}`}>
                {kalanGun <= 0 ? 'Süresi doldu' : `${kalanGun} gün kaldı`}
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barRenk}`}
                style={{ width: `${yuzde}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 text-right">
              {gecenGun} / {toplamGun} gün geçti
            </p>
          </div>
        </div>

      </div>
    </Layout>
  );
}
