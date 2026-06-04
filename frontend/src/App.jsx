import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import MusterilerPage from './pages/Musteriler/MusterilerPage';
import MusteriDetayPage from './pages/Musteriler/MusteriDetayPage';
import UrunlerPage from './pages/Urunler/UrunlerPage';
import SatislarPage from './pages/Satislar/SatislarPage';
import BakimPage from './pages/Bakim/BakimPage';
import GorevlerPage from './pages/Gorevler/GorevlerPage';
import GelirGiderPage from './pages/GelirGider/GelirGiderPage';
import KullanicilarPage from './pages/Kullanicilar/KullanicilarPage';
import FaturaPage from './pages/Faturalar/FaturaPage';
import HaritaPage from './pages/Harita/HaritaPage';
import ProfilPage from './pages/Profil/ProfilPage';
import LisansPage from './pages/Lisans/LisansPage';
import RaporlarPage from './pages/Raporlar/RaporlarPage';

export default function App() {
  return (
    // BrowserRouter: URL değişikliklerini React Router'ın yönetmesini sağlar
    <BrowserRouter>
      {/* AuthProvider: kullanici ve token bilgisini tüm sayfalara dağıtır */}
      <AuthProvider>
        <Routes>
          {/* Login sayfası herkese açık */}
          <Route path="/login" element={<LoginPage />} />

          {/* Aşağıdaki sayfalar PrivateRoute ile koruma altında.
              Token olmadan bu URL'lere gidilirse /login'e yönlendirilir. */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/musteriler" element={<PrivateRoute><MusterilerPage /></PrivateRoute>} />
          <Route path="/musteriler/:id" element={<PrivateRoute><MusteriDetayPage /></PrivateRoute>} />
          <Route path="/urunler" element={<PrivateRoute><UrunlerPage /></PrivateRoute>} />
          <Route path="/satislar" element={<PrivateRoute><SatislarPage /></PrivateRoute>} />
          <Route path="/bakim" element={<PrivateRoute><BakimPage /></PrivateRoute>} />
          <Route path="/gorevler" element={<PrivateRoute><GorevlerPage /></PrivateRoute>} />
          <Route path="/gelir-gider" element={<PrivateRoute><GelirGiderPage /></PrivateRoute>} />
          <Route path="/kullanicilar" element={<PrivateRoute><KullanicilarPage /></PrivateRoute>} />
          <Route path="/faturalar" element={<PrivateRoute><FaturaPage /></PrivateRoute>} />
          <Route path="/harita" element={<PrivateRoute><HaritaPage /></PrivateRoute>} />
          <Route path="/profil" element={<PrivateRoute><ProfilPage /></PrivateRoute>} />
          <Route path="/lisans" element={<PrivateRoute><LisansPage /></PrivateRoute>} />
          <Route path="/raporlar" element={<PrivateRoute><RaporlarPage /></PrivateRoute>} />

          {/* Tanımsız bir URL girilirse dashboard'a yönlendir */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
