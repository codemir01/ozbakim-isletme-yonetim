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

// Her sekmenin hangi rollere görüneceği — web'deki Layout.jsx ile birebir aynı mantık.
// Özet herkese; Müşteriler/Satışlar/Ürünler satış tarafına; Bakım/Görevler saha tarafına.
const SEKMELER = [
  { name: 'Özet',       component: DashboardScreen, ikon: 'home-outline',     roller: ['Admin', 'SalesConsultant', 'Technician'], options: { headerShown: false } },
  { name: 'Müşteriler', component: MusterilerScreen, ikon: 'people-outline',   roller: ['Admin', 'SalesConsultant'] },
  { name: 'Satışlar',   component: SatislarScreen,   ikon: 'cart-outline',     roller: ['Admin', 'SalesConsultant'] },
  { name: 'Ürünler',    component: UrunlerScreen,    ikon: 'cube-outline',     roller: ['Admin', 'SalesConsultant'] },
  { name: 'Bakım',      component: BakimScreen,      ikon: 'construct-outline', roller: ['Admin', 'Technician'] },
  { name: 'Görevler',   component: GorevlerScreen,   ikon: 'checkbox-outline', roller: ['Admin', 'Technician'] },
];

// Giriş yapılınca görünen alt sekmeli ana ekran — sekmeler kullanıcının rolüne göre filtrelenir
function AnaSekmeler() {
  const { kullanici } = useAuth();
  const gorunenSekmeler = SEKMELER.filter((s) => s.roller.includes(kullanici?.rol));

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: renkler.beyaz },
        headerTitleStyle: { color: renkler.metin, fontWeight: '800' },
        tabBarActiveTintColor: renkler.indigo,
        tabBarInactiveTintColor: renkler.metinGri,
        tabBarStyle: { paddingBottom: 4, height: 60 },
        tabBarLabelStyle: { fontSize: 10 },
        tabBarIcon: ({ color }) => {
          const sekme = SEKMELER.find((s) => s.name === route.name);
          return <Ionicons name={sekme?.ikon ?? 'ellipse-outline'} size={22} color={color} />;
        },
      })}
    >
      {gorunenSekmeler.map((s) => (
        <Tab.Screen key={s.name} name={s.name} component={s.component} options={s.options} />
      ))}
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
