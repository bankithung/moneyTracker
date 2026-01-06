import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme/colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(false);
    const theme = isDark ? darkTheme : lightTheme;

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('theme');
            if (savedTheme === 'dark') {
                setIsDark(true);
            }
        } catch (e) {
            console.log('Error loading theme:', e);
        }
    };

    const toggleTheme = async () => {
        const newTheme = isDark ? 'light' : 'dark';
        setIsDark(!isDark);
        await AsyncStorage.setItem('theme', newTheme);
    };

    const setTheme = async (themeName) => {
        setIsDark(themeName === 'dark');
        await AsyncStorage.setItem('theme', themeName);
    };

    return (
        <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
