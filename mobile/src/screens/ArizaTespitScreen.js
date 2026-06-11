import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Image, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, UploadType } from 'expo-file-system';
import { API_AI } from '../api/client';
import { renkler } from '../theme';

/**
 * AI Arıza Tespiti — SOHBET ekranı.
 * Usta hem cihaz fotoğrafı ekleyebilir hem de yazarak arızayı sorabilir;
 * yapay zeka (Gemini) ile karşılıklı konuşarak arızayı netleştirir.
 */
export default function ArizaTespitScreen() {
  const [mesajlar, setMesajlar] = useState([]); // {rol:'user'|'model', metin}
  const [foto, setFoto] = useState(null);        // oturuma ekli cihaz fotoğrafı (uri) — bağlam için her turda gönderilir
  const [girdi, setGirdi] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const kaydirma = useRef(null);

  function enAltaKaydir() {
    setTimeout(() => kaydirma.current?.scrollToEnd({ animated: true }), 80);
  }

  async function fotoCek() {
    const izin = await ImagePicker.requestCameraPermissionsAsync();
    if (!izin.granted) return Alert.alert('Kamera izni gerekli', 'Cihaz fotoğrafı çekmek için izin verin.');
    const cekim = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!cekim.canceled && cekim.assets?.length) setFoto(cekim.assets[0].uri);
  }

  async function galeridenSec() {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) return Alert.alert('Galeri izni gerekli', 'Galeriden fotoğraf seçmek için izin verin.');
    const secim = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!secim.canceled && secim.assets?.length) setFoto(secim.assets[0].uri);
  }

  async function gonder() {
    const metin = girdi.trim();
    if (!metin && !foto) return;                 // boş mesaj + foto yoksa gönderme
    if (yukleniyor) return;

    // Foto var ama yazı yoksa, varsayılan bir soru kullan
    const kullaniciMetni = metin || 'Bu cihazda ne görüyorsun? Olası arıza ne olabilir?';
    const fotoVarMi = !!foto;

    const yeniMesajlar = [...mesajlar, { rol: 'user', metin: kullaniciMetni, resim: fotoVarMi ? foto : null }];
    setMesajlar(yeniMesajlar);
    setGirdi('');
    setYukleniyor(true);
    enAltaKaydir();

    // Sunucuya gönderilecek geçmiş (sadece rol + metin)
    const gecmis = yeniMesajlar.map((m) => ({ rol: m.rol, metin: m.metin }));

    try {
      let cevap;
      if (foto) {
        // Fotoğraflı tur → Expo native multipart yükleyici (ek alan: mesajlar)
        const dosya = new File(foto);
        const res = await dosya.upload(`${API_AI}/ariza-sohbet`, {
          uploadType: UploadType.MULTIPART,
          httpMethod: 'POST',
          fieldName: 'foto',
          mimeType: 'image/jpeg',
          parameters: { mesajlar: JSON.stringify(gecmis) },
        });
        const data = JSON.parse(res.body || '{}');
        if (res.status < 200 || res.status >= 300) throw new Error(data?.detail || 'Yanıt alınamadı.');
        cevap = data.cevap;
      } else {
        // Sadece yazı turu → multipart string alan (fetch)
        const fd = new FormData();
        fd.append('mesajlar', JSON.stringify(gecmis));
        const res = await fetch(`${API_AI}/ariza-sohbet`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Yanıt alınamadı.');
        cevap = data.cevap;
      }
      setMesajlar((prev) => [...prev, { rol: 'model', metin: cevap || 'Yanıt boş döndü.' }]);
    } catch (e) {
      const mesaj = e.message?.includes('Network')
        ? 'AI servisine ulaşılamadı (backend çalışıyor mu?).'
        : (e.message || 'Bir hata oluştu.');
      setMesajlar((prev) => [...prev, { rol: 'model', metin: `⚠️ ${mesaj}`, hata: true }]);
    } finally {
      setYukleniyor(false);
      enAltaKaydir();
    }
  }

  const bosDurum = mesajlar.length === 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: renkler.arka }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Sohbet akışı */}
      <ScrollView
        ref={kaydirma}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={enAltaKaydir}
      >
        {bosDurum ? (
          <View style={s.bilgi}>
            <Text style={s.bilgiBaslik}>🔧 Yapay Zeka Usta Asistanı</Text>
            <Text style={s.bilgiMetin}>
              Cihazın fotoğrafını ekle ve/veya arızayı yaz; yapay zeka usta gibi seninle
              konuşarak arızayı tespit etmene yardım etsin.{'\n'}
              Örn: "Çamaşır makinesi su almıyor, ekranda E18 yazıyor."
            </Text>
          </View>
        ) : (
          mesajlar.map((m, i) => (
            <View
              key={i}
              style={[s.balonSatir, m.rol === 'user' ? s.sagSatir : s.solSatir]}
            >
              <View style={[s.balon, m.rol === 'user' ? s.userBalon : (m.hata ? s.hataBalon : s.aiBalon)]}>
                {m.rol === 'model' && !m.hata && <Text style={s.aiEtiket}>🤖 AI Usta</Text>}
                {m.resim ? <Image source={{ uri: m.resim }} style={s.balonResim} /> : null}
                <Text style={[s.balonMetin, m.rol === 'user' && { color: '#fff' }, m.hata && { color: renkler.kirmizi }]}>
                  {m.metin}
                </Text>
              </View>
            </View>
          ))
        )}
        {yukleniyor && (
          <View style={[s.balonSatir, s.solSatir]}>
            <View style={[s.balon, s.aiBalon, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <ActivityIndicator size="small" color={renkler.indigo} />
              <Text style={{ color: renkler.metinSoluk, fontStyle: 'italic' }}>AI usta düşünüyor...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Ekli fotoğraf önizlemesi */}
      {foto && (
        <View style={s.fotoChip}>
          <Image source={{ uri: foto }} style={s.fotoChipResim} />
          <Text style={s.fotoChipYazi}>Fotoğraf ekli — sorulara dahil edilecek</Text>
          <TouchableOpacity onPress={() => setFoto(null)} hitSlop={10}>
            <Text style={s.fotoChipKaldir}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Giriş çubuğu */}
      <View style={s.girisCubugu}>
        <TouchableOpacity style={s.ikonBtn} onPress={fotoCek} disabled={yukleniyor}>
          <Text style={s.ikonYazi}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ikonBtn} onPress={galeridenSec} disabled={yukleniyor}>
          <Text style={s.ikonYazi}>🖼️</Text>
        </TouchableOpacity>
        <TextInput
          style={s.input}
          value={girdi}
          onChangeText={setGirdi}
          placeholder="Arızayı yaz veya soru sor..."
          placeholderTextColor={renkler.metinGri}
          multiline
          editable={!yukleniyor}
        />
        <TouchableOpacity
          style={[s.gonderBtn, (yukleniyor || (!girdi.trim() && !foto)) && { opacity: 0.5 }]}
          onPress={gonder}
          disabled={yukleniyor || (!girdi.trim() && !foto)}
        >
          <Text style={s.gonderYazi}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  bilgi: { backgroundColor: '#eef2ff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#c7d2fe', marginTop: 8 },
  bilgiBaslik: { fontSize: 15, fontWeight: '800', color: renkler.indigo },
  bilgiMetin: { fontSize: 13, color: renkler.metinSoluk, marginTop: 6, lineHeight: 20 },

  balonSatir: { width: '100%', marginBottom: 10 },
  sagSatir: { alignItems: 'flex-end' },
  solSatir: { alignItems: 'flex-start' },
  balon: { maxWidth: '88%', borderRadius: 16, padding: 12 },
  userBalon: { backgroundColor: renkler.indigo, borderBottomRightRadius: 4 },
  aiBalon: { backgroundColor: '#fff', borderWidth: 1, borderColor: renkler.kenar, borderBottomLeftRadius: 4 },
  hataBalon: { backgroundColor: renkler.kirmiziArka, borderWidth: 1, borderColor: renkler.kirmizi, borderBottomLeftRadius: 4 },
  aiEtiket: { fontSize: 11, fontWeight: '800', color: renkler.indigo, marginBottom: 4 },
  balonMetin: { fontSize: 14, color: renkler.metin, lineHeight: 21 },
  balonResim: { width: 180, height: 135, borderRadius: 10, marginBottom: 8, backgroundColor: '#e2e8f0' },

  fotoChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#eef2ff', borderTopWidth: 1, borderTopColor: '#c7d2fe' },
  fotoChipResim: { width: 38, height: 38, borderRadius: 8, backgroundColor: '#cbd5e1' },
  fotoChipYazi: { flex: 1, fontSize: 12, color: renkler.indigo, fontWeight: '600' },
  fotoChipKaldir: { fontSize: 16, color: renkler.metinGri, fontWeight: '700', paddingHorizontal: 4 },

  girisCubugu: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: renkler.kenar },
  ikonBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: renkler.arka },
  ikonYazi: { fontSize: 18 },
  input: { flex: 1, maxHeight: 110, minHeight: 40, borderWidth: 1, borderColor: renkler.kenar, borderRadius: 20,
    paddingHorizontal: 14, paddingTop: 9, paddingBottom: 9, fontSize: 14, color: renkler.metin, backgroundColor: renkler.arka },
  gonderBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: renkler.indigo, alignItems: 'center', justifyContent: 'center' },
  gonderYazi: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
