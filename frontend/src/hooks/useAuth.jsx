import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getStudentProfile, login, register, setAccessToken } from "../lib/api.js";

const AuthContext = createContext(null);

const STORAGE_TOKEN_KEY = "adaptlearn.accessToken";
const STORAGE_USER_KEY = "adaptlearn.user";

function readStorage(key) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures (e.g. private mode restrictions).
  }
}

function removeStorage(key) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function AuthProvider({ children }) {
  const [accessToken, setToken] = useState(null);
  const [user, setUser] = useState(null); // { user_id, email }
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const clearSession = () => {
    setToken(null);
    setUser(null);
    setProfile(null);
    setAccessToken(null);
    removeStorage(STORAGE_TOKEN_KEY);
    removeStorage(STORAGE_USER_KEY);
  };

  useEffect(() => {
    setAccessToken(accessToken);
    if (accessToken) writeStorage(STORAGE_TOKEN_KEY, accessToken);
    else removeStorage(STORAGE_TOKEN_KEY);
  }, [accessToken]);

  useEffect(() => {
    if (user) writeStorage(STORAGE_USER_KEY, JSON.stringify(user));
    else removeStorage(STORAGE_USER_KEY);
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      const persistedToken = readStorage(STORAGE_TOKEN_KEY);
      const persistedUserRaw = readStorage(STORAGE_USER_KEY);

      if (!persistedToken) {
        if (!cancelled) setInitializing(false);
        return;
      }

      setAccessToken(persistedToken);
      if (!cancelled) setToken(persistedToken);

      if (persistedUserRaw) {
        try {
          const parsed = JSON.parse(persistedUserRaw);
          if (!cancelled && parsed && typeof parsed === "object") setUser(parsed);
        } catch {
          removeStorage(STORAGE_USER_KEY);
        }
      }

      try {
        const p = await getStudentProfile();
        if (!cancelled) {
          setProfile(p);
          // Keep at least user_id available after reload.
          setUser((prev) => prev || { user_id: p?.id || "", email: "" });
        }
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshProfile = async () => {
    try {
      const p = await getStudentProfile();
      setProfile(p);
      return p;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) clearSession();
      throw err;
    }
  };

  const doLogin = async ({ email, password }) => {
    setLoading(true);
    try {
      const res = await login({ email, password });
      // Set API auth header immediately so the next protected call includes Bearer.
      setAccessToken(res.access_token);
      setToken(res.access_token);
      setUser({ user_id: res.user_id, email: res.email });
      const p = await refreshProfile();
      return { ...res, profile: p };
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async ({ email, password, name }) => {
    setLoading(true);
    try {
      const res = await register({ email, password, name });
      // Set API auth header immediately so the next protected call includes Bearer.
      setAccessToken(res.access_token);
      setToken(res.access_token);
      setUser({ user_id: res.user_id, email: res.email });
      const p = await refreshProfile();
      return { ...res, profile: p };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
  };

  const value = useMemo(
    () => ({
      accessToken,
      user,
      profile,
      loading,
      initializing,
      login: doLogin,
      register: doRegister,
      logout,
      refreshProfile,
      isAuthenticated: Boolean(accessToken),
    }),
    [accessToken, user, profile, loading, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}

