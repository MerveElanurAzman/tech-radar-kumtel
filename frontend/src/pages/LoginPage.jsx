import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await login({ username, password });
      loginUser(res.data.token);
      navigate('/admin');
    } catch (err) {
      setError('Kullanıcı adı veya şifre hatalı',err);
    }
  };

  return (
    <div className="min-h-screen bg-[#eff7f8] flex items-center justify-center px-4 sm:px-6 py-10 relative">
      {/* Geri butonu: mobilde görünür + kartın üstünde sabit */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-[#006a76] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#005a64] transition"
      >
        Geri
      </button>

      {/* Kart */}
      <div className="bg-[#007c8b] rounded-2xl w-full max-w-md shadow-lg p-6 sm:p-8 mx-auto">
        <h1 className="text-white text-xl sm:text-xl font-bold mb-6 text-center">
          Admin Girişi
        </h1>

        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-white text-sm mb-1 block">Kullanıcı Adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#eff7f8] text-[#007c8b] p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label className="text-white text-sm mb-1 block">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#eff7f8] text-[#007c8b] p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#006a76] hover:bg-[#005a64] text-white p-3 rounded-lg font-semibold transition"
          >
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;