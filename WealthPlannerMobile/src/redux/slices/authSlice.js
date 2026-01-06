import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { authAPI, userAPI, setTokens, clearTokens } from '../../api/client';

// Async thunks
export const checkUserStatus = createAsyncThunk(
    'auth/checkStatus',
    async (phone, { rejectWithValue }) => {
        try {
            const response = await authAPI.checkStatus(phone);
            return { phone, exists: response.data.exists, pinSet: response.data.pin_set };
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to check status');
        }
    }
);

export const loginWithPIN = createAsyncThunk(
    'auth/loginWithPIN',
    async ({ phone, pin }, { rejectWithValue }) => {
        try {
            const response = await authAPI.loginPin({ phone, pin });
            const { tokens, user, is_new_user } = response.data;
            await setTokens(tokens.access, tokens.refresh);
            return { tokens, user, isNewUser: is_new_user };
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Login failed');
        }
    }
);

export const registerWithPIN = createAsyncThunk(
    'auth/registerWithPIN',
    async ({ phone, pin, name }, { rejectWithValue }) => {
        try {
            const response = await authAPI.register({ phone, pin, name });
            const { tokens, user, is_new_user } = response.data;
            await setTokens(tokens.access, tokens.refresh);
            return { tokens, user, isNewUser: is_new_user };
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Registration failed');
        }
    }
);

export const setupUser = createAsyncThunk(
    'auth/setupUser',
    async (data, { rejectWithValue }) => {
        try {
            const response = await userAPI.setupUser(data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to save name');
        }
    }
);

export const fetchUserProfile = createAsyncThunk(
    'auth/fetchUserProfile',
    async (_, { rejectWithValue }) => {
        try {
            const response = await userAPI.getProfile();
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to fetch profile');
        }
    }
);

export const updateUserProfile = createAsyncThunk(
    'auth/updateUserProfile',
    async (data, { rejectWithValue }) => {
        try {
            const response = await userAPI.updateProfile(data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to update profile');
        }
    }
);

const initialState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isNewUser: false,
    pendingPhone: null,
    loading: false,
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.tokens = null;
            state.isAuthenticated = false;
            state.isNewUser = false;
            state.pendingPhone = null;
            state.error = null;
            // Clear tokens from AsyncStorage
            clearTokens();
        },
        clearError: (state) => {
            state.error = null;
        },
        setNewUserComplete: (state) => {
            state.isNewUser = false;
        },
        restoreAuth: (state, action) => {
            if (action.payload?.tokens) {
                state.tokens = action.payload.tokens;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.tokens.access}`;
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Check Status
            .addCase(checkUserStatus.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(checkUserStatus.fulfilled, (state, action) => {
                state.loading = false;
                state.pendingPhone = action.payload.phone;
            })
            .addCase(checkUserStatus.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Login PIN
            .addCase(loginWithPIN.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginWithPIN.fulfilled, (state, action) => {
                state.loading = false;
                state.tokens = action.payload.tokens;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.isNewUser = action.payload.isNewUser;
                state.pendingPhone = null;
            })
            .addCase(loginWithPIN.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Register PIN
            .addCase(registerWithPIN.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registerWithPIN.fulfilled, (state, action) => {
                state.loading = false;
                state.tokens = action.payload.tokens;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.isNewUser = action.payload.isNewUser; // Should be true, or logic handled elsewhere
                state.pendingPhone = null;
            })
            .addCase(registerWithPIN.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Setup User
            .addCase(setupUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(setupUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.isNewUser = false;
            })
            .addCase(setupUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch User Profile
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.user = action.payload;
            })
            // Update User Profile
            .addCase(updateUserProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { logout, clearError, setNewUserComplete, restoreAuth } = authSlice.actions;
export default authSlice.reducer;
