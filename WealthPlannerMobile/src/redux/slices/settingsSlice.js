import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { settingsAPI, savingsAPI } from '../../api/client';

// Async thunks
export const fetchSavings = createAsyncThunk(
    'settings/fetchSavings',
    async (year, { rejectWithValue }) => {
        try {
            const response = await savingsAPI.getSummary({ year });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to fetch savings');
        }
    }
);

export const resetAllData = createAsyncThunk(
    'settings/resetAllData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await settingsAPI.resetData();
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to reset data');
        }
    }
);

export const toggleThemeAPI = createAsyncThunk(
    'settings/toggleThemeAPI',
    async (_, { rejectWithValue }) => {
        try {
            const response = await settingsAPI.toggleTheme();
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to toggle theme');
        }
    }
);

const initialState = {
    savings: null,
    savingsYear: new Date().getFullYear(),
    loading: false,
    error: null,
};

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        setSavingsYear: (state, action) => {
            state.savingsYear = action.payload;
        },
        clearSettingsError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Savings
            .addCase(fetchSavings.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSavings.fulfilled, (state, action) => {
                state.loading = false;
                state.savings = action.payload;
            })
            .addCase(fetchSavings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Reset All Data
            .addCase(resetAllData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(resetAllData.fulfilled, (state) => {
                state.loading = false;
                state.savings = null;
            })
            .addCase(resetAllData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { setSavingsYear, clearSettingsError } = settingsSlice.actions;
export default settingsSlice.reducer;
