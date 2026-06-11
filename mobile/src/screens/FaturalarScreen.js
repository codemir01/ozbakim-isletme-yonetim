import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import api from '../api/client';
import { renkler, formatPara } from '../theme';

export default function FaturalarScreen() {
  const [faturalar, setFaturalar] = useState([]);
  const [arama, setArama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const veriCek = useCallback(async () => {
    try {
      const res = await api.get('/faturalar');
      setFaturalar(res.data.veri ?? []);
    } catch (e) {
      console.error('Fatura hata', e);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { veriCek(); }, [veriCek]);

  const filtreli = arama.trim()
    ? faturalar.filter((f) =>
        (f.musteriAdSoyad || '').toLowerCase().includes(arama.toLowerCase()) ||
        (f.urunAdi || '').toLowerCase().includes(arama.toLowerCase()))
    : faturalar;

  const toplamTutar = faturalar.reduce((t, f) => t + (f.tutar || 0), 0);

  function Kart({ item: f }) {
    return (
      <View style={s.kart}>
        <View style={s.ikon}>
          <Text style={{ fontSize: 18 }}>🧾</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.ad}>{f.musteriAdSoyad}</Text>
          <Text style={s.urun}>{f.urunAdi}</Text>
          <Text style={s.tarih}>
            {new Date(f.olusturmaTarihi).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <Text style={s.tutar}>{formatPara(f.tutar)}</Text>
      </View>
    );
  }

  if (yukleniyor) {
    return <View style={s.merkez}><ActivityIndicator size="large" color={renkler.indigo} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: renkler.arka }}>
      <View style={s.ikiliSatir}>
        <View style={[s.ozet, { backgroundColor: renkler.indigo }]}>
          <Text style={s.ozetSayi}>{faturalar.length}</Text>
          <Text style={s.ozetEtiket}>Toplam Fatura</Text>
        </View>
        <View style={[s.ozet, { backgroundColor: renkler.yesil }]}>
          <Text style={[s.ozetSayi, { fontSize: 18 }]}>{formatPara(toplamTutar)}</Text>
          <Text style={s.ozetEtiket}>Toplam Ciro</Text>
        </View>
      </View>

      <View style={s.aramaKutu}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput
          style={s.aramaInput}
          placeholder="Müşteri veya ürün ara..."
          placeholderTextColor={renkler.metinGri}
          value={arama}
          onChangeText={setArama}
        />
        <Text style={s.sayac}>{filtreli.length}</Text>
      </View>

      <FlatList
        data={filtreli}
        keyExtractor={(f) => String(f.id)}
        renderItem={({ item }) => <Kart item={item} />}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); veriCek(); }} />
        }
        ListEmptyComponent={<Text style={s.bos}>Fatura bulunamadı.</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  merkez: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: renkler.arka },
  ikiliSatir: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  ozet: { flex: 1, borderRadius: 14, padding: 16 },
  ozetSayi: { color: '#fff', fontSize: 24, fontWeight: '800' },
  ozetEtiket: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  aramaKutu: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, borderColor: renkler.kenar,
  },
  aramaInput: { flex: 1, fontSize: 14, color: renkler.metin },
  sayac: { fontSize: 13, fontWeight: '700', color: renkler.metinSoluk },
  kart: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: renkler.kenar },
  ikon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  ad: { fontSize: 14, fontWeight: '700', color: renkler.metin },
  urun: { fontSize: 13, color: renkler.metinSoluk, marginTop: 2 },
  tarih: { fontSize: 11, color: renkler.metinGri, marginTop: 3 },
  tutar: { fontSize: 15, fontWeight: '800', color: renkler.metin },
  bos: { textAlign: 'center', color: renkler.metinGri, marginTop: 40 },
});
