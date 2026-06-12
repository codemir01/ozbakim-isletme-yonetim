import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import api, { apiHata } from '../api/client';
import { renkler } from '../theme';

// Gün durumuna göre renk/etiket (web'deki durumBilgi ile aynı mantık)
function durumBilgi(gunKaldi, gecmis) {
  if (gecmis) return { label: 'Gecikmiş', arka: '#fee2e2', yazi: '#b91c1c' };
  if (gunKaldi <= 3) return { label: `${gunKaldi} gün kaldı`, arka: '#ffedd5', yazi: '#c2410c' };
  if (gunKaldi <= 7) return { label: `${gunKaldi} gün kaldı`, arka: '#fef9c3', yazi: '#a16207' };
  return { label: `${gunKaldi} gün kaldı`, arka: '#d1fae5', yazi: '#047857' };
}

// AI risk seviyesine göre renk
const riskRenk = {
  'Düşük': { arka: '#d1fae5', yazi: '#047857' },
  'Orta': { arka: '#fef3c7', yazi: '#b45309' },
  'Yüksek': { arka: '#fee2e2', yazi: '#b91c1c' },
  'Hata': { arka: '#f1f5f9', yazi: '#64748b' },
};

const bugunISO = () => new Date().toISOString().split('T')[0];

export default function BakimScreen() {
  const [bakimlar, setBakimlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [filtre, setFiltre] = useState('hepsi'); // hepsi | yaklasan | gecmis
  // Her kart için risk sonucu ve yükleniyor durumu (id -> değer)
  const [riskler, setRiskler] = useState({});
  const [riskYukleniyor, setRiskYukleniyor] = useState({});

  // "Bakım Yapıldı" kayıt modalı
  const [gecmisModal, setGecmisModal] = useState(null); // bakım id
  const [gecmisForm, setGecmisForm] = useState({ aciklama: '', yapilmaTarihi: bugunISO(), yeniBakimAraligiGun: '180' });
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [gecmisHata, setGecmisHata] = useState('');

  const veriCek = useCallback(async () => {
    try {
      const res = await api.get('/bakim');
      setBakimlar(res.data.veri ?? []);
    } catch (e) {
      console.error('Bakım hata', e);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { veriCek(); }, [veriCek]);

  async function riskTahminiAl(id) {
    setRiskYukleniyor((p) => ({ ...p, [id]: true }));
    try {
      const res = await api.get(`/bakim/${id}/risk-tahmini`);
      setRiskler((p) => ({ ...p, [id]: res.data.veri }));
    } catch {
      setRiskler((p) => ({ ...p, [id]: { risk: 'Hata', olasilik: 0 } }));
    } finally {
      setRiskYukleniyor((p) => ({ ...p, [id]: false }));
    }
  }

  function gecmisAc(id) {
    setGecmisModal(id);
    setGecmisForm({ aciklama: '', yapilmaTarihi: bugunISO(), yeniBakimAraligiGun: '180' });
    setGecmisHata('');
  }

  async function gecmisKaydet() {
    if (!gecmisForm.aciklama.trim()) {
      setGecmisHata('Yapılan işlem açıklaması zorunludur.');
      return;
    }
    setKaydediliyor(true);
    setGecmisHata('');
    try {
      await api.post(`/bakim/${gecmisModal}/gecmis`, {
        aciklama: gecmisForm.aciklama,
        yapilmaTarihi: gecmisForm.yapilmaTarihi + 'T00:00:00Z',
        yeniBakimAraligiGun: Number(gecmisForm.yeniBakimAraligiGun) || 180,
      });
      setGecmisModal(null);
      veriCek();
    } catch (e) {
      setGecmisHata(apiHata(e, 'Bakım kaydı eklenemedi.'));
    } finally {
      setKaydediliyor(false);
    }
  }

  const filtreli = bakimlar.filter((b) => {
    if (filtre === 'yaklasan') return !b.gecmis && b.gunKaldi <= 7;
    if (filtre === 'gecmis') return b.gecmis;
    return true;
  });

  function Kart({ item: b }) {
    const durum = durumBilgi(b.gunKaldi, b.gecmis);
    const risk = riskler[b.id];
    const rRenk = risk ? (riskRenk[risk.risk] || riskRenk['Hata']) : null;
    return (
      <View style={s.kart}>
        <View style={s.ust}>
          <View style={{ flex: 1 }}>
            <Text style={s.ad}>{b.musteriAdSoyad}</Text>
            <Text style={s.tel}>{b.musteriTelefon}</Text>
          </View>
          <View style={[s.durum, { backgroundColor: durum.arka }]}>
            <Text style={[s.durumYazi, { color: durum.yazi }]}>{durum.label}</Text>
          </View>
        </View>

        <View style={[s.tipRozet, b.kartTipi === 'Bakim' ? s.tipMavi : s.tipMor]}>
          <Text style={[s.tipYazi, { color: b.kartTipi === 'Bakim' ? '#2563eb' : '#7c3aed' }]}>
            {b.kartTipi === 'Bakim' ? 'Periyodik Bakım' : 'Servis'}
          </Text>
        </View>

        {b.notlar ? <Text style={s.not}>{b.notlar}</Text> : null}
        {b.musteriAdres ? <Text style={s.adres}>📍 {b.musteriAdres}</Text> : null}

        <View style={s.tarihSatir}>
          <Text style={s.tarih}>Son bakım: {new Date(b.sonBakimTarihi).toLocaleDateString('tr-TR')}</Text>
          <Text style={s.tarih}>Planlanan: {new Date(b.bakimYapilacakTarih).toLocaleDateString('tr-TR')}</Text>
        </View>

        {/* AI Risk Tahmini */}
        {risk ? (
          <View style={[s.riskKutu, { backgroundColor: rRenk.arka }]}>
            <Text style={[s.riskYazi, { color: rRenk.yazi }]}>
              🤖 Arıza Riski: {risk.risk}
              {risk.risk !== 'Hata' ? `  (%${Math.round((risk.olasilik || 0) * 100)})` : ''}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={s.riskBtn}
            onPress={() => riskTahminiAl(b.id)}
            disabled={riskYukleniyor[b.id]}
          >
            {riskYukleniyor[b.id]
              ? <ActivityIndicator color={renkler.indigo} size="small" />
              : <Text style={s.riskBtnYazi}>🤖 AI Risk Tahmini Al</Text>}
          </TouchableOpacity>
        )}

        {/* Bakım Yapıldı — teknisyenin asıl aksiyonu */}
        <TouchableOpacity style={s.yapildiBtn} onPress={() => gecmisAc(b.id)}>
          <Text style={s.yapildiYazi}>✓ Bakım Yapıldı</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (yukleniyor) {
    return (
      <View style={s.merkez}>
        <ActivityIndicator size="large" color={renkler.indigo} />
      </View>
    );
  }

  const yaklasanSayisi = bakimlar.filter((b) => !b.gecmis && b.gunKaldi <= 7).length;
  const gecmisSayisi = bakimlar.filter((b) => b.gecmis).length;

  return (
    <View style={{ flex: 1, backgroundColor: renkler.arka }}>
      {/* Özet bantlar */}
      <View style={s.ozetSatir}>
        <View style={[s.ozet, { backgroundColor: renkler.indigo }]}>
          <Text style={s.ozetSayi}>{bakimlar.length}</Text>
          <Text style={s.ozetEtiket}>Toplam</Text>
        </View>
        <View style={[s.ozet, { backgroundColor: renkler.turuncu }]}>
          <Text style={s.ozetSayi}>{yaklasanSayisi}</Text>
          <Text style={s.ozetEtiket}>7 Gün İçinde</Text>
        </View>
        <View style={[s.ozet, { backgroundColor: renkler.kirmizi }]}>
          <Text style={s.ozetSayi}>{gecmisSayisi}</Text>
          <Text style={s.ozetEtiket}>Gecikmiş</Text>
        </View>
      </View>

      {/* Filtre */}
      <View style={s.filtreBar}>
        {[['hepsi', 'Tümü'], ['yaklasan', '7 Gün'], ['gecmis', 'Gecikmiş']].map(([k, l]) => (
          <TouchableOpacity
            key={k}
            style={[s.filtre, filtre === k && s.filtreAktif]}
            onPress={() => setFiltre(k)}
          >
            <Text style={[s.filtreYazi, filtre === k && s.filtreYaziAktif]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtreli}
        keyExtractor={(b) => String(b.id)}
        renderItem={({ item }) => <Kart item={item} />}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={yenileniyor}
            onRefresh={() => { setYenileniyor(true); veriCek(); }}
          />
        }
        ListEmptyComponent={<Text style={s.bos}>Bu filtrede kayıt yok.</Text>}
      />

      {/* Bakım Yapıldı Modalı */}
      <Modal visible={!!gecmisModal} animationType="slide" transparent onRequestClose={() => setGecmisModal(null)}>
        <KeyboardAvoidingView style={s.modalArka} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalKart}>
            <View style={s.modalBaslikBar}>
              <Text style={s.modalBaslik}>Bakım Yapıldı</Text>
              <TouchableOpacity onPress={() => setGecmisModal(null)}><Text style={s.kapat}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.etiket}>Yapılan İşlemler *</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                value={gecmisForm.aciklama}
                onChangeText={(t) => setGecmisForm({ ...gecmisForm, aciklama: t })}
                placeholder="Yapılan bakım ve değiştirilen parçalar..."
                placeholderTextColor={renkler.metinGri}
                multiline
              />

              <Text style={s.etiket}>Bakım Tarihi (YYYY-AA-GG)</Text>
              <TextInput
                style={s.input}
                value={gecmisForm.yapilmaTarihi}
                onChangeText={(t) => setGecmisForm({ ...gecmisForm, yapilmaTarihi: t })}
                placeholder="2026-06-12"
                placeholderTextColor={renkler.metinGri}
              />

              <Text style={s.etiket}>Sonraki Bakım Aralığı (Gün)</Text>
              <TextInput
                style={s.input}
                value={String(gecmisForm.yeniBakimAraligiGun)}
                onChangeText={(t) => setGecmisForm({ ...gecmisForm, yeniBakimAraligiGun: t })}
                placeholder="180"
                placeholderTextColor={renkler.metinGri}
                keyboardType="numeric"
              />

              {gecmisHata ? <Text style={s.hata}>{gecmisHata}</Text> : null}

              <TouchableOpacity style={s.kaydetBtn} onPress={gecmisKaydet} disabled={kaydediliyor}>
                {kaydediliyor ? <ActivityIndicator color="#fff" /> : <Text style={s.kaydetYazi}>Kaydet</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  merkez: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: renkler.arka },
  ozetSatir: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  ozet: { flex: 1, borderRadius: 14, padding: 14 },
  ozetSayi: { color: '#fff', fontSize: 24, fontWeight: '800' },
  ozetEtiket: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  filtreBar: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: renkler.kenar, gap: 4 },
  filtre: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filtreAktif: { backgroundColor: renkler.indigo },
  filtreYazi: { fontSize: 13, fontWeight: '600', color: renkler.metinSoluk },
  filtreYaziAktif: { color: '#fff' },
  kart: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: renkler.kenar },
  ust: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ad: { fontSize: 15, fontWeight: '800', color: renkler.metin },
  tel: { fontSize: 12, color: renkler.metinGri, marginTop: 2 },
  durum: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  durumYazi: { fontSize: 11, fontWeight: '700' },
  tipRozet: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 10 },
  tipMavi: { backgroundColor: '#dbeafe' },
  tipMor: { backgroundColor: '#ede9fe' },
  tipYazi: { fontSize: 11, fontWeight: '700' },
  not: { fontSize: 12, color: renkler.metinSoluk, marginTop: 8 },
  adres: { fontSize: 12, color: renkler.metinSoluk, marginTop: 8 },
  tarihSatir: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  tarih: { fontSize: 11, color: renkler.metinSoluk },
  riskBtn: { marginTop: 12, borderWidth: 1, borderColor: renkler.indigo, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  riskBtnYazi: { color: renkler.indigo, fontWeight: '700', fontSize: 13 },
  riskKutu: { marginTop: 12, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  riskYazi: { fontWeight: '800', fontSize: 13 },
  yapildiBtn: { marginTop: 10, backgroundColor: renkler.yesil, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  yapildiYazi: { color: '#fff', fontWeight: '800', fontSize: 14 },
  bos: { textAlign: 'center', color: renkler.metinGri, marginTop: 40 },
  // Modal
  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalKart: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  modalBaslikBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalBaslik: { fontSize: 18, fontWeight: '800', color: renkler.metin },
  kapat: { fontSize: 18, color: renkler.metinSoluk, padding: 4 },
  etiket: { fontSize: 13, fontWeight: '600', color: renkler.metin, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: renkler.kenar, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: renkler.metin, backgroundColor: '#f8fafc' },
  hata: { color: renkler.kirmizi, backgroundColor: renkler.kirmiziArka, padding: 10, borderRadius: 10, marginTop: 12, fontSize: 13 },
  kaydetBtn: { backgroundColor: renkler.indigo, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18, marginBottom: 10 },
  kaydetYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
