import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Giriş yapmadan erişilmemesi gereken sayfaları korur.
// kullanici state'i doluysa sayfayı göster, boşsa login'e yönlendir.
// allowedRoles verilirse, kullanıcının rolü bu listede yoksa dashboard'a yönlendirir
// (adres çubuğuna elle URL yazarak yetkisiz sayfaya geçmeyi engeller).
// App.jsx'te tüm korumalı Route'lar bu bileşenle sarılmıştır.
export default function PrivateRoute({ children, allowedRoles }) {
  const { kullanici } = useAuth();
  if (!kullanici) return <Navigate to="/login" replace />;
  // İlk giriş yapan eleman önce şifresini belirlemeli — başka sayfaya geçemez
  if (kullanici.ilkGiris) return <Navigate to="/ilk-sifre" replace />;
  // Rol kısıtı varsa ve kullanıcının rolü uygun değilse, herkese açık dashboard'a düş
  if (allowedRoles && !allowedRoles.includes(kullanici.rol)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
