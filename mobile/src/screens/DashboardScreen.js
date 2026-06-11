import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import api from '../api/client';
import { renkler, formatPara } from '../theme';
import { useAuth } from '../context/AuthContext';

// Üstteki küçük istatistik kartı
function StatKart({ baslik, deger, renk }) {
  return (
    <View style={s.statKart}>
      <Text style={s.statBaslik}>{baslik}</Text>
      <Text style={[s.statDeger, renk && { color: renk }]}>{deger}</Text>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { kullanici, cikisYap } = useAuth();
  const [veri, setVeri] = useState({
    ozet: {}, bakimlar: { gecmis: [], bugun: [], buHafta: [] },
    enCokSatanlar: [], bakimCihazlar: [],
  });
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [sekme, setSekme] = useState('bugun');

  const veriCek = useCallback(async () => {
    try {
      // Promise.allSettled: biri hata verse bile diğerleri gelsin (web ile aynı mantık).
      const [ozetR, bakimR, satanR, cihazR] = await Promise.allSettled([
        api.get('/dashboard/ozet'),
        api.get('/dashboard/yaklasan-bakimlar'),
        api.get('/dashboard/en-cok-satanlar'),
        api.get('/dashboard/bakim-servis-cihazlar'),
      ]);
      const al = (r, varsayilan) =>
        r.status === 'fulfilled' ? (r.value.data?.veri ?? varsayilan) : varsayilan;
      setVeri({
        ozet: al(ozetR, {}),
        bakimlar: al(bakimR, { gecmis: [], bugun: [], buHafta: [] }),
        enCokSatanlar: al(satanR, []),
        bakimCihazlar: al(cihazR, []),
      });
    } catch (e) {
      console.error('Dashboard hata', e);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { veriCek(); }, [veriCek]);

  if (yukleniyor) {
    return (
      <View style={s.merkez}>
        <ActivityIndicator size="large" color={renkler.indigo} />
        <Text style={s.yukleniyorYazi}>İstatistikler hesaplanıyor...</Text>
      </View>
    );
  }

  const { ozet, bakimlar, enCokSatanlar, bakimCihazlar } = veri;
  const kalanBorc = Math.max(0, (ozet.toplamBorc || 0) - (ozet.toplamTahsilat || 0));
  const aktifBakimlar = bakimlar[sekme] || [];

  return (
    <ScrollView
      style={{ backgroundColor: renkler.arka }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); veriCek(); }} />}
    >
      {/* Selamlama + çıkış */}
      <View style={s.ustBar}>
        <View>
          <Text style={s.selam}>Merhaba, {kullanici?.ad} 👋</Text>
          <Text style={s.altSelam}>İşletme Özeti</Text>
        </View>
        <TouchableOpacity style={s.cikisBtn} onPress={cikisYap}>
          <Text style={s.cikisYazi}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* Ciro kartı (vurgulu) */}
      <View style={s.ciroKart}>
        <Text style={s.ciroEtiket}>Toplam Satış Cirosu</Text>
        <Text style={s.ciroDeger}>{formatPara(ozet.toplamCiro)}</Text>
      </View>

      {/* İstatistik ızgarası */}
      <View style={s.izgara}>
        <StatKart baslik="Personel" deger={ozet.personelSayisi || 0} />
        <StatKart baslik="Müşteri" deger={ozet.toplamMusteri || 0} />
        <StatKart baslik="Ürün Çeşidi" deger={ozet.toplamUrun || 0} />
        <StatKart baslik="Toplam Satış" deger={ozet.toplamSatis || 0} />
        <StatKart baslik="Tahsilat" deger={formatPara(ozet.toplamTahsilat)} renk={renkler.yesil} />
        <StatKart baslik="Kalan Borç" deger={formatPara(kalanBorc)} renk={renkler.kirmizi} />
      </View>

      {/* Hızlı Erişim — ekstra sayfalara git */}
      <View style={s.hizliSatir}>
        {[
          { ad: 'Gelir / Gider', ikon: '💰', hedef: 'GelirGider' },
          { ad: 'Faturalar', ikon: '🧾', hedef: 'Faturalar' },
          { ad: 'Profilim', ikon: '👤', hedef: 'Profil' },
        ].map((h) => (
          <TouchableOpacity key={h.hedef} style={s.hizliKart} onPress={() => navigation.navigate(h.hedef)}>
            <Text style={s.hizliIkon}>{h.ikon}</Text>
            <Text style={s.hizliYazi}>{h.ad}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI Arıza Tespiti — yıldız özellik */}
      <TouchableOpacity style={s.aiKart} onPress={() => navigation.navigate('ArizaTespit')} activeOpacity={0.9}>
        <Text style={s.aiIkon}>🔍</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.aiBaslik}>AI Arıza Tespiti</Text>
          <Text style={s.aiAlt}>Cihazın fotoğrafını çek, yapay zeka arızayı söylesin</Text>
        </View>
        <Text style={s.aiOk}>›</Text>
      </TouchableOpacity>

      {/* Yaklaşan bakımlar — sekmeli */}
      <View style={s.panel}>
        <Text style={s.panelBaslik}>Yaklaşan Bakım & Servisler</Text>
        <View style={s.sekmeBar}>
          {[['gecmis', 'Gecikenler'], ['bugun', 'Bugün'], ['buHafta', 'Bu Hafta']].map(([k, l]) => (
            <TouchableOpacity
              key={k}
              style={[s.sekme, sekme === k && s.sekmeAktif]}
              onPress={() => setSekme(k)}
            >
              <Text style={[s.sekmeYazi, sekme === k && s.sekmeYaziAktif]}>
                {l} ({bakimlar[k]?.length || 0})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {aktifBakimlar.length === 0 ? (
          <Text style={s.bos}>Bu kategoride kayıt yok.</Text>
        ) : (
          aktifBakimlar.map((b, i) => (
            <View key={i} style={s.satir}>
              <View style={{ flex: 1 }}>
                <Text style={s.satirAd}>{b.musteriAdi}</Text>
                <Text style={s.satirAlt}>{b.telefon}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[s.rozet, b.kartTipi === 'Bakim' ? s.rozetMavi : s.rozetTuruncu]}>
                  <Text style={[s.rozetYazi, b.kartTipi === 'Bakim' ? { color: '#1d4ed8' } : { color: '#c2410c' }]}>
                    {b.kartTipi}
                  </Text>
                </View>
                <Text style={s.satirTarih}>
                  {new Date(b.bakimYapilacakTarih).toLocaleDateString('tr-TR')}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* En çok satanlar */}
      <View style={s.panel}>
        <Text style={s.panelBaslik}>En Çok Satan Ürünler</Text>
        {enCokSatanlar.length === 0
          ? <Text style={s.bos}>Satış kaydı yok.</Text>
          : enCokSatanlar.slice(0, 10).map((u, i) => (
            <View key={i} style={s.satir}>
              <Text style={s.sira}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.satirAd}>{u.urunAdi}</Text>
                <Text style={s.satirAlt}>{u.kategori}</Text>
              </View>
              <Text style={s.adet}>{u.satisAdedi} adet</Text>
            </View>
          ))}
      </View>

      {/* Bakımı en çok yapılan cihazlar */}
      <View style={s.panel}>
        <Text style={s.panelBaslik}>Bakımı En Çok Yapılanlar</Text>
        {bakimCihazlar.length === 0
          ? <Text style={s.bos}>Bakım kaydı yok.</Text>
          : bakimCihazlar.slice(0, 10).map((c, i) => (
            <View key={i} style={s.satir}>
              <View style={{ flex: 1 }}>
                <Text style={s.satirAd}>{c.cihaz}</Text>
              </View>
              <Text style={[s.adet, { color: renkler.turuncu }]}>{c.adet} kez</Text>
            </View>
          ))}
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  merkez: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: renkler.arka },
  yukleniyorYazi: { marginTop: 12, color: renkler.metinSoluk },
  ustBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  selam: { fontSize: 18, fontWeight: '800', color: renkler.metin },
  altSelam: { fontSize: 13, color: renkler.metinSoluk, marginTop: 2 },
  cikisBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: renkler.kenar, backgroundColor: '#fff' },
  cikisYazi: { color: renkler.metinSoluk, fontWeight: '600', fontSize: 13 },
  ciroKart: { backgroundColor: renkler.indigo, borderRadius: 18, padding: 20, marginBottom: 14 },
  ciroEtiket: { color: '#c7d2fe', fontSize: 13, fontWeight: '500' },
  ciroDeger: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 4 },
  izgara: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  hizliSatir: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  hizliKart: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: renkler.kenar },
  hizliIkon: { fontSize: 24 },
  hizliYazi: { fontSize: 12, fontWeight: '700', color: renkler.metin, marginTop: 6 },
  aiKart: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0f172a', borderRadius: 18, padding: 16, marginBottom: 14 },
  aiIkon: { fontSize: 28 },
  aiBaslik: { color: '#fff', fontSize: 15, fontWeight: '800' },
  aiAlt: { color: '#94a3b8', fontSize: 12, marginTop: 3 },
  aiOk: { color: '#64748b', fontSize: 26, fontWeight: '300' },
  statKart: {
    width: '31%', backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: renkler.kenar,
  },
  statBaslik: { fontSize: 11, color: renkler.metinSoluk, fontWeight: '600', marginBottom: 6 },
  statDeger: { fontSize: 17, fontWeight: '800', color: renkler.metin },
  panel: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: renkler.kenar, marginBottom: 14 },
  panelBaslik: { fontSize: 15, fontWeight: '800', color: renkler.metin, marginBottom: 12 },
  sekmeBar: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 10 },
  sekme: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  sekmeAktif: { backgroundColor: '#fff' },
  sekmeYazi: { fontSize: 12, fontWeight: '600', color: renkler.metinSoluk },
  sekmeYaziAktif: { color: renkler.indigo },
  satir: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 10 },
  satirAd: { fontSize: 14, fontWeight: '600', color: renkler.metin },
  satirAlt: { fontSize: 12, color: renkler.metinSoluk, marginTop: 2 },
  satirTarih: { fontSize: 12, color: renkler.metinSoluk, marginTop: 4 },
  sira: { width: 22, textAlign: 'center', fontWeight: '800', color: renkler.metinGri },
  adet: { fontSize: 13, fontWeight: '800', color: renkler.indigo },
  rozet: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rozetMavi: { backgroundColor: '#dbeafe' },
  rozetTuruncu: { backgroundColor: '#ffedd5' },
  rozetYazi: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  bos: { color: renkler.metinGri, fontSize: 13, textAlign: 'center', paddingVertical: 16 },
});
