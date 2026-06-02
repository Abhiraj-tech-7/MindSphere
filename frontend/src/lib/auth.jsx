import React, { createContext, useContext, useEffect, useState } from "react";
import { http } from "./api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    const token = localStorage.getItem("ms_token");
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await http.get("/auth/me");
      setUser(data);
    } catch (e) {
      localStorage.removeItem("ms_token");
    }
    setLoading(false);
  };

  useEffect(() => { fetchMe(); }, []);

  const login = async (email, password) => {
    const { data } = await http.post("/auth/login", { email, password });
    localStorage.setItem("ms_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await http.post("/auth/register", { name, email, password });
    localStorage.setItem("ms_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("ms_token");
    setUser(null);
    window.location.href = "/";
  };

  const refresh = fetchMe;

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
