import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, UploadType } from 'expo-file-system';
import { API_AI } from '../api/client';
import { renkler } from '../theme';

export default function ArizaTespitScreen() {
  const [foto, setFoto] = useState(null);     // çekilen fotoğrafın uri'si
  const [sonuc, setSonuc] = useState('');      // AI analiz metni
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  // Kamerayla yeni fotoğraf çek
  async function fotoCek() {
    setHata('');
    const izin = await ImagePicker.requestCameraPermissionsAsync();
    if (!izin.granted) {
      Alert.alert('Kamera izni gerekli', 'Arıza tespiti için cihaz fotoğrafı çekilmeli.');
      return;
    }
    const cekim = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (cekim.canceled || !cekim.assets?.length) return;
    await analizEt(cekim.assets[0]);
  }

  // Galeriden var olan bir fotoğraf seç
  async function galeridenSec() {
    setHata('');
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) {
      Alert.alert('Galeri izni gerekli', 'Arıza tespiti için galeriden cihaz fotoğrafı seçilmeli.');
      return;
    }
    const secim = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (secim.canceled || !secim.assets?.length) return;
    await analizEt(secim.assets[0]);
  }

  // Seçilen/çekilen fotoğrafı AI servisine gönderip analizi al (ortak akış)
  async function analizEt(asset) {
    setFoto(asset.uri);
    setSonuc('');
    setYukleniyor(true);
    try {
      // Expo'nun native multipart yükleyicisi (RN FormData/fetch yerel dosya uri'sini desteklemiyor)
      const dosya = new File(asset.uri);
      const res = await dosya.upload(`${API_AI}/ariza-tespit`, {
        uploadType: UploadType.MULTIPART,
        httpMethod: 'POST',
        fieldName: 'foto',       // backend "foto" alanını bekliyor
        mimeType: 'image/jpeg',
      });
      const data = JSON.parse(res.body || '{}');
      if (res.status < 200 || res.status >= 300) throw new Error(data?.detail || 'Analiz başarısız.');
      setSonuc(data.sonuc || 'Sonuç alınamadı.');
    } catch (e) {
      setHata(e.message?.includes('Network') ? 'AI servisine ulaşılamadı (backend çalışıyor mu?).' : e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: renkler.arka }} contentContainerStyle={{ padding: 16 }}>
      {/* Bilgi kartı */}
      <View style={s.bilgi}>
        <Text style={s.bilgiBaslik}>🔍 Yapay Zeka ile Arıza Tespiti</Text>
        <Text style={s.bilgiMetin}>
          Cihazın veya arızalı parçanın fotoğrafını çek; yapay zeka cihazı tanısın ve görünen olası
          sorunları teknisyene madde madde açıklasın.
        </Text>
      </View>

      {/* Çekilen fotoğraf önizleme */}
      {foto ? <Image source={{ uri: foto }} style={s.onizleme} resizeMode="cover" /> : (
        <View style={s.bosOnizleme}>
          <Text style={{ fontSize: 40 }}>📷</Text>
          <Text style={s.bosYazi}>Henüz fotoğraf çekilmedi</Text>
        </View>
      )}

      {/* Çek & analiz et butonu */}
      <TouchableOpacity style={s.btn} onPress={fotoCek} disabled={yukleniyor} activeOpacity={0.85}>
        {yukleniyor
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnYazi}>{foto ? '📷 Yeni Fotoğraf Çek' : '📷 Fotoğraf Çek ve Analiz Et'}</Text>}
      </TouchableOpacity>

      {/* Galeriden seç butonu */}
      <TouchableOpacity style={s.btnIkincil} onPress={galeridenSec} disabled={yukleniyor} activeOpacity={0.85}>
        <Text style={s.btnIkincilYazi}>🖼️ Galeriden Fotoğraf Seç</Text>
      </TouchableOpacity>

      {yukleniyor ? <Text style={s.analizYazi}>Yapay zeka fotoğrafı inceliyor...</Text> : null}
      {hata ? <Text style={s.hata}>{hata}</Text> : null}

      {/* Sonuç */}
      {sonuc ? (
        <View style={s.sonucKart}>
          <Text style={s.sonucBaslik}>🤖 AI Analizi</Text>
          <Text style={s.sonucMetin}>{sonuc}</Text>
          <Text style={s.uyari}>Bu bir ön değerlendirmedir; kesin teşhis için yerinde kontrol gerekir.</Text>
        </View>
      ) : null}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bilgi: { backgroundColor: '#eef2ff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#c7d2fe' },
  bilgiBaslik: { fontSize: 15, fontWeight: '800', color: renkler.indigo },
  bilgiMetin: { fontSize: 13, color: renkler.metinSoluk, marginTop: 6, lineHeight: 19 },
  onizleme: { width: '100%', height: 240, borderRadius: 16, marginTop: 14, backgroundColor: '#e2e8f0' },
  bosOnizleme: { width: '100%', height: 240, borderRadius: 16, marginTop: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: renkler.kenar, alignItems: 'center', justifyContent: 'center', gap: 8 },
  bosYazi: { color: renkler.metinGri, fontSize: 13 },
  btn: { backgroundColor: renkler.indigo, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 14 },
  btnYazi: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnIkincil: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 10, borderWidth: 1.5, borderColor: renkler.indigo },
  btnIkincilYazi: { color: renkler.indigo, fontSize: 15, fontWeight: '700' },
  analizYazi: { textAlign: 'center', color: renkler.metinSoluk, marginTop: 12, fontStyle: 'italic' },
  hata: { color: renkler.kirmizi, backgroundColor: renkler.kirmiziArka, padding: 12, borderRadius: 12, marginTop: 14, fontSize: 13 },
  sonucKart: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: renkler.kenar, marginTop: 14 },
  sonucBaslik: { fontSize: 15, fontWeight: '800', color: renkler.metin, marginBottom: 8 },
  sonucMetin: { fontSize: 14, color: renkler.metin, lineHeight: 21 },
  uyari: { fontSize: 11, color: renkler.metinGri, marginTop: 12, fontStyle: 'italic' },
});
