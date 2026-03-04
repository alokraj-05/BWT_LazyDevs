import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("kg_token");
    if (token) {
      api.me()
        .then(data => { if (!data.error) setUser(data); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    if (data.error) throw new Error(data.error);
    localStorage.setItem("kg_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password, org_name) => {
    const data = await api.register({ name, email, password, org_name });
    if (data.error) throw new Error(data.error);
    localStorage.setItem("kg_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("kg_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
