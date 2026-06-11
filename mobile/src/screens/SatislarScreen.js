import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, ScrollView, Switch,
} from 'react-native';
import api, { apiHata } from '../api/client';
import { renkler, formatPara } from '../theme';
import Secici from '../components/Secici';

const bosForm = { musteriId: '', urunId: '', satisFiyati: '', bakimTakibiAktif: false };

export default function SatislarScreen() {
  const [satislar, setSatislar] = useState([]);
  const [ozet, setOzet] = useState({});
  const [musteriler, setMusteriler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [arama, setArama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(bosForm);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState('');

  const veriCek = useCallback(async () => {
    try {
      const [satisR, ozetR] = await Promise.allSettled([
        api.get('/satislar?sayfa=1&boyut=100'),
        api.get('/satislar/ozet'),
      ]);
      if (satisR.status === 'fulfilled') setSatislar(satisR.value.data.veri ?? []);
      if (ozetR.status === 'fulfilled') setOzet(ozetR.value.data.veri ?? {});
    } catch (e) {
      console.error('Satış hata', e);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { veriCek(); }, [veriCek]);

  // Müşteri/ürün listeleri sadece form ilk açıldığında çekilir (boşuna yük olmasın)
  async function modalAc() {
    setModal(true);
    if (musteriler.length === 0 || urunler.length === 0) {
      try {
        const [mR, uR] = await Promise.all([
          api.get('/musteriler?sayfa=1&boyut=200'),
          api.get('/urunler'),
        ]);
        setMusteriler(mR.data.veri ?? []);
        setUrunler(uR.data.veri ?? []);
      } catch (e) { console.error('Liste yükleme hata', e); }
    }
  }

  function modalKapat() { setModal(false); setForm(bosForm); setHata(''); }

  // Ürün seçilince satış fiyatını ürünün alış fiyatıyla öner
  function urunSec(urunId) {
    const u = urunler.find((x) => String(x.id) === String(urunId));
    setForm((f) => ({ ...f, urunId, satisFiyati: f.satisFiyati || String(u?.alisFiyati ?? '') }));
  }

  async function kaydet() {
    if (!form.musteriId || !form.urunId || !form.satisFiyati) {
      setHata('Müşteri, ürün ve satış fiyatı zorunludur.');
      return;
    }
    setKaydediliyor(true);
    setHata('');
    try {
      await api.post('/satislar', {
        musteriId: form.musteriId,
        urunId: form.urunId,
        satisFiyati: Number(form.satisFiyati),
        bakimTakibiAktif: form.bakimTakibiAktif,
        montajTarihi: form.bakimTakibiAktif ? new Date().toISOString() : null,
        bakimAraligi: form.bakimTakibiAktif ? 180 : null,
      });
      modalKapat();
      veriCek();
    } catch (e) {
      setHata(apiHata(e, 'Satış kaydedilemedi.'));
    } finally {
      setKaydediliyor(false);
    }
  }

  const filtreli = arama.trim()
    ? satislar.filter((s) =>
        (s.musteriAdSoyad || '').toLowerCase().includes(arama.toLowerCase()) ||
        (s.urunAdi || '').toLowerCase().includes(arama.toLowerCase()))
    : satislar;

  function Kart({ item: x }) {
    return (
      <View style={s.kart}>
        <View style={s.ust}>
          <View style={s.avatar}><Text style={s.avatarYazi}>{x.musteriAdSoyad?.[0] ?? '?'}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.ad}>{x.musteriAdSoyad}</Text>
            <Text style={s.urun}>{x.urunAdi}</Text>
          </View>
          <Text style={s.fiyat}>{formatPara(x.satisFiyati)}</Text>
        </View>
        <View style={s.alt}>
          <Text style={s.kucuk}>👤 {x.personelAdSoyad}</Text>
          <Text style={s.kucuk}>
            {new Date(x.satisTarihi).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
          {x.bakimTakibiAktif ? <View style={s.bakimRozet}><Text style={s.bakimYazi}>● Bakım Aktif</Text></View> : null}
        </View>
      </View>
    );
  }

  if (yukleniyor) {
    return <View style={s.merkez}><ActivityIndicator size="large" color={renkler.indigo} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: renkler.arka }}>
      <View style={s.ozetIzgara}>
        <View style={[s.ozetKutu, { backgroundColor: '#3b82f6' }]}>
          <Text style={s.ozetSayi}>{ozet.toplam || 0}</Text><Text style={s.ozetEtiket}>Toplam Satış</Text>
        </View>
        <View style={[s.ozetKutu, { backgroundColor: renkler.yesil }]}>
          <Text style={s.ozetSayi}>{ozet.aylikSatis || 0}</Text><Text style={s.ozetEtiket}>Bu Ay</Text>
        </View>
        <View style={[s.ozetKutu, { backgroundColor: '#8b5cf6' }]}>
          <Text style={s.ozetSayi}>{ozet.haftalikSatis || 0}</Text><Text style={s.ozetEtiket}>Bu Hafta</Text>
        </View>
        <View style={[s.ozetKutu, { backgroundColor: renkler.sari }]}>
          <Text style={[s.ozetSayi, { fontSize: 16 }]}>{formatPara(ozet.toplamCiro)}</Text><Text style={s.ozetEtiket}>Toplam Ciro</Text>
        </View>
      </View>

      <View style={s.aramaKutu}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput style={s.aramaInput} placeholder="Müşteri veya ürün ara..." placeholderTextColor={renkler.metinGri} value={arama} onChangeText={setArama} />
        <Text style={s.sayac}>{filtreli.length}</Text>
      </View>

      <FlatList
        data={filtreli}
        keyExtractor={(x) => String(x.id)}
        renderItem={({ item }) => <Kart item={item} />}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); veriCek(); }} />}
        ListEmptyComponent={<Text style={s.bos}>Satış kaydı bulunamadı.</Text>}
      />

      <TouchableOpacity style={s.fab} onPress={modalAc} activeOpacity={0.85}>
        <Text style={s.fabYazi}>+</Text>
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={modalKapat}>
        <KeyboardAvoidingView style={s.modalArka} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalKart}>
            <View style={s.modalBaslikBar}>
              <Text style={s.modalBaslik}>Yeni Satış</Text>
              <TouchableOpacity onPress={modalKapat}><Text style={s.kapat}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Secici
                etiket="Müşteri *"
                secili={form.musteriId}
                onSec={(id) => setForm({ ...form, musteriId: id })}
                secenekler={musteriler.map((m) => ({ id: m.id, label: `${m.ad} ${m.soyad}` }))}
                placeholder="Müşteri seçin"
              />
              <Secici
                etiket="Ürün *"
                secili={form.urunId}
                onSec={urunSec}
                secenekler={urunler.map((u) => ({ id: u.id, label: u.urunAdi }))}
                placeholder="Ürün seçin"
              />
              <Text style={s.etiket}>Satış Fiyatı (₺) *</Text>
              <TextInput style={s.input} value={String(form.satisFiyati)} onChangeText={(t) => setForm({ ...form, satisFiyati: t })} placeholder="0" placeholderTextColor={renkler.metinGri} keyboardType="numeric" />

              <View style={s.switchSatir}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchBaslik}>Bakım Takibi</Text>
                  <Text style={s.switchAlt}>Açılırsa otomatik bakım kartı oluşur (180 gün)</Text>
                </View>
                <Switch
                  value={form.bakimTakibiAktif}
                  onValueChange={(v) => setForm({ ...form, bakimTakibiAktif: v })}
                  trackColor={{ true: renkler.indigo }}
                />
              </View>

              {hata ? <Text style={s.hata}>{hata}</Text> : null}

              <TouchableOpacity style={s.kaydetBtn} onPress={kaydet} disabled={kaydediliyor}>
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
  ozetIzgara: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, paddingBottom: 8 },
  ozetKutu: { width: '47.5%', borderRadius: 14, padding: 14 },
  ozetSayi: { color: '#fff', fontSize: 24, fontWeight: '800' },
  ozetEtiket: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  aramaKutu: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, borderColor: renkler.kenar,
  },
  aramaInput: { flex: 1, fontSize: 14, color: renkler.metin },
  sayac: { fontSize: 13, fontWeight: '700', color: renkler.metinSoluk },
  kart: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: renkler.kenar },
  ust: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  avatarYazi: { color: renkler.indigo, fontWeight: '800', fontSize: 14 },
  ad: { fontSize: 14, fontWeight: '700', color: renkler.metin },
  urun: { fontSize: 13, color: renkler.metinSoluk, marginTop: 2 },
  fiyat: { fontSize: 15, fontWeight: '800', color: renkler.metin },
  alt: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexWrap: 'wrap' },
  kucuk: { fontSize: 12, color: renkler.metinSoluk },
  bakimRozet: { backgroundColor: renkler.yesilArka, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  bakimYazi: { fontSize: 11, color: '#047857', fontWeight: '700' },
  bos: { textAlign: 'center', color: renkler.metinGri, marginTop: 40 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: renkler.indigo, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabYazi: { color: '#fff', fontSize: 30, fontWeight: '300', marginTop: -2 },
  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalKart: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  modalBaslikBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalBaslik: { fontSize: 18, fontWeight: '800', color: renkler.metin },
  kapat: { fontSize: 18, color: renkler.metinSoluk, padding: 4 },
  etiket: { fontSize: 13, fontWeight: '600', color: renkler.metin, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: renkler.kenar, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: renkler.metin, backgroundColor: '#f8fafc' },
  switchSatir: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  switchBaslik: { fontSize: 14, fontWeight: '700', color: renkler.metin },
  switchAlt: { fontSize: 11, color: renkler.metinSoluk, marginTop: 2 },
  hata: { color: renkler.kirmizi, backgroundColor: renkler.kirmiziArka, padding: 10, borderRadius: 10, marginTop: 12, fontSize: 13 },
  kaydetBtn: { backgroundColor: renkler.indigo, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18, marginBottom: 10 },
  kaydetYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
