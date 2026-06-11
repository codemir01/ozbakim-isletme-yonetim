import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api, { apiHata, API_ORIGIN } from '../api/client';
import { renkler } from '../theme';
import Secici from '../components/Secici';

const oncelikConfig = {
  Yuksek: { label: 'Yüksek', arka: '#fee2e2', yazi: '#b91c1c' },
  Orta: { label: 'Orta', arka: '#ffedd5', yazi: '#c2410c' },
  Dusuk: { label: 'Düşük', arka: '#f1f5f9', yazi: '#475569' },
};
const durumConfig = {
  Bekliyor: { label: 'Bekliyor', arka: '#fef9c3', yazi: '#a16207' },
  Devam: { label: 'Devam Ediyor', arka: '#dbeafe', yazi: '#1d4ed8' },
  Tamamlandi: { label: 'Tamamlandı', arka: '#d1fae5', yazi: '#047857' },
};

// 7 gün sonrası YYYY-MM-DD
const varsayilanTarih = () => new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
const yeniForm = () => ({ gorevAdi: '', gorevDetayi: '', oncelik: 'Orta', atananId: '', musteriId: '', sonTeslimTarihi: varsayilanTarih() });

export default function GorevlerScreen() {
  const [gorevler, setGorevler] = useState([]);
  const [musteriler, setMusteriler] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [filtre, setFiltre] = useState('aktif');

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(yeniForm());
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState('');
  const [fotoYukleniyor, setFotoYukleniyor] = useState({}); // id -> bool
  const [buyukFoto, setBuyukFoto] = useState(null);         // tam ekran gösterilecek resim uri'si

  const veriCek = useCallback(async () => {
    try {
      const res = await api.get('/gorevler');
      setGorevler(res.data.veri ?? []);
    } catch (e) {
      console.error('Görev hata', e);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { veriCek(); }, [veriCek]);

  // Müşteri/personel listeleri sadece form ilk açıldığında çekilir
  async function modalAc() {
    setModal(true);
    if (musteriler.length === 0 || personeller.length === 0) {
      try {
        const [mR, pR] = await Promise.all([
          api.get('/musteriler?sayfa=1&boyut=200'),
          api.get('/gorevler/personeller'),
        ]);
        setMusteriler(mR.data.veri ?? []);
        setPersoneller(pR.data.veri ?? []);
      } catch (e) { console.error('Liste yükleme hata', e); }
    }
  }

  function modalKapat() { setModal(false); setForm(yeniForm()); setHata(''); }

  async function durumGuncelle(id, durum) {
    try {
      await api.put(`/gorevler/${id}/durum`, { durum });
      veriCek();
    } catch (e) { console.error(e); }
  }

  // Teknisyen görevi tamamlarken cihazın kanıt fotoğrafını ÇEKER ve yükler.
  // Fotoğraf zorunlu: kamera iptal edilirse görev tamamlanmaz.
  async function fotoIleTamamla(id) {
    // Kamera izni iste
    const izin = await ImagePicker.requestCameraPermissionsAsync();
    if (!izin.granted) {
      Alert.alert('Kamera izni gerekli', 'Görevi tamamlamak için cihaz fotoğrafı çekilmeli.');
      return;
    }
    // Kamerayı aç
    const sonuc = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (sonuc.canceled || !sonuc.assets?.length) return; // iptal → tamamlanmadı

    const asset = sonuc.assets[0];
    setFotoYukleniyor((p) => ({ ...p, [id]: true }));
    try {
      const formData = new FormData();
      formData.append('foto', { uri: asset.uri, name: 'gorev.jpg', type: 'image/jpeg' });
      await api.put(`/gorevler/${id}/tamamla`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      veriCek();
    } catch (e) {
      Alert.alert('Hata', apiHata(e, 'Fotoğraf yüklenemedi, görev tamamlanamadı.'));
    } finally {
      setFotoYukleniyor((p) => ({ ...p, [id]: false }));
    }
  }

  async function kaydet() {
    if (!form.gorevAdi.trim() || !form.atananId || !form.musteriId || !form.sonTeslimTarihi) {
      setHata('Görev adı, atanan, müşteri ve son tarih zorunludur.');
      return;
    }
    setKaydediliyor(true);
    setHata('');
    try {
      await api.post('/gorevler', {
        gorevAdi: form.gorevAdi,
        gorevDetayi: form.gorevDetayi,
        oncelik: form.oncelik,
        atananId: form.atananId,
        musteriId: form.musteriId,
        sonTeslimTarihi: form.sonTeslimTarihi + 'T00:00:00Z',
      });
      modalKapat();
      veriCek();
    } catch (e) {
      setHata(apiHata(e, 'Görev oluşturulamadı.'));
    } finally {
      setKaydediliyor(false);
    }
  }

  const filtreli = gorevler.filter((g) => {
    if (filtre === 'aktif') return g.durum !== 'Tamamlandi';
    if (filtre === 'tamamlandi') return g.durum === 'Tamamlandi';
    return true;
  });

  const bekleyen = gorevler.filter((g) => g.durum === 'Bekliyor').length;
  const devam = gorevler.filter((g) => g.durum === 'Devam').length;

  function Kart({ item: g }) {
    const onc = oncelikConfig[g.oncelik] || oncelikConfig.Dusuk;
    const dur = durumConfig[g.durum] || durumConfig.Bekliyor;
    return (
      <View style={[s.kart, g.gecikti && { borderColor: '#fecaca' }]}>
        <View style={s.ust}>
          <Text style={s.ad}>{g.gorevAdi}</Text>
          <View style={[s.rozet, { backgroundColor: onc.arka }]}>
            <Text style={[s.rozetYazi, { color: onc.yazi }]}>{onc.label}</Text>
          </View>
        </View>
        {g.gorevDetayi ? <Text style={s.detay}>{g.gorevDetayi}</Text> : null}
        <View style={s.bilgiSatir}>
          {g.musteriAdSoyad ? <Text style={s.kucuk}>🏠 {g.musteriAdSoyad}</Text> : null}
          <Text style={s.kucuk}>👤 {g.atananAdSoyad}</Text>
        </View>
        <View style={s.altSatir}>
          <View style={s.solGrup}>
            <View style={[s.rozet, { backgroundColor: dur.arka }]}>
              <Text style={[s.rozetYazi, { color: dur.yazi }]}>{dur.label}</Text>
            </View>
            {g.sonTeslimTarihi ? (
              <Text style={[s.tarih, g.gecikti && { color: renkler.kirmizi, fontWeight: '700' }]}>
                {g.gecikti ? '⚠ ' : '📅 '}
                {new Date(g.sonTeslimTarihi).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
              </Text>
            ) : null}
          </View>
          {g.durum !== 'Tamamlandi' && (
            <View style={s.butonGrup}>
              {g.durum === 'Bekliyor' && (
                <TouchableOpacity style={s.basla} onPress={() => durumGuncelle(g.id, 'Devam')}>
                  <Text style={s.baslaYazi}>Başla</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.tamamla} onPress={() => fotoIleTamamla(g.id)} disabled={fotoYukleniyor[g.id]}>
                {fotoYukleniyor[g.id]
                  ? <ActivityIndicator size="small" color="#047857" />
                  : <Text style={s.tamamlaYazi}>📷 Tamamla</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tamamlanan görevin kanıt fotoğrafı */}
        {g.tamamlanmaFotografi ? (
          <TouchableOpacity
            style={s.fotoSatir}
            onPress={() => setBuyukFoto(API_ORIGIN + g.tamamlanmaFotografi)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: API_ORIGIN + g.tamamlanmaFotografi }} style={s.fotoKucuk} />
            <View style={{ flex: 1 }}>
              <Text style={s.fotoBaslik}>✅ İş kanıt fotoğrafı</Text>
              {g.tamamlanmaTarihi ? (
                <Text style={s.fotoTarih}>
                  {new Date(g.tamamlanmaTarihi).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              ) : null}
            </View>
            <Text style={s.fotoBuyut}>Büyüt ›</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (yukleniyor) {
    return <View style={s.merkez}><ActivityIndicator size="large" color={renkler.indigo} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: renkler.arka }}>
      <View style={s.ozetSatir}>
        <View style={[s.ozet, { backgroundColor: renkler.indigo }]}>
          <Text style={s.ozetSayi}>{gorevler.length}</Text><Text style={s.ozetEtiket}>Toplam</Text>
        </View>
        <View style={[s.ozet, { backgroundColor: renkler.sari }]}>
          <Text style={s.ozetSayi}>{bekleyen}</Text><Text style={s.ozetEtiket}>Bekleyen</Text>
        </View>
        <View style={[s.ozet, { backgroundColor: '#3b82f6' }]}>
          <Text style={s.ozetSayi}>{devam}</Text><Text style={s.ozetEtiket}>Devam Eden</Text>
        </View>
      </View>

      <View style={s.filtreBar}>
        {[['aktif', 'Aktif'], ['tamamlandi', 'Tamamlanan'], ['hepsi', 'Tümü']].map(([k, l]) => (
          <TouchableOpacity key={k} style={[s.filtre, filtre === k && s.filtreAktif]} onPress={() => setFiltre(k)}>
            <Text style={[s.filtreYazi, filtre === k && s.filtreYaziAktif]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtreli}
        keyExtractor={(g) => String(g.id)}
        renderItem={({ item }) => <Kart item={item} />}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); veriCek(); }} />}
        ListEmptyComponent={<Text style={s.bos}>Bu filtrede görev yok.</Text>}
      />

      <TouchableOpacity style={s.fab} onPress={modalAc} activeOpacity={0.85}>
        <Text style={s.fabYazi}>+</Text>
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={modalKapat}>
        <KeyboardAvoidingView style={s.modalArka} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalKart}>
            <View style={s.modalBaslikBar}>
              <Text style={s.modalBaslik}>Yeni Görev</Text>
              <TouchableOpacity onPress={modalKapat}><Text style={s.kapat}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.etiket}>Görev Adı *</Text>
              <TextInput style={s.input} value={form.gorevAdi} onChangeText={(t) => setForm({ ...form, gorevAdi: t })} placeholder="Örn. Klima bakımı" placeholderTextColor={renkler.metinGri} />

              <Text style={s.etiket}>Detay</Text>
              <TextInput style={[s.input, { height: 64, textAlignVertical: 'top' }]} value={form.gorevDetayi} onChangeText={(t) => setForm({ ...form, gorevDetayi: t })} placeholder="Açıklama (opsiyonel)" placeholderTextColor={renkler.metinGri} multiline />

              <Text style={s.etiket}>Öncelik</Text>
              <View style={s.oncelikSatir}>
                {[['Dusuk', 'Düşük'], ['Orta', 'Orta'], ['Yuksek', 'Yüksek']].map(([k, l]) => (
                  <TouchableOpacity key={k} style={[s.oncelikBtn, form.oncelik === k && s.oncelikAktif]} onPress={() => setForm({ ...form, oncelik: k })}>
                    <Text style={[s.oncelikYazi, form.oncelik === k && { color: '#fff' }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Secici
                etiket="Atanan Personel *"
                secili={form.atananId}
                onSec={(id) => setForm({ ...form, atananId: id })}
                secenekler={personeller.map((p) => ({ id: p.id, label: `${p.adSoyad}${p.rol ? ` (${p.rol})` : ''}` }))}
                placeholder="Personel seçin"
              />
              <Secici
                etiket="Müşteri *"
                secili={form.musteriId}
                onSec={(id) => setForm({ ...form, musteriId: id })}
                secenekler={musteriler.map((m) => ({ id: m.id, label: `${m.ad} ${m.soyad}` }))}
                placeholder="Müşteri seçin"
              />

              <Text style={s.etiket}>Son Teslim Tarihi * (YYYY-AA-GG)</Text>
              <TextInput style={s.input} value={form.sonTeslimTarihi} onChangeText={(t) => setForm({ ...form, sonTeslimTarihi: t })} placeholder="2026-06-20" placeholderTextColor={renkler.metinGri} />

              {hata ? <Text style={s.hata}>{hata}</Text> : null}

              <TouchableOpacity style={s.kaydetBtn} onPress={kaydet} disabled={kaydediliyor}>
                {kaydediliyor ? <ActivityIndicator color="#fff" /> : <Text style={s.kaydetYazi}>Oluştur</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Kanıt fotoğrafı tam ekran görüntüleyici */}
      <Modal visible={!!buyukFoto} transparent animationType="fade" onRequestClose={() => setBuyukFoto(null)}>
        <TouchableOpacity style={s.buyukArka} activeOpacity={1} onPress={() => setBuyukFoto(null)}>
          {buyukFoto ? <Image source={{ uri: buyukFoto }} style={s.buyukResim} resizeMode="contain" /> : null}
          <Text style={s.buyukKapat}>Kapatmak için dokun</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  merkez: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: renkler.arka },
  ozetSatir: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  ozet: { flex: 1, borderRadius: 14, padding: 14 },
  ozetSayi: { color: '#fff', fontSize: 22, fontWeight: '800' },
  ozetEtiket: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  filtreBar: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: renkler.kenar, gap: 4 },
  filtre: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filtreAktif: { backgroundColor: renkler.indigo },
  filtreYazi: { fontSize: 12, fontWeight: '600', color: renkler.metinSoluk },
  filtreYaziAktif: { color: '#fff' },
  kart: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: renkler.kenar },
  ust: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  ad: { flex: 1, fontSize: 14, fontWeight: '800', color: renkler.metin },
  detay: { fontSize: 12, color: renkler.metinSoluk, marginTop: 6 },
  bilgiSatir: { flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' },
  kucuk: { fontSize: 12, color: renkler.metinSoluk },
  altSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  solGrup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  rozet: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rozetYazi: { fontSize: 11, fontWeight: '700' },
  tarih: { fontSize: 11, color: renkler.metinSoluk },
  butonGrup: { flexDirection: 'row', gap: 6 },
  basla: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  baslaYazi: { color: '#1d4ed8', fontSize: 12, fontWeight: '700' },
  tamamla: { backgroundColor: '#d1fae5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, minWidth: 96, alignItems: 'center' },
  tamamlaYazi: { color: '#047857', fontSize: 12, fontWeight: '700' },
  bos: { textAlign: 'center', color: renkler.metinGri, marginTop: 40 },
  // Kanıt fotoğrafı (tamamlanan kartta)
  fotoSatir: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  fotoKucuk: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#e2e8f0' },
  fotoBaslik: { fontSize: 12, fontWeight: '700', color: '#047857' },
  fotoTarih: { fontSize: 11, color: renkler.metinSoluk, marginTop: 2 },
  fotoBuyut: { fontSize: 12, color: renkler.indigo, fontWeight: '600' },
  // Tam ekran görüntüleyici
  buyukArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  buyukResim: { width: '100%', height: '80%' },
  buyukKapat: { color: '#fff', fontSize: 13, marginTop: 16, opacity: 0.8 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: renkler.indigo, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabYazi: { color: '#fff', fontSize: 30, fontWeight: '300', marginTop: -2 },
  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalKart: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalBaslikBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalBaslik: { fontSize: 18, fontWeight: '800', color: renkler.metin },
  kapat: { fontSize: 18, color: renkler.metinSoluk, padding: 4 },
  etiket: { fontSize: 13, fontWeight: '600', color: renkler.metin, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: renkler.kenar, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: renkler.metin, backgroundColor: '#f8fafc' },
  oncelikSatir: { flexDirection: 'row', gap: 8 },
  oncelikBtn: { flex: 1, borderWidth: 1, borderColor: renkler.kenar, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f8fafc' },
  oncelikAktif: { backgroundColor: renkler.indigo, borderColor: renkler.indigo },
  oncelikYazi: { fontSize: 13, fontWeight: '700', color: renkler.metinSoluk },
  hata: { color: renkler.kirmizi, backgroundColor: renkler.kirmiziArka, padding: 10, borderRadius: 10, marginTop: 12, fontSize: 13 },
  kaydetBtn: { backgroundColor: renkler.indigo, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18, marginBottom: 10 },
  kaydetYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
