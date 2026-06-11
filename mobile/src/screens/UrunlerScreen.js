import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import api, { apiHata } from '../api/client';
import { renkler, formatPara } from '../theme';

const bosForm = { urunAdi: '', kategori: 'Cihaz', stokKodu: '', stokAdedi: '', alisFiyati: '' };

export default function UrunlerScreen() {
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
      const res = await api.get('/urunler');
      setUrunler(res.data.veri ?? []);
    } catch (e) {
      console.error('Ürün hata', e);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { veriCek(); }, [veriCek]);

  function modalKapat() {
    setModal(false);
    setForm(bosForm);
    setHata('');
  }

  async function kaydet() {
    if (!form.urunAdi.trim() || !form.stokKodu.trim()) {
      setHata('Ürün adı ve stok kodu zorunludur.');
      return;
    }
    setKaydediliyor(true);
    setHata('');
    try {
      await api.post('/urunler', {
        urunAdi: form.urunAdi,
        kategori: form.kategori,
        stokKodu: form.stokKodu,
        stokAdedi: Number(form.stokAdedi) || 0,
        alisFiyati: Number(form.alisFiyati) || 0,
      });
      modalKapat();
      veriCek();
    } catch (e) {
      setHata(apiHata(e, 'Ürün kaydedilemedi.'));
    } finally {
      setKaydediliyor(false);
    }
  }

  const filtreli = arama.trim()
    ? urunler.filter((u) =>
        (u.urunAdi || '').toLowerCase().includes(arama.toLowerCase()) ||
        (u.stokKodu || '').toLowerCase().includes(arama.toLowerCase()))
    : urunler;

  const dusukStok = urunler.filter((u) => u.stokAdedi < 5).length;
  const cihaz = urunler.filter((u) => u.kategori === 'Cihaz').length;

  function Kart({ item: u }) {
    const kritik = u.stokAdedi < 5;
    const cihazMi = u.kategori === 'Cihaz';
    return (
      <View style={s.kart}>
        <View style={[s.ikon, { backgroundColor: cihazMi ? '#dbeafe' : '#ede9fe' }]}>
          <Text style={{ fontSize: 18 }}>{cihazMi ? '📦' : '🔧'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.ad}>{u.urunAdi}</Text>
          <View style={s.altSatir}>
            <Text style={[s.kategori, { color: cihazMi ? '#2563eb' : '#7c3aed' }]}>
              {cihazMi ? 'Cihaz' : 'Yedek Parça'}
            </Text>
            <Text style={s.stokKodu}>{u.stokKodu}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.fiyat}>{formatPara(u.alisFiyati)}</Text>
          <View style={[s.stokRozet, kritik ? s.stokKritik : s.stokNormal]}>
            <Text style={[s.stokYazi, { color: kritik ? '#b91c1c' : renkler.metinSoluk }]}>
              {kritik ? '⚠ ' : ''}Stok: {u.stokAdedi}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (yukleniyor) {
    return <View style={s.merkez}><ActivityIndicator size="large" color={renkler.indigo} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: renkler.arka }}>
      <View style={s.ozetSatir}>
        <View style={s.ozetKutu}>
          <Text style={s.ozetSayi}>{urunler.length}</Text>
          <Text style={s.ozetEtiket}>Ürün Çeşidi</Text>
        </View>
        <View style={s.ozetKutu}>
          <Text style={s.ozetSayi}>{cihaz}</Text>
          <Text style={s.ozetEtiket}>Cihaz</Text>
        </View>
        <View style={[s.ozetKutu, dusukStok > 0 && { backgroundColor: renkler.kirmiziArka, borderColor: '#fecaca' }]}>
          <Text style={[s.ozetSayi, dusukStok > 0 && { color: '#b91c1c' }]}>{dusukStok}</Text>
          <Text style={[s.ozetEtiket, dusukStok > 0 && { color: '#b91c1c' }]}>Kritik Stok</Text>
        </View>
      </View>

      <View style={s.aramaKutu}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput
          style={s.aramaInput}
          placeholder="Ürün adı veya stok kodu ara..."
          placeholderTextColor={renkler.metinGri}
          value={arama}
          onChangeText={setArama}
        />
        <Text style={s.sayac}>{filtreli.length}</Text>
      </View>

      <FlatList
        data={filtreli}
        keyExtractor={(u) => String(u.id)}
        renderItem={({ item }) => <Kart item={item} />}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 90 }}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); veriCek(); }} />
        }
        ListEmptyComponent={<Text style={s.bos}>Ürün bulunamadı.</Text>}
      />

      <TouchableOpacity style={s.fab} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Text style={s.fabYazi}>+</Text>
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={modalKapat}>
        <KeyboardAvoidingView style={s.modalArka} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalKart}>
            <View style={s.modalBaslikBar}>
              <Text style={s.modalBaslik}>Yeni Ürün</Text>
              <TouchableOpacity onPress={modalKapat}><Text style={s.kapat}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.etiket}>Ürün Adı *</Text>
              <TextInput style={s.input} value={form.urunAdi} onChangeText={(t) => setForm({ ...form, urunAdi: t })} placeholder="Örn. Arçelik Buzdolabı" placeholderTextColor={renkler.metinGri} />

              <Text style={s.etiket}>Kategori</Text>
              <View style={s.kategoriSatir}>
                {[['Cihaz', 'Cihaz'], ['YedekParca', 'Yedek Parça']].map(([k, l]) => (
                  <TouchableOpacity
                    key={k}
                    style={[s.kategoriBtn, form.kategori === k && s.kategoriAktif]}
                    onPress={() => setForm({ ...form, kategori: k })}
                  >
                    <Text style={[s.kategoriBtnYazi, form.kategori === k && { color: '#fff' }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.etiket}>Stok Kodu *</Text>
              <TextInput style={s.input} value={form.stokKodu} onChangeText={(t) => setForm({ ...form, stokKodu: t })} placeholder="Örn. BZ-100" placeholderTextColor={renkler.metinGri} autoCapitalize="characters" />

              <View style={s.ikiliInput}>
                <View style={{ flex: 1 }}>
                  <Text style={s.etiket}>Stok Adedi</Text>
                  <TextInput style={s.input} value={String(form.stokAdedi)} onChangeText={(t) => setForm({ ...form, stokAdedi: t })} placeholder="0" placeholderTextColor={renkler.metinGri} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.etiket}>Alış Fiyatı (₺)</Text>
                  <TextInput style={s.input} value={String(form.alisFiyati)} onChangeText={(t) => setForm({ ...form, alisFiyati: t })} placeholder="0" placeholderTextColor={renkler.metinGri} keyboardType="numeric" />
                </View>
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
  ozetSatir: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  ozetKutu: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: renkler.kenar },
  ozetSayi: { fontSize: 22, fontWeight: '800', color: renkler.metin },
  ozetEtiket: { fontSize: 11, color: renkler.metinSoluk, fontWeight: '600', marginTop: 2 },
  aramaKutu: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, borderColor: renkler.kenar,
  },
  aramaInput: { flex: 1, fontSize: 14, color: renkler.metin },
  sayac: { fontSize: 13, fontWeight: '700', color: renkler.metinSoluk },
  kart: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: renkler.kenar },
  ikon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ad: { fontSize: 14, fontWeight: '700', color: renkler.metin },
  altSatir: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  kategori: { fontSize: 12, fontWeight: '700' },
  stokKodu: { fontSize: 11, color: renkler.metinGri, fontFamily: 'monospace' },
  fiyat: { fontSize: 14, fontWeight: '800', color: renkler.metin },
  stokRozet: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 6 },
  stokNormal: { backgroundColor: '#f1f5f9' },
  stokKritik: { backgroundColor: renkler.kirmiziArka },
  stokYazi: { fontSize: 11, fontWeight: '700' },
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
  ikiliInput: { flexDirection: 'row', gap: 10 },
  kategoriSatir: { flexDirection: 'row', gap: 10 },
  kategoriBtn: { flex: 1, borderWidth: 1, borderColor: renkler.kenar, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f8fafc' },
  kategoriAktif: { backgroundColor: renkler.indigo, borderColor: renkler.indigo },
  kategoriBtnYazi: { fontSize: 14, fontWeight: '700', color: renkler.metinSoluk },
  hata: { color: renkler.kirmizi, backgroundColor: renkler.kirmiziArka, padding: 10, borderRadius: 10, marginTop: 12, fontSize: 13 },
  kaydetBtn: { backgroundColor: renkler.indigo, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18, marginBottom: 10 },
  kaydetYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
