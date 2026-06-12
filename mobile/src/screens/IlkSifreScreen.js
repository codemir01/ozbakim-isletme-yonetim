import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import api, { apiHata } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { renkler } from '../theme';

// Admin'in eklediği eleman ilk girişte KENDİ şifresini belirler (web ile aynı akış).
export default function IlkSifreScreen() {
  const { kullanici, ilkGirisTamamlandi, cikisYap } = useAuth();
  const [sifre, setSifre] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder() {
    setHata('');
    if (sifre.length < 6) return setHata('Şifre en az 6 karakter olmalı.');
    if (sifre !== tekrar) return setHata('Şifreler eşleşmiyor.');
    setYukleniyor(true);
    try {
      await api.put('/profil/ilk-sifre', { yeniSifre: sifre });
      await ilkGirisTamamlandi();
    } catch (e) {
      setHata(apiHata(e, 'Şifre belirlenemedi.'));
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: renkler.arka }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.kaydir} keyboardShouldPersistTaps="handled">
        <View style={s.logo}><Text style={s.logoYazi}>🔒</Text></View>
        <Text style={s.baslik}>Merhaba {kullanici?.ad}</Text>
        <Text style={s.altBaslik}>Güvenliğin için lütfen kendine yeni bir şifre belirle.</Text>

        <View style={s.kart}>
          <Text style={s.etiket}>Yeni Şifre</Text>
          <TextInput style={s.input} secureTextEntry value={sifre} onChangeText={setSifre} placeholder="En az 6 karakter" placeholderTextColor={renkler.metinGri} />

          <Text style={s.etiket}>Yeni Şifre (Tekrar)</Text>
          <TextInput style={s.input} secureTextEntry value={tekrar} onChangeText={setTekrar} placeholder="••••••••" placeholderTextColor={renkler.metinGri} />

          {hata ? <Text style={s.hata}>{hata}</Text> : null}

          <TouchableOpacity style={s.btn} onPress={gonder} disabled={yukleniyor}>
            {yukleniyor ? <ActivityIndicator color="#fff" /> : <Text style={s.btnYazi}>Şifremi Belirle ve Devam Et</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={cikisYap}>
            <Text style={s.cikis}>Çıkış yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  kaydir: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: renkler.indigo, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoYazi: { fontSize: 26 },
  baslik: { fontSize: 24, fontWeight: '800', color: renkler.metin, textAlign: 'center' },
  altBaslik: { fontSize: 13, color: renkler.metinSoluk, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  kart: { backgroundColor: renkler.beyaz, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: renkler.kenar },
  etiket: { fontSize: 13, fontWeight: '600', color: renkler.metin, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: renkler.kenar, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: renkler.metin, backgroundColor: '#f8fafc' },
  hata: { color: renkler.kirmizi, backgroundColor: renkler.kirmiziArka, padding: 10, borderRadius: 10, marginTop: 12, fontSize: 13 },
  btn: { backgroundColor: renkler.indigo, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cikis: { textAlign: 'center', color: renkler.metinSoluk, marginTop: 16, fontSize: 13, fontWeight: '600' },
});
