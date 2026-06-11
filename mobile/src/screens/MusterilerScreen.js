import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import api, { apiHata } from '../api/client';
import { renkler, formatPara } from '../theme';

const avatarRenkleri = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#6366f1'];
const bosForm = { ad: '', soyad: '', telefon: '', adres: '' };

export default function MusterilerScreen() {
  const [musteriler, setMusteriler] = useState([]);
  const [arama, setArama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  // Yeni müşteri modalı
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(bosForm);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState('');

  const veriCek = useCallback(async () => {
    try {
      const res = await api.get('/musteriler?sayfa=1&boyut=200');
      setMusteriler(res.data.veri ?? []);
    } catch (e) {
      console.error('Müşteri hata', e);
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
    if (!form.ad.trim() || !form.soyad.trim() || !form.telefon.trim() || !form.adres.trim()) {
      setHata('Ad, soyad, telefon ve adres zorunludur.');
      return;
    }
    setKaydediliyor(true);
    setHata('');
    try {
      await api.post('/musteriler', { ...form, enlem: null, boylam: null });
      modalKapat();
      veriCek();
    } catch (e) {
      setHata(apiHata(e, 'Müşteri kaydedilemedi.'));
    } finally {
      setKaydediliyor(false);
    }
  }

  function silOnay(m) {
    Alert.alert('Müşteriyi Sil', `${m.ad} ${m.soyad} silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/musteriler/${m.id}`);
            veriCek();
          } catch (e) {
            Alert.alert('Hata', e.response?.data?.hata || 'Müşteri silinemedi.');
          }
        },
      },
    ]);
  }

  const filtreli = arama.trim()
    ? musteriler.filter((m) =>
        (m.ad || '').toLowerCase().includes(arama.toLowerCase()) ||
        (m.soyad || '').toLowerCase().includes(arama.toLowerCase()) ||
        (m.telefon || '').includes(arama))
    : musteriler;

  function Kart({ item, index }) {
    const bakiye = (item.toplamBorc || 0) - (item.toplamTahsilat || 0);
    const avatarBg = avatarRenkleri[index % avatarRenkleri.length];
    return (
      <TouchableOpacity style={s.kart} onLongPress={() => silOnay(item)} delayLongPress={400} activeOpacity={0.8}>
        <View style={s.ust}>
          <View style={[s.avatar, { backgroundColor: avatarBg }]}>
            <Text style={s.avatarYazi}>{(item.ad?.[0] || '') + (item.soyad?.[0] || '')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ad}>{item.ad} {item.soyad}</Text>
            <Text style={s.tel}>{item.telefon}</Text>
          </View>
          <View style={[s.bakiyeRozet, bakiye > 0 ? s.borcVar : s.borcYok]}>
            <Text style={[s.bakiyeYazi, { color: bakiye > 0 ? '#be123c' : '#047857' }]}>
              {bakiye > 0 ? formatPara(bakiye) : 'Borçsuz'}
            </Text>
          </View>
        </View>
        {item.adres ? <Text style={s.adres}>📍 {item.adres}</Text> : null}
        <View style={s.finansSatir}>
          <View style={s.finansKutu}>
            <Text style={s.finansEtiket}>Borç</Text>
            <Text style={[s.finansDeger, { color: renkler.kirmizi }]}>{formatPara(item.toplamBorc)}</Text>
          </View>
          <View style={s.finansKutu}>
            <Text style={s.finansEtiket}>Tahsilat</Text>
            <Text style={[s.finansDeger, { color: renkler.yesil }]}>{formatPara(item.toplamTahsilat)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (yukleniyor) {
    return <View style={s.merkez}><ActivityIndicator size="large" color={renkler.indigo} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: renkler.arka }}>
      <View style={s.aramaKutu}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput
          style={s.aramaInput}
          placeholder="Ad, soyad veya telefon ara..."
          placeholderTextColor={renkler.metinGri}
          value={arama}
          onChangeText={setArama}
        />
        <Text style={s.sayac}>{filtreli.length}</Text>
      </View>

      <FlatList
        data={filtreli}
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item, index }) => <Kart item={item} index={index} />}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 90 }}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); veriCek(); }} />
        }
        ListEmptyComponent={<Text style={s.bos}>Müşteri bulunamadı.</Text>}
      />

      {/* Yeni müşteri butonu (FAB) */}
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Text style={s.fabYazi}>+</Text>
      </TouchableOpacity>

      {/* Yeni müşteri modalı */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={modalKapat}>
        <KeyboardAvoidingView
          style={s.modalArka}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalKart}>
            <View style={s.modalBaslikBar}>
              <Text style={s.modalBaslik}>Yeni Müşteri</Text>
              <TouchableOpacity onPress={modalKapat}><Text style={s.kapat}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.etiket}>Ad *</Text>
              <TextInput style={s.input} value={form.ad} onChangeText={(t) => setForm({ ...form, ad: t })} placeholder="Ad" placeholderTextColor={renkler.metinGri} />
              <Text style={s.etiket}>Soyad *</Text>
              <TextInput style={s.input} value={form.soyad} onChangeText={(t) => setForm({ ...form, soyad: t })} placeholder="Soyad" placeholderTextColor={renkler.metinGri} />
              <Text style={s.etiket}>Telefon *</Text>
              <TextInput style={s.input} value={form.telefon} onChangeText={(t) => setForm({ ...form, telefon: t })} placeholder="05xx xxx xx xx" placeholderTextColor={renkler.metinGri} keyboardType="phone-pad" />
              <Text style={s.etiket}>Adres *</Text>
              <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} value={form.adres} onChangeText={(t) => setForm({ ...form, adres: t })} placeholder="Mahalle / cadde / ilçe" placeholderTextColor={renkler.metinGri} multiline />

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
  aramaKutu: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff',
    margin: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, borderColor: renkler.kenar,
  },
  aramaInput: { flex: 1, fontSize: 14, color: renkler.metin },
  sayac: { fontSize: 13, fontWeight: '700', color: renkler.metinSoluk },
  kart: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: renkler.kenar },
  ust: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarYazi: { color: '#fff', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' },
  ad: { fontSize: 15, fontWeight: '700', color: renkler.metin },
  tel: { fontSize: 13, color: renkler.metinSoluk, marginTop: 2 },
  bakiyeRozet: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  borcVar: { backgroundColor: renkler.kirmiziArka },
  borcYok: { backgroundColor: renkler.yesilArka },
  bakiyeYazi: { fontSize: 12, fontWeight: '800' },
  adres: { fontSize: 12, color: renkler.metinSoluk, marginTop: 10 },
  finansSatir: { flexDirection: 'row', gap: 10, marginTop: 12 },
  finansKutu: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10 },
  finansEtiket: { fontSize: 11, color: renkler.metinSoluk, fontWeight: '600' },
  finansDeger: { fontSize: 14, fontWeight: '800', marginTop: 3 },
  bos: { textAlign: 'center', color: renkler.metinGri, marginTop: 40 },
  // FAB
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: renkler.indigo, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabYazi: { color: '#fff', fontSize: 30, fontWeight: '300', marginTop: -2 },
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
