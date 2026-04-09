import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getStudentProfile, login, register, setAccessToken } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setToken] = useState(null);
  const [user, setUser] = useState(null); // { user_id, email }
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAccessToken(accessToken);
  }, [accessToken]);

  const refreshProfile = async () => {
    const p = await getStudentProfile();
    setProfile(p);
    return p;
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

  const doRegister = async ({ email, password, name, subject }) => {
    setLoading(true);
    try {
      const res = await register({ email, password, name, subject });
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
    setToken(null);
    setUser(null);
    setProfile(null);
    setAccessToken(null);
  };

  const value = useMemo(
    () => ({
      accessToken,
      user,
      profile,
      loading,
      login: doLogin,
      register: doRegister,
      logout,
      refreshProfile,
      isAuthenticated: Boolean(accessToken),
    }),
    [accessToken, user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}

