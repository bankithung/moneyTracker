import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewUser, setIsNewUser] = useState(false);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('accessToken');
            const storedUser = await AsyncStorage.getItem('user');

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            }
        } catch (e) {
            console.log('Error loading auth:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (tokens, userData, newUser = false) => {
        try {
            await AsyncStorage.setItem('accessToken', tokens.access);
            await AsyncStorage.setItem('refreshToken', tokens.refresh);
            await AsyncStorage.setItem('user', JSON.stringify(userData));

            setToken(tokens.access);
            setUser(userData);
            setIsNewUser(newUser);
            api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
        } catch (e) {
            console.log('Error storing auth:', e);
        }
    };

    const updateUser = async (userData) => {
        try {
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            setIsNewUser(false);
        } catch (e) {
            console.log('Error updating user:', e);
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('accessToken');
            await AsyncStorage.removeItem('refreshToken');
            await AsyncStorage.removeItem('user');

            setToken(null);
            setUser(null);
            setIsNewUser(false);
            delete api.defaults.headers.common['Authorization'];
        } catch (e) {
            console.log('Error logging out:', e);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isLoading,
            isNewUser,
            isAuthenticated: !!token,
            login,
            logout,
            updateUser,
            setIsNewUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
