import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import api, { apiHata } from '../api/client';
import { renkler } from '../theme';
import { useAuth } from '../context/AuthContext';

const rolEtiket = {
  Admin: 'Yönetici',
  SalesConsultant: 'Satış Danışmanı',
  Technician: 'Teknisyen',
};

export default function ProfilScreen() {
  const { cikisYap, guncelleKullanici } = useAuth();
  const [profil, setProfil] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Profil düzenleme
  const [pForm, setPForm] = useState({ ad: '', soyad: '', unvan: '' });
  const [pKaydediliyor, setPKaydediliyor] = useState(false);
  const [pMesaj, setPMesaj] = useState(null); // { ok, metin }

  // Şifre değiştirme
  const [sForm, setSForm] = useState({ eskiSifre: '', yeniSifre: '', tekrar: '' });
  const [sKaydediliyor, setSKaydediliyor] = useState(false);
  const [sMesaj, setSMesaj] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/profil');
        const p = res.data.veri;
        setProfil(p);
        setPForm({ ad: p.ad, soyad: p.soyad, unvan: p.unvan || '' });
      } catch (e) {
        console.error('Profil hata', e);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, []);

  async function profilKaydet() {
    setPKaydediliyor(true);
    setPMesaj(null);
    try {
      await api.put('/profil', pForm);
      setProfil((prev) => ({ ...prev, ...pForm }));
      guncelleKullanici({ ad: pForm.ad, soyad: pForm.soyad });
      setPMesaj({ ok: true, metin: 'Profil güncellendi.' });
    } catch (e) {
      setPMesaj({ ok: false, metin: apiHata(e, 'Güncellenemedi.') });
    } finally {
      setPKaydediliyor(false);
    }
  }

  async function sifreKaydet() {
    setSMesaj(null);
    if (sForm.yeniSifre.length < 6) { setSMesaj({ ok: false, metin: 'Yeni şifre en az 6 karakter olmalı.' }); return; }
    if (sForm.yeniSifre !== sForm.tekrar) { setSMesaj({ ok: false, metin: 'Yeni şifreler eşleşmiyor.' }); return; }
    setSKaydediliyor(true);
    try {
      await api.put('/profil/sifre', { eskiSifre: sForm.eskiSifre, yeniSifre: sForm.yeniSifre });
      setSMesaj({ ok: true, metin: 'Şifre güncellendi.' });
      setSForm({ eskiSifre: '', yeniSifre: '', tekrar: '' });
    } catch (e) {
      setSMesaj({ ok: false, metin: apiHata(e, 'Şifre güncellenemedi.') });
    } finally {
      setSKaydediliyor(false);
    }
  }

  if (yukleniyor) {
    return <View style={s.merkez}><ActivityIndicator size="large" color={renkler.indigo} /></View>;
  }

  const bas = `${profil?.ad?.[0] ?? ''}${profil?.soyad?.[0] ?? ''}`.toUpperCase();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: renkler.arka }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Üst kart — avatar + isim */}
        <View style={s.ustKart}>
          <View style={s.avatar}><Text style={s.avatarYazi}>{bas || '??'}</Text></View>
          <Text style={s.isim}>{profil?.ad} {profil?.soyad}</Text>
          <Text style={s.unvan}>{profil?.unvan || 'Unvan girilmemiş'}</Text>
          <View style={s.rolRozet}>
            <Text style={s.rolYazi}>{rolEtiket[profil?.rol] ?? profil?.rol}</Text>
          </View>
          <Text style={s.eposta}>{profil?.eposta}</Text>
        </View>

        {/* Profil düzenleme */}
        <View style={s.kart}>
          <Text style={s.kartBaslik}>Profil Bilgileri</Text>
          <Text style={s.etiket}>Ad</Text>
          <TextInput style={s.input} value={pForm.ad} onChangeText={(t) => setPForm({ ...pForm, ad: t })} placeholderTextColor={renkler.metinGri} />
          <Text style={s.etiket}>Soyad</Text>
          <TextInput style={s.input} value={pForm.soyad} onChangeText={(t) => setPForm({ ...pForm, soyad: t })} placeholderTextColor={renkler.metinGri} />
          <Text style={s.etiket}>Unvan</Text>
          <TextInput style={s.input} value={pForm.unvan} onChangeText={(t) => setPForm({ ...pForm, unvan: t })} placeholder="Örn: Saha Teknisyeni" placeholderTextColor={renkler.metinGri} />
          {pMesaj ? <Text style={[s.mesaj, pMesaj.ok ? s.basari : s.hata]}>{pMesaj.metin}</Text> : null}
          <TouchableOpacity style={s.btn} onPress={profilKaydet} disabled={pKaydediliyor}>
            {pKaydediliyor ? <ActivityIndicator color="#fff" /> : <Text style={s.btnYazi}>Kaydet</Text>}
          </TouchableOpacity>
        </View>

        {/* Şifre değiştirme */}
        <View style={s.kart}>
          <Text style={s.kartBaslik}>Şifre Değiştir</Text>
          <Text style={s.etiket}>Mevcut Şifre</Text>
          <TextInput style={s.input} secureTextEntry value={sForm.eskiSifre} onChangeText={(t) => setSForm({ ...sForm, eskiSifre: t })} placeholderTextColor={renkler.metinGri} />
          <Text style={s.etiket}>Yeni Şifre</Text>
          <TextInput style={s.input} secureTextEntry value={sForm.yeniSifre} onChangeText={(t) => setSForm({ ...sForm, yeniSifre: t })} placeholder="En az 6 karakter" placeholderTextColor={renkler.metinGri} />
          <Text style={s.etiket}>Yeni Şifre (Tekrar)</Text>
          <TextInput style={s.input} secureTextEntry value={sForm.tekrar} onChangeText={(t) => setSForm({ ...sForm, tekrar: t })} placeholderTextColor={renkler.metinGri} />
          {sMesaj ? <Text style={[s.mesaj, sMesaj.ok ? s.basari : s.hata]}>{sMesaj.metin}</Text> : null}
          <TouchableOpacity style={[s.btn, { backgroundColor: renkler.metin }]} onPress={sifreKaydet} disabled={sKaydediliyor}>
            {sKaydediliyor ? <ActivityIndicator color="#fff" /> : <Text style={s.btnYazi}>Şifreyi Güncelle</Text>}
          </TouchableOpacity>
        </View>

        {/* Çıkış */}
        <TouchableOpacity style={s.cikisBtn} onPress={cikisYap}>
          <Text style={s.cikisYazi}>Çıkış Yap</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  merkez: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: renkler.arka },
  ustKart: { backgroundColor: '#fff', borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: renkler.kenar },
  avatar: { width: 80, height: 80, borderRadius: 24, backgroundColor: renkler.indigo, alignItems: 'center', justifyContent: 'center' },
  avatarYazi: { color: '#fff', fontSize: 30, fontWeight: '800' },
  isim: { fontSize: 20, fontWeight: '800', color: renkler.metin, marginTop: 14 },
  unvan: { fontSize: 13, color: renkler.metinSoluk, marginTop: 4 },
  rolRozet: { backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginTop: 10 },
  rolYazi: { color: renkler.indigo, fontSize: 12, fontWeight: '700' },
  eposta: { fontSize: 12, color: renkler.metinGri, marginTop: 8 },
  kart: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: renkler.kenar, marginTop: 14 },
  kartBaslik: { fontSize: 15, fontWeight: '800', color: renkler.metin, marginBottom: 4 },
  etiket: { fontSize: 13, fontWeight: '600', color: renkler.metin, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: renkler.kenar, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: renkler.metin, backgroundColor: '#f8fafc' },
  mesaj: { padding: 10, borderRadius: 10, marginTop: 12, fontSize: 13, fontWeight: '600' },
  basari: { color: '#047857', backgroundColor: renkler.yesilArka },
  hata: { color: renkler.kirmizi, backgroundColor: renkler.kirmiziArka },
  btn: { backgroundColor: renkler.indigo, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  btnYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cikisBtn: { marginTop: 20, backgroundColor: renkler.kirmiziArka, borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cikisYazi: { color: renkler.kirmizi, fontWeight: '700', fontSize: 15 },
});
