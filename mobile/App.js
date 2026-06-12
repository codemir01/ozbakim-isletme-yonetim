import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { renkler } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import IlkSifreScreen from './src/screens/IlkSifreScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MusterilerScreen from './src/screens/MusterilerScreen';
import SatislarScreen from './src/screens/SatislarScreen';
import UrunlerScreen from './src/screens/UrunlerScreen';
import BakimScreen from './src/screens/BakimScreen';
import GorevlerScreen from './src/screens/GorevlerScreen';
import GelirGiderScreen from './src/screens/GelirGiderScreen';
import FaturalarScreen from './src/screens/FaturalarScreen';
import ProfilScreen from './src/screens/ProfilScreen';
import ArizaTespitScreen from './src/screens/ArizaTespitScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Giriş yapılınca görünen alt sekmeli ana ekran
function AnaSekmeler() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: renkler.beyaz },
        headerTitleStyle: { color: renkler.metin, fontWeight: '800' },
        tabBarActiveTintColor: renkler.indigo,
        tabBarInactiveTintColor: renkler.metinGri,
        tabBarStyle: { paddingBottom: 4, height: 60 },
        tabBarLabelStyle: { fontSize: 10 },
        tabBarIcon: ({ color, size }) => {
          const ikonlar = {
            Özet: 'home-outline',
            Müşteriler: 'people-outline',
            Satışlar: 'cart-outline',
            Ürünler: 'cube-outline',
            Bakım: 'construct-outline',
            Görevler: 'checkbox-outline',
          };
          return <Ionicons name={ikonlar[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Özet" component={DashboardScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Müşteriler" component={MusterilerScreen} />
      <Tab.Screen name="Satışlar" component={SatislarScreen} />
      <Tab.Screen name="Ürünler" component={UrunlerScreen} />
      <Tab.Screen name="Bakım" component={BakimScreen} />
      <Tab.Screen name="Görevler" component={GorevlerScreen} />
    </Tab.Navigator>
  );
}

// Sekmeler + üstüne açılan ekstra sayfalar (Dashboard'daki Hızlı Erişim'den)
function AnaYigin() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: renkler.beyaz },
        headerTitleStyle: { color: renkler.metin, fontWeight: '800' },
        headerTintColor: renkler.indigo,
      }}
    >
      <Stack.Screen name="Sekmeler" component={AnaSekmeler} options={{ headerShown: false }} />
      <Stack.Screen name="GelirGider" component={GelirGiderScreen} options={{ title: 'Gelir / Gider' }} />
      <Stack.Screen name="Faturalar" component={FaturalarScreen} options={{ title: 'Faturalar' }} />
      <Stack.Screen name="Profil" component={ProfilScreen} options={{ title: 'Profilim' }} />
      <Stack.Screen name="ArizaTespit" component={ArizaTespitScreen} options={{ title: 'AI Arıza Tespiti' }} />
    </Stack.Navigator>
  );
}

// Giriş durumuna göre Login mi ana ekran mı gösterileceğine karar verir
function Kok() {
  const { kullanici, hazir } = useAuth();

  if (!hazir) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: renkler.arka }}>
        <ActivityIndicator size="large" color={renkler.indigo} />
      </View>
    );
  }

  // Giriş yok → Login. İlk giriş (admin'in eklediği eleman) → zorunlu şifre belirleme. Aksi → ana uygulama.
  let icerik;
  if (!kullanici) icerik = <LoginScreen />;
  else if (kullanici.ilkGiris) icerik = <IlkSifreScreen />;
  else icerik = <AnaYigin />;

  return <NavigationContainer>{icerik}</NavigationContainer>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Kok />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
