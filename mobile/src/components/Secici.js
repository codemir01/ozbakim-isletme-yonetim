import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { renkler } from '../theme';

// Basit dropdown: bir alana basınca açılan, listeden seçtiren bileşen.
// secenekler: [{ id, label }], secili: id, onSec: (id) => void
export default function Secici({ etiket, secili, secenekler, onSec, placeholder = 'Seçiniz' }) {
  const [acik, setAcik] = useState(false);
  const seciliMetin = secenekler.find((o) => String(o.id) === String(secili))?.label;

  return (
    <View>
      {etiket ? <Text style={s.etiket}>{etiket}</Text> : null}
      <TouchableOpacity style={s.kutu} onPress={() => setAcik(true)} activeOpacity={0.7}>
        <Text style={[s.deger, !seciliMetin && { color: renkler.metinGri }]} numberOfLines={1}>
          {seciliMetin || placeholder}
        </Text>
        <Text style={s.ok}>▾</Text>
      </TouchableOpacity>

      <Modal visible={acik} transparent animationType="fade" onRequestClose={() => setAcik(false)}>
        <TouchableOpacity style={s.arka} activeOpacity={1} onPress={() => setAcik(false)}>
          <View style={s.liste}>
            <Text style={s.listeBaslik}>{etiket || 'Seçiniz'}</Text>
            <FlatList
              data={secenekler}
              keyExtractor={(o) => String(o.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={s.satir} onPress={() => { onSec(item.id); setAcik(false); }}>
                  <Text style={[s.satirYazi, String(item.id) === String(secili) && s.satirSecili]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.bos}>Seçenek yok.</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  etiket: { fontSize: 13, fontWeight: '600', color: renkler.metin, marginBottom: 6, marginTop: 10 },
  kutu: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: renkler.kenar, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#f8fafc',
  },
  deger: { fontSize: 14, color: renkler.metin, flex: 1 },
  ok: { fontSize: 14, color: renkler.metinSoluk, marginLeft: 8 },
  arka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  liste: { backgroundColor: '#fff', borderRadius: 18, maxHeight: '70%', padding: 8 },
  listeBaslik: { fontSize: 15, fontWeight: '800', color: renkler.metin, padding: 12 },
  satir: { paddingVertical: 14, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  satirYazi: { fontSize: 14, color: renkler.metin },
  satirSecili: { color: renkler.indigo, fontWeight: '800' },
  bos: { padding: 16, textAlign: 'center', color: renkler.metinGri },
});
