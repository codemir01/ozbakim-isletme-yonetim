import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import api from '../api/client';
import { renkler, formatPara } from '../theme';

export default function GelirGiderScreen() {
  const [liste, setListe] = useState([]);
  const [ozet, setOzet] = useState({ toplamGelir: 0, toplamGider: 0, netBakiye: 0 });
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [filtre, setFiltre] = useState('hepsi'); // hepsi | gelir | gider

  const veriCek = useCallback(async () => {
    try {
      const [listeR, ozetR] = await Promise.allSettled([
        api.get('/gelir-gider'),
        api.get('/gelir-gider/ozet'),
      ]);
      if (listeR.status === 'fulfilled') setListe(listeR.value.data.veri ?? []);
      if (ozetR.status === 'fulfilled' && ozetR.value.data.veri) setOzet(ozetR.value.data.veri);
    } catch (e) {
      console.error('Gelir-Gider hata', e);
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  }, []);

  useEffect(() => { veriCek(); }, [veriCek]);

  const filtreli = liste.filter((k) => {
    if (filtre === 'gelir') return k.tip === 'Gelir';
    if (filtre === 'gider') return k.tip === 'Gider';
    return true;
  });

  function Kart({ item: k }) {
    const gelir = k.tip === 'Gelir';
    return (
      <View style={s.kart}>
        <View style={[s.tipNokta, { backgroundColor: gelir ? renkler.yesil : renkler.kirmizi }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.aciklama}>{k.aciklama}</Text>
          <Text style={s.tarih}>
            {new Date(k.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <Text style={[s.miktar, { color: gelir ? renkler.yesil : renkler.kirmizi }]}>
          {gelir ? '+' : '-'}{formatPara(k.miktar)}
        </Text>
      </View>
    );
  }

  if (yukleniyor) {
    return <View style={s.merkez}><ActivityIndicator size="large" color={renkler.indigo} /></View>;
  }

  const netPozitif = (ozet.netBakiye || 0) >= 0;

  return (
    <View style={{ flex: 1, backgroundColor: renkler.arka }}>
      {/* Net bakiye vurgulu kart */}
      <View style={[s.netKart, { backgroundColor: netPozitif ? renkler.yesil : renkler.kirmizi }]}>
        <Text style={s.netEtiket}>Net Bakiye</Text>
        <Text style={s.netDeger}>{formatPara(ozet.netBakiye)}</Text>
      </View>

      <View style={s.ikiliSatir}>
        <View style={[s.ozetKutu, { borderColor: '#a7f3d0' }]}>
          <Text style={s.ozetEtiket}>Toplam Gelir</Text>
          <Text style={[s.ozetDeger, { color: renkler.yesil }]}>{formatPara(ozet.toplamGelir)}</Text>
        </View>
        <View style={[s.ozetKutu, { borderColor: '#fecaca' }]}>
          <Text style={s.ozetEtiket}>Toplam Gider</Text>
          <Text style={[s.ozetDeger, { color: renkler.kirmizi }]}>{formatPara(ozet.toplamGider)}</Text>
        </View>
      </View>

      {/* Filtre */}
      <View style={s.filtreBar}>
        {[['hepsi', 'Tümü'], ['gelir', 'Gelir'], ['gider', 'Gider']].map(([k, l]) => (
          <TouchableOpacity
            key={k}
            style={[s.filtre, filtre === k && s.filtreAktif]}
            onPress={() => setFiltre(k)}
          >
            <Text style={[s.filtreYazi, filtre === k && s.filtreYaziAktif]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtreli}
        keyExtractor={(k) => String(k.id)}
        renderItem={({ item }) => <Kart item={item} />}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={() => { setYenileniyor(true); veriCek(); }} />
        }
        ListEmptyComponent={<Text style={s.bos}>Kayıt bulunamadı.</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  merkez: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: renkler.arka },
  netKart: { margin: 16, marginBottom: 8, borderRadius: 16, padding: 18 },
  netEtiket: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  netDeger: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  ikiliSatir: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  ozetKutu: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1 },
  ozetEtiket: { fontSize: 11, color: renkler.metinSoluk, fontWeight: '600' },
  ozetDeger: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  filtreBar: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: renkler.kenar, gap: 4 },
  filtre: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filtreAktif: { backgroundColor: renkler.indigo },
  filtreYazi: { fontSize: 13, fontWeight: '600', color: renkler.metinSoluk },
  filtreYaziAktif: { color: '#fff' },
  kart: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: renkler.kenar },
  tipNokta: { width: 10, height: 10, borderRadius: 5 },
  aciklama: { fontSize: 14, fontWeight: '600', color: renkler.metin },
  tarih: { fontSize: 12, color: renkler.metinSoluk, marginTop: 3 },
  miktar: { fontSize: 15, fontWeight: '800' },
  bos: { textAlign: 'center', color: renkler.metinGri, marginTop: 40 },
});
