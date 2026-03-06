import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const loginUser = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logoutUser = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  
  const isAdmin = !!token;

  return (
    <AuthContext.Provider value={{ token, isAdmin, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);