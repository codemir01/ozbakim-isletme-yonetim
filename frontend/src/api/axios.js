import axios from 'axios';

// Tüm API isteklerinde kullanılan merkezi Axios instance.
// baseURL sayesinde her yerde '/musteriler' yazmak yeterli, tam URL tekrarlanmaz.
const api = axios.create({
  baseURL: 'http://localhost:5096/api/v1',
});

// Request Interceptor: Her istek gitmeden önce çalışır.
// localStorage'daki token'ı Authorization header'ına ekler.
// Sayesinde her API çağrısında elle token yazmak gerekmez.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Gelen yanıt 401 (Unauthorized) ise çalışır.
// Token süresi dolmuş veya geçersizse kullanıcıyı login sayfasına at.
api.interceptors.response.use(
  (response) => response, // Başarılı yanıtları olduğu gibi geçir
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('kullanici');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
