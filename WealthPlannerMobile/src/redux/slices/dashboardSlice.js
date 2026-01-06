import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardAPI, transactionAPI } from '../../api/client';

// Async thunks
export const fetchDashboard = createAsyncThunk(
    'dashboard/fetchDashboard',
    async ({ year, month }, { rejectWithValue }) => {
        try {
            const response = await dashboardAPI.getSummary({ year, month });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to fetch dashboard');
        }
    }
);

export const addTransaction = createAsyncThunk(
    'dashboard/addTransaction',
    async (data, { rejectWithValue }) => {
        try {
            const response = await transactionAPI.create(data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to add transaction');
        }
    }
);

export const updateTransaction = createAsyncThunk(
    'dashboard/updateTransaction',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await transactionAPI.update(id, data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to update transaction');
        }
    }
);

export const deleteTransaction = createAsyncThunk(
    'dashboard/deleteTransaction',
    async (id, { rejectWithValue }) => {
        try {
            await transactionAPI.delete(id);
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to delete transaction');
        }
    }
);

export const reorderTransactions = createAsyncThunk(
    'dashboard/reorderTransactions',
    async (order, { rejectWithValue }) => {
        try {
            await transactionAPI.reorder(order);
            return order;
        } catch (error) {
            return rejectWithValue(error.response?.data?.error || 'Failed to reorder');
        }
    }
);

const initialState = {
    data: null,
    transactions: [],
    totalIncome: 0,
    totalSpent: 0,
    balance: 0,
    categories: { needs: 0, wants: 0, savings: 0 },
    limits: { needs: 0, wants: 0, savings: 0 },
    advice: [],
    history: [],
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    loading: false,
    error: null,
};

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setCurrentDate: (state, action) => {
            state.currentYear = action.payload.year;
            state.currentMonth = action.payload.month;
        },
        clearDashboardError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Dashboard
            .addCase(fetchDashboard.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDashboard.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
                state.transactions = action.payload.transactions || [];
                state.totalIncome = action.payload.total_income || 0;
                state.totalSpent = action.payload.total_spent || 0;
                state.balance = action.payload.balance || 0;
                state.categories = action.payload.categories || { needs: 0, wants: 0, savings: 0 };
                state.limits = action.payload.limits || { needs: 0, wants: 0, savings: 0 };
                state.advice = action.payload.advice || [];
                state.history = action.payload.history || [];
            })
            .addCase(fetchDashboard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Add Transaction
            .addCase(addTransaction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addTransaction.fulfilled, (state, action) => {
                state.loading = false;
                state.transactions = [action.payload, ...state.transactions];
            })
            .addCase(addTransaction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Update Transaction
            .addCase(updateTransaction.fulfilled, (state, action) => {
                const index = state.transactions.findIndex(tx => tx.id === action.payload.id);
                if (index !== -1) {
                    state.transactions[index] = action.payload;
                }
            })
            // Delete Transaction
            .addCase(deleteTransaction.fulfilled, (state, action) => {
                state.transactions = state.transactions.filter(tx => tx.id !== action.payload);
            });
    },
});

export const { setCurrentDate, clearDashboardError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
