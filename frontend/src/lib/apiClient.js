import axios from 'axios';
import { supabase } from './supabaseClient.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://budget-planner-f5qb.onrender.com/api';

const apiClient = axios.create({ baseURL: BASE_URL });

// Auto-inject Supabase JWT on every request
apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      console.warn('Received 401, clearing session...');
      supabase.auth.signOut().then(() => {
        window.location.href = '/login';
      });
    }
    const message = err.response?.data?.error || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
