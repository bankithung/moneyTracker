import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your Django server's IP address
const BASE_URL = 'https://1a492af93e56.ngrok-free.app';

// Token keys in AsyncStorage
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Create axios instance
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Token management functions
export const getAccessToken = async () => {
    try {
        return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
        console.error('Error getting access token:', error);
        return null;
    }
};

export const getRefreshToken = async () => {
    try {
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
        console.error('Error getting refresh token:', error);
        return null;
    }
};

export const setTokens = async (accessToken, refreshToken) => {
    try {
        await AsyncStorage.multiSet([
            [ACCESS_TOKEN_KEY, accessToken],
            [REFRESH_TOKEN_KEY, refreshToken],
        ]);
        // Update axios default header
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        return true;
    } catch (error) {
        console.error('Error setting tokens:', error);
        return false;
    }
};

export const clearTokens = async () => {
    try {
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
        delete api.defaults.headers.common['Authorization'];
        return true;
    } catch (error) {
        console.error('Error clearing tokens:', error);
        return false;
    }
};

// Initialize auth header from storage on app start
export const initializeAuth = async () => {
    const token = await getAccessToken();
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return true;
    }
    return false;
};

// Request interceptor - ensure token is always attached
api.interceptors.request.use(
    async (config) => {
        // Always get fresh token from AsyncStorage for each request
        const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle token refresh
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
    refreshSubscribers.push(callback);
};

const onTokenRefreshed = (newToken) => {
    refreshSubscribers.forEach((callback) => callback(newToken));
    refreshSubscribers = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Wait for token refresh
                return new Promise((resolve) => {
                    subscribeTokenRefresh((newToken) => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = await getRefreshToken();
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                const response = await axios.post(`${BASE_URL}/api/token/refresh/`, {
                    refresh: refreshToken,
                });

                const { access, refresh } = response.data;
                await setTokens(access, refresh);

                isRefreshing = false;
                onTokenRefreshed(access);

                originalRequest.headers.Authorization = `Bearer ${access}`;
                return api(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                await clearTokens();
                // Don't reject - let the app handle logout via Redux
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    checkStatus: (phone) => api.post('/api/auth/check-status/', { phone }), // New
    register: (data) => api.post('/api/auth/register/', data), // New
    loginPin: (data) => api.post('/api/auth/login-pin/', data), // New
};

// User API
export const userAPI = {
    getProfile: () => api.get('/api/user/profile/'),
    updateProfile: (data) => api.put('/api/user/profile/', data),
    setupUser: (data) => api.post('/api/user/setup/', data),
};

// Transaction API
export const transactionAPI = {
    list: (params) => api.get('/api/transactions/', { params }),
    create: (data) => api.post('/api/transactions/', data),
    get: (id) => api.get(`/api/transactions/${id}/`),
    update: (id, data) => api.put(`/api/transactions/${id}/`, data),
    delete: (id) => api.delete(`/api/transactions/${id}/`),
    reorder: (order) => api.post('/api/transactions/reorder/', { order }),
};

// Dashboard API
export const dashboardAPI = {
    getSummary: (params) => api.get('/api/dashboard/', { params }),
};

// Savings API
export const savingsAPI = {
    getSummary: (params) => api.get('/api/savings/', { params }),
};

// Settings API
export const settingsAPI = {
    resetData: () => api.post('/api/settings/reset/'),
    toggleTheme: () => api.post('/api/settings/toggle-theme/'),
};

export default api;
