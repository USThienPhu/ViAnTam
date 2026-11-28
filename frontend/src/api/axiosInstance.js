import axios from 'axios';
import { getToken } from './authStorage';

// Mọi HTTP request của frontend phải đi qua instance này (convention.md mục 4).

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

// Hai endpoint này trả 401 khi nhập sai thông tin. Đó là lỗi của form, không phải phiên hết hạn.
const CREDENTIAL_ENDPOINTS = ['/auth/login', '/auth/register'];

let unauthorizedHandler = null;

// AuthContext đăng ký hàm này để logout khi server từ chối token (hết hạn, bị xóa tài khoản...).
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isUnauthorized = error.response?.status === 401;
    const isCredentialForm = CREDENTIAL_ENDPOINTS.includes(error.config?.url);
    if (isUnauthorized && !isCredentialForm && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
