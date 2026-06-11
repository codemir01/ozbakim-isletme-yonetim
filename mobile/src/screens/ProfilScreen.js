import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView,
} from 'react-native';
import api from '../api/client';
import { renkler } from '../theme';
import { useAuth } from '../context/AuthContext';

const rolEtiket = {
  Admin: 'Yönetici',
  SalesConsultant: 'Satış Danışmanı',
  Technician: 'Teknisyen',
};

// Tek bir bilgi satırı
function Satir({ etiket, deger }) {
  return (
    <View style={s.satir}>
      <Text style={s.satirEtiket}>{etiket}</Text>
      <Text style={s.satirDeger}>{deger || '-'}</Text>
    </View>
  );
}

export default function ProfilScreen() {
  const { cikisYap } = useAuth();
  const [profil, setProfil] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/profil');
        setProfil(res.data.veri);
      } catch (e) {
        console.error('Profil hata', e);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, []);

  if (yukleniyor) {
    return <View style={s.merkez}><ActivityIndicator size="large" color={renkler.indigo} /></View>;
  }

  const bas = `${profil?.ad?.[0] ?? ''}${profil?.soyad?.[0] ?? ''}`.toUpperCase();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: renkler.arka }} contentContainerStyle={{ padding: 16 }}>
      {/* Üst kart — avatar + isim */}
      <View style={s.ustKart}>
        <View style={s.avatar}>
          <Text style={s.avatarYazi}>{bas || '??'}</Text>
        </View>
        <Text style={s.isim}>{profil?.ad} {profil?.soyad}</Text>
        <Text style={s.unvan}>{profil?.unvan || 'Unvan girilmemiş'}</Text>
        <View style={s.rolRozet}>
          <Text style={s.rolYazi}>{rolEtiket[profil?.rol] ?? profil?.rol}</Text>
        </View>
      </View>

      {/* Bilgi kartı */}
      <View style={s.bilgiKart}>
        <Satir etiket="E-posta" deger={profil?.eposta} />
        <Satir etiket="Unvan" deger={profil?.unvan} />
        <Satir etiket="Rol" deger={rolEtiket[profil?.rol] ?? profil?.rol} />
        <Satir
          etiket="Üyelik Tarihi"
          deger={profil?.olusturmaTarihi ? new Date(profil.olusturmaTarihi).toLocaleDateString('tr-TR') : '-'}
        />
      </View>

      {/* Çıkış */}
      <TouchableOpacity style={s.cikisBtn} onPress={cikisYap}>
        <Text style={s.cikisYazi}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
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
  bilgiKart: { backgroundColor: '#fff', borderRadius: 18, padding: 6, borderWidth: 1, borderColor: renkler.kenar, marginTop: 14 },
  satir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  satirEtiket: { fontSize: 13, color: renkler.metinSoluk, fontWeight: '600' },
  satirDeger: { fontSize: 14, color: renkler.metin, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  cikisBtn: { marginTop: 20, backgroundColor: renkler.kirmiziArka, borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cikisYazi: { color: renkler.kirmizi, fontWeight: '700', fontSize: 15 },
});
