import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Giriş yapmadan erişilmemesi gereken sayfaları korur.
// kullanici state'i doluysa sayfayı göster, boşsa login'e yönlendir.
// App.jsx'te tüm korumalı Route'lar bu bileşenle sarılmıştır.
export default function PrivateRoute({ children }) {
  const { kullanici } = useAuth();
  return kullanici ? children : <Navigate to="/login" replace />;
}
