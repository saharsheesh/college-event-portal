import { useReducer } from 'react';
import { AuthContext } from './useAuth';
import * as api from '../services/api';

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false, error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, loading: false, error: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  // Read the saved session before the first render, so pages that load data on
  // mount already know who is logged in
  const [state, dispatch] = useReducer(authReducer, null, () => ({
    user: api.getSession(),
    loading: false,
    error: null,
  }));

  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const user = await api.login(email, password);
      dispatch({ type: 'SET_USER', payload: user });
      return user;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      throw err;
    }
  };

  const signup = async (userData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const user = await api.signup(userData);
      dispatch({ type: 'SET_USER', payload: user });
      return user;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      throw err;
    }
  };

  const logout = async () => {
    await api.logout();
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (updatedUser) => {
    const { password: _password, ...safeUser } = updatedUser;
    dispatch({ type: 'SET_USER', payload: safeUser });
  };

  const clearError = () => dispatch({ type: 'SET_ERROR', payload: null });

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, clearError, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
