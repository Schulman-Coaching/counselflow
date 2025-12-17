import { useState, useEffect, useCallback } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const user = await response.json();
          setState({ user, loading: false });
        } else {
          setState({ user: null, loading: false });
        }
      } catch {
        setState({ user: null, loading: false });
      }
    };

    checkAuth();
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setState({ user: null, loading: false });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  return {
    ...state,
    logout,
  };
}
