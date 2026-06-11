import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Giriş yapmadan erişilmemesi gereken sayfaları korur.
// kullanici state'i doluysa sayfayı göster, boşsa login'e yönlendir.
// App.jsx'te tüm korumalı Route'lar bu bileşenle sarılmıştır.
export default function PrivateRoute({ children }) {
  const { kullanici } = useAuth();
  if (!kullanici) return <Navigate to="/login" replace />;
  // İlk giriş yapan eleman önce şifresini belirlemeli — başka sayfaya geçemez
  if (kullanici.ilkGiris) return <Navigate to="/ilk-sifre" replace />;
  return children;
}
