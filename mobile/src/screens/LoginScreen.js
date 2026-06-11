import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { renkler } from '../theme';

const demolar = [
  { label: 'Admin', eposta: 'admin@isletme.com', sifre: 'Admin123!' },
  { label: 'Satış', eposta: 'satis@isletme.com', sifre: 'Satis123!' },
  { label: 'Teknisyen', eposta: 'teknisyen@isletme.com', sifre: 'Teknis123!' },
];

export default function LoginScreen() {
  const { girisYap } = useAuth();
  const [eposta, setEposta] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder() {
    setHata('');
    setYukleniyor(true);
    try {
      await girisYap(eposta, sifre);
    } catch (e) {
      // Ağ hatası mı yoksa yanlış şifre mi ayırt et — kurulum hatalarında yardımcı olur.
      if (e.response) setHata('E-posta veya şifre hatalı.');
      else setHata('Sunucuya ulaşılamadı. Backend çalışıyor mu?');
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: renkler.arka }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.kaydir} keyboardShouldPersistTaps="handled">
        <View style={s.logo}>
          <Text style={s.logoYazi}>Öz</Text>
        </View>
        <Text style={s.baslik}>ÖzBakım</Text>
        <Text style={s.altBaslik}>Sisteme giriş yapmak için bilgilerinizi girin</Text>

        <View style={s.kart}>
          <Text style={s.etiket}>E-posta Adresi</Text>
          <TextInput
            style={s.input}
            placeholder="ornek@sirket.com"
            placeholderTextColor={renkler.metinGri}
            autoCapitalize="none"
            keyboardType="email-address"
            value={eposta}
            onChangeText={setEposta}
          />

          <Text style={s.etiket}>Şifre</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={renkler.metinGri}
            secureTextEntry
            value={sifre}
            onChangeText={setSifre}
          />

          {hata ? <Text style={s.hata}>{hata}</Text> : null}

          <TouchableOpacity style={s.btn} onPress={gonder} disabled={yukleniyor}>
            {yukleniyor
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnYazi}>Giriş Yap</Text>}
          </TouchableOpacity>

          <Text style={s.demoBaslik}>Demo Hesapları</Text>
          <View style={s.demoSatir}>
            {demolar.map((d) => (
              <TouchableOpacity
                key={d.label}
                style={s.demoBtn}
                onPress={() => { setEposta(d.eposta); setSifre(d.sifre); }}
              >
                <Text style={s.demoYazi}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  kaydir: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: renkler.indigo,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoYazi: { color: '#fff', fontSize: 22, fontWeight: '800' },
  baslik: { fontSize: 28, fontWeight: '800', color: renkler.metin, textAlign: 'center' },
  altBaslik: { fontSize: 13, color: renkler.metinSoluk, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  kart: {
    backgroundColor: renkler.beyaz, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: renkler.kenar,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  etiket: { fontSize: 13, fontWeight: '600', color: renkler.metin, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: renkler.kenar, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: renkler.metin, backgroundColor: '#f8fafc',
  },
  hata: { color: renkler.kirmizi, backgroundColor: renkler.kirmiziArka, padding: 10, borderRadius: 10, marginTop: 12, fontSize: 13 },
  btn: {
    backgroundColor: renkler.indigo, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 18,
  },
  btnYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
  demoBaslik: { textAlign: 'center', color: renkler.metinGri, fontSize: 12, fontWeight: '600', marginTop: 22, marginBottom: 12 },
  demoSatir: { flexDirection: 'row', gap: 8 },
  demoBtn: {
    flex: 1, borderWidth: 1, borderColor: renkler.kenar, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  demoYazi: { fontSize: 13, fontWeight: '700', color: renkler.metin },
});
