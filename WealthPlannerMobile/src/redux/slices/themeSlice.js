import { createSlice } from '@reduxjs/toolkit';
import { lightTheme, darkTheme } from '../../theme/colors';

const initialState = {
    isDark: false,
    theme: lightTheme,
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        toggleTheme: (state) => {
            state.isDark = !state.isDark;
            state.theme = state.isDark ? darkTheme : lightTheme;
        },
        setTheme: (state, action) => {
            state.isDark = action.payload === 'dark';
            state.theme = state.isDark ? darkTheme : lightTheme;
        },
    },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
