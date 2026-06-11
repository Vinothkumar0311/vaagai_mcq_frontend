import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../services/api';

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ token, mockUser }, { rejectWithValue }) => {
    try {
      const data = await authApi.loginWithGoogle(token, mockUser);
      localStorage.setItem('mcq_token', data.token);
      localStorage.setItem('mcq_user', JSON.stringify(data.user));
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const loginExaminerWithRegNo = createAsyncThunk(
  'auth/loginRegNo',
  async (regNo, { rejectWithValue }) => {
    try {
      const data = await authApi.loginWithRegNo(regNo);
      localStorage.setItem('mcq_token', data.token);
      localStorage.setItem('mcq_user', JSON.stringify(data.user));
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const loadUserFromStorage = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('mcq_token');
      const user = localStorage.getItem('mcq_user');
      
      if (token && user) {
        return { token, user: JSON.parse(user) };
      }
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    loading: true,
    error: null
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('mcq_token');
      localStorage.removeItem('mcq_user');
      state.user = null;
      state.token = null;
      state.loading = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // loginUser
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // loginExaminerWithRegNo
      .addCase(loginExaminerWithRegNo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginExaminerWithRegNo.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loginExaminerWithRegNo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // loadUserFromStorage
      .addCase(loadUserFromStorage.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUserFromStorage.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
        }
      })
      .addCase(loadUserFromStorage.rejected, (state) => {
        state.loading = false;
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
