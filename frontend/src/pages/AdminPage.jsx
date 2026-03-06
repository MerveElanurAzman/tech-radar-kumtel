import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRadarItems,
  createRadarItem,
  updateRadarItem,
  deleteRadarItem,
  updateCredentials,
  getApiKeys,
  createApiKey,
  deleteApiKey,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const QUADRANTS = ['Application & Development', 'DataBase & Data Layer', 'Infrastructure', 'Collaboration & Other'];
const RINGS = ['Adopt', 'Trial', 'Assess', 'Hold'];

function AdminPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', quadrant: QUADRANTS[0], ring: RINGS[0], description: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('items');
  const [credentials, setCredentials] = useState({
    currentPassword: '',
    newUsername: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  const [credError, setCredError] = useState('');
  const [credSuccess, setCredSuccess] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyResult, setNewKeyResult] = useState(null);

  const exportMenuRef = useRef(null);
  const { isAdmin, logoutUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchItems = async () => {
    const res = await getRadarItems();
    setItems(res.data);
  };

  const fetchApiKeys = async () => {
    const res = await getApiKeys();
    setApiKeys(res.data);
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate('/login');
      return;
    }
    fetchItems();
    fetchApiKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await updateRadarItem(editingId, form);
      } else {
        await createRadarItem(form);
      }
      setForm({ name: '', quadrant: QUADRANTS[0], ring: RINGS[0], description: '' });
      setEditingId(null);
      fetchItems();
    } catch (err) {
      setError('Bir hata oluştu',err);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      quadrant: item.quadrant,
      ring: item.ring,
      description: item.description,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu item silinecek, emin misin?')) return;
    await deleteRadarItem(id);
    fetchItems();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`${selectedIds.length} item silinecek, emin misin?`)) return;
    await Promise.all(selectedIds.map((id) => deleteRadarItem(id)));
    setSelectedIds([]);
    setSelectMode(false);
    fetchItems();
  };

  const handleCancelSelect = () => {
    setSelectedIds([]);
    setSelectMode(false);
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const handleCredentials = async (e) => {
    e.preventDefault();
    setCredError('');
    setCredSuccess('');
    if (credentials.newPassword !== credentials.newPasswordConfirm) {
      setCredError('Yeni şifreler eşleşmiyor');
      return;
    }
    try {
      await updateCredentials({
        currentPassword: credentials.currentPassword,
        newUsername: credentials.newUsername,
        newPassword: credentials.newPassword,
      });
      setCredSuccess('Bilgiler başarıyla güncellendi');
      setCredentials({ currentPassword: '', newUsername: '', newPassword: '', newPasswordConfirm: '' });
    } catch (err) {
      setCredError(err.response?.data?.message || 'Bir hata oluştu');
    }
  };

  const handleExportExcel = () => {
    const data = items.map((item) => ({
      'Teknoloji İsmi': item.name,
      Kadran: item.quadrant,
      Halka: item.ring,
      Açıklama: item.description || '',
      'Eklenme Tarihi': item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tech Radar');
    XLSX.writeFile(wb, 'kumtel-tech-radar.xlsx');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(0, 124, 139);
    doc.text('KUMTEL Tech Radar', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Teknoloji İsmi', 'Kadran', 'Halka', 'Açıklama']],
      body: items.map((item) => [item.name, item.quadrant, item.ring, item.description || '']),
      headStyles: { fillColor: [0, 124, 139] },
      alternateRowStyles: { fillColor: [240, 247, 248] },
      styles: { fontSize: 9 },
    });

    doc.save('kumtel-tech-radar.pdf');
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.quadrant.toLowerCase().includes(search.toLowerCase()) ||
      item.ring.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortField) return 0;

    if (sortField === 'ring') {
      const ringOrder = { Adopt: 1, Trial: 2, Assess: 3, Hold: 4 };
      const aVal = ringOrder[a.ring] ?? 99;
      const bVal = ringOrder[b.ring] ?? 99;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const aVal = a[sortField]?.toLowerCase?.() ?? '';
    const bVal = b[sortField]?.toLowerCase?.() ?? '';
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const allSelected = filteredItems.length > 0 && selectedIds.length === filteredItems.length;

  // ⚠️ Render içinde component oluşturma uyarısını önlemek için render dışına taşımak idealdir.
  // Senin projede hata veriyordu: "Cannot create components during render"
  // Bu yüzden icon'u burada değil aşağıda inline yazacağız.

  return (
    <div className="min-h-screen bg-[#eff7f8] overflow-x-hidden p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[1400px] mx-auto">
        {/* Header (mobilde wrap) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#007c8b] leading-tight">
            KUMTEL Admin Panel
          </h1>

          {/* Butonlar: flex-wrap sayesinde mobilde taşmaz */}
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            {/* İndir butonu */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-[#005f6b] hover:bg-[#004f5a] text-white font-semibold px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base whitespace-nowrap"
              >
                İndir
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg z-10 overflow-hidden border border-gray-100">
                  <button
                    onClick={() => {
                      handleExportExcel();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-[#005f6b] hover:bg-[#eff7f8] font-semibold text-sm transition"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => {
                      handleExportPDF();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-[#005f6b] hover:bg-[#eff7f8] font-semibold text-sm border-t border-gray-100 transition"
                  >
                    PDF
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/')}
              className="bg-[#007c8b] text-white font-semibold hover:bg-[#006270] px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base whitespace-nowrap"
            >
              Radara Git
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'settings' ? 'items' : 'settings')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition font-semibold text-sm sm:text-base whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-white text-[#007c8b]'
                  : 'bg-[#005f6b] text-white hover:bg-[#004f5a]'
              }`}
            >
              Ayarlar
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'apikeys' ? 'items' : 'apikeys')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition font-semibold text-sm sm:text-base whitespace-nowrap ${
                activeTab === 'apikeys'
                  ? 'bg-white text-[#007c8b]'
                  : 'bg-[#005f6b] text-white hover:bg-[#004f5a]'
              }`}
            >
              API Keys
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base whitespace-nowrap"
            >
              Çıkış Yap
            </button>
          </div>
        </div>

        {/* Ayarlar Tab */}
        {activeTab === 'settings' ? (
          <div className="bg-[#007c8b] p-4 sm:p-6 rounded-2xl mb-8 text-white">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Giriş Bilgilerini Güncelle</h2>

            {credError && <div className="bg-red-500 text-white p-3 rounded mb-4 text-sm">{credError}</div>}
            {credSuccess && <div className="bg-green-500 text-white p-3 rounded mb-4 text-sm">{credSuccess}</div>}

            {/* Mobilde 1 kolon, md+ 2 kolon */}
            <form onSubmit={handleCredentials} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-white text-sm mb-1 block">Mevcut Şifre *</label>
                <input
                  type="password"
                  value={credentials.currentPassword}
                  onChange={(e) => setCredentials({ ...credentials, currentPassword: e.target.value })}
                  className="w-full bg-white text-[#007c8b] p-3 rounded-lg outline-none focus:ring-2 focus:ring-white"
                  required
                />
              </div>

              <div>
                <label className="text-white text-sm mb-1 block">Yeni Kullanıcı Adı</label>
                <input
                  type="text"
                  value={credentials.newUsername}
                  onChange={(e) => setCredentials({ ...credentials, newUsername: e.target.value })}
                  className="w-full bg-white text-[#007c8b] p-3 rounded-lg outline-none focus:ring-2 focus:ring-white"
                  placeholder="Boş bırakmayınız"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-1 block">Yeni Şifre</label>
                <input
                  type="password"
                  value={credentials.newPassword}
                  onChange={(e) => setCredentials({ ...credentials, newPassword: e.target.value })}
                  className="w-full bg-white text-[#007c8b] p-3 rounded-lg outline-none focus:ring-2 focus:ring-white"
                  placeholder="Boş bırakmayınız"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-white text-sm mb-1 block">Yeni Şifre Tekrar</label>
                <input
                  type="password"
                  value={credentials.newPasswordConfirm}
                  onChange={(e) => setCredentials({ ...credentials, newPasswordConfirm: e.target.value })}
                  className="w-full bg-white text-[#007c8b] p-3 rounded-lg outline-none focus:ring-2 focus:ring-white"
                  placeholder="Boş bırakmayınız"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="bg-[#005f6b] hover:bg-[#004f5a] text-white font-bold px-6 py-2 rounded-lg transition"
                >
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        ) : activeTab === 'apikeys' ? (
          <div className="bg-[#007c8b] p-4 sm:p-6 rounded-2xl mb-8 text-white">
            <h2 className="text-lg sm:text-xl font-semibold mb-6">API Key Yönetimi</h2>

            {/* Yeni key oluştur */}
            <div className="mb-6">
              <label className="text-white text-sm mb-1 block">Key Adı</label>

              {/* Mobilde alt alta */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="örn: Entegrasyon Sistemi"
                  className="w-full sm:flex-1 bg-white text-[#007c8b] p-3 rounded-lg outline-none focus:ring-2 focus:ring-white"
                />

                <button
                  type="button"
                  onClick={async () => {
                    if (!newKeyName) return;
                    const res = await createApiKey({ name: newKeyName });
                    setNewKeyResult(res.data);
                    setNewKeyName('');
                    fetchApiKeys();
                  }}
                  className="bg-[#005f6b] hover:bg-[#004f5a] text-white font-bold px-6 py-2 rounded-lg transition whitespace-nowrap"
                >
                  Oluştur
                </button>
              </div>
            </div>

            {/* Yeni oluşturulan key */}
            {newKeyResult && (
              <div className="mb-6 bg-green-600 p-4 rounded-xl">
                <p className="text-white text-sm font-semibold mb-2">
                  ✅ API Key oluşturuldu! Şimdi kopyala, bir daha gösterilmeyecek:
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <code className="bg-white text-green-700 px-3 py-2 rounded text-sm break-all">
                    {newKeyResult.key}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(newKeyResult.key)}
                    className="bg-white text-green-700 font-bold px-4 py-2 rounded hover:bg-gray-100 transition whitespace-nowrap"
                  >
                    Kopyala
                  </button>
                </div>
                <button onClick={() => setNewKeyResult(null)} className="mt-2 text-white text-xs underline">
                  Kapat
                </button>
              </div>
            )}

            {/* Mevcut keyler (tabloda sadece tablo kayar) */}
            <div className="rounded-xl overflow-hidden mb-6 bg-white">
              <div className="w-full overflow-x-auto">
                <table className="min-w-[720px] w-full">
                  <thead className="bg-[#005f6b]">
                    <tr>
                      <th className="text-left p-4 text-white whitespace-nowrap">Ad</th>
                      <th className="text-left p-4 text-white whitespace-nowrap">Key (gizli)</th>
                      <th className="text-left p-4 text-white whitespace-nowrap">Oluşturulma</th>
                      <th className="text-left p-4 text-white whitespace-nowrap">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#d8ebee] text-[#005f6b]">
                    {apiKeys.map((key) => (
                      <tr key={key.id} className="border-t border-[#b7d9de]">
                        <td className="p-4 font-semibold">{key.name}</td>
                        <td className="p-4 text-sm font-mono whitespace-nowrap">
                          {key.key.substring(0, 20)}...
                        </td>
                        <td className="p-4 text-sm whitespace-nowrap">
                          {new Date(key.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={async () => {
                              if (!window.confirm('Bu API key silinecek, emin misin?')) return;
                              await deleteApiKey(key.id);
                              fetchApiKeys();
                            }}
                            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white text-sm transition whitespace-nowrap"
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                    {apiKeys.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-[#007c8b]">
                          Henüz API key oluşturulmadı
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kullanım bilgisi */}
            <div className="bg-[#005f6b] p-4 rounded-xl">
              <p className="text-white text-sm font-semibold mb-2">API Kullanımı</p>
              <p className="text-white text-xs mb-2">Tüm isteklerde header'a ekle:</p>
              <code className="bg-white text-[#007c8b] px-3 py-2 rounded text-xs block mb-3 break-all">
                x-api-key: kumtel_xxxxx...
              </code>
              <p className="text-white text-xs font-semibold mb-1">Endpoint'ler:</p>
              <code className="bg-white text-[#007c8b] px-3 py-2 rounded text-xs block whitespace-pre break-all">{`GET    /api/radar         → Tüm itemları getir
POST   /api/radar         → Yeni item ekle
PUT    /api/radar/:id     → Item güncelle
DELETE /api/radar/:id     → Item sil`}</code>
            </div>
          </div>
        ) : (
          <>
            {/* Item Ekleme Formu */}
            <div className="bg-[#007c8b] p-4 sm:p-6 rounded-2xl mb-6 sm:mb-8 text-white">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">
                {editingId ? 'Item Düzenle' : 'Yeni Item Ekle'}
              </h2>
              {error && <div className="bg-red-500 text-white p-3 rounded mb-4 text-sm">{error}</div>}

              {/* Mobilde 1 kolon, md+ 2 kolon */}
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm mb-1 block">Teknoloji İsmi</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white text-[#007c8b] p-3 rounded-lg outline-none focus:ring-2 focus:ring-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-white text-sm mb-1 block">Kadran</label>
                  <select
                    value={form.quadrant}
                    onChange={(e) => setForm({ ...form, quadrant: e.target.value })}
                    className="w-full bg-white text-[#007c8b] p-3 rounded-lg outline-none focus:ring-2 focus:ring-white"
                  >
                    {QUADRANTS.map((q) => (
                      <option key={q}>{q}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-white text-sm mb-1 block">Halka</label>
                  <select
                    value={form.ring}
                    onChange={(e) => setForm({ ...form, ring: e.target.value })}
                    className="w-full bg-white text-[#007c8b] p-3 rounded-lg outline-none focus:ring-2 focus:ring-white"
                  >
                    {RINGS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-white text-sm mb-1 block">Açıklama</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-white text-[#007c8b] p-3 rounded-lg outline-none focus:ring-2 focus:ring-white"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="bg-[#005f6b] hover:bg-[#004f5a] text-white font-bold px-6 py-2 rounded-lg transition"
                  >
                    {editingId ? 'Güncelle' : 'Ekle'}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setForm({ name: '', quadrant: QUADRANTS[0], ring: RINGS[0], description: '' });
                      }}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition"
                    >
                      İptal
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Search Bar (mobilde alt alta) */}
            <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                placeholder="Teknoloji ara... (ad, kadran, halka veya açıklama)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white text-[#007c8b] p-3 rounded-lg outline-none border border-[#007c8b] focus:ring-2 focus:ring-[#007c8b] placeholder-[#7ab8c0]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="bg-[#007c8b] text-white px-4 py-3 rounded-lg hover:bg-[#006270] transition whitespace-nowrap"
                >
                  Temizle
                </button>
              )}
            </div>

            {/* Alt bilgi ve seçim kontrolleri */}
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-[#007c8b] text-sm">
                {search ? `${filteredItems.length} sonuç bulundu` : `Toplam ${items.length} teknoloji`}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {!selectMode ? (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="bg-[#007c8b] text-white px-4 py-2 rounded-lg text-sm font-semibold transition hover:bg-[#006270] whitespace-nowrap"
                  >
                    Seç
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSelectAll}
                      className="bg-[#007c8b] text-white px-4 py-2 rounded-lg text-sm font-semibold transition hover:bg-[#006270] whitespace-nowrap"
                    >
                      {allSelected ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                    </button>

                    {selectedIds.length > 0 && (
                      <button
                        onClick={handleBulkDelete}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap"
                      >
                        {selectedIds.length} Seçiliyi Sil
                      </button>
                    )}

                    <button
                      onClick={handleCancelSelect}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap"
                    >
                      İptal
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Items Tablosu (sayfa değil, sadece tablo yatay kayar) */}
            <div className="rounded-2xl overflow-hidden bg-white">
              <div className="w-full overflow-x-auto">
                <table className="min-w-[980px] w-full">
                  <thead className="bg-[#007c8b] text-white">
                    <tr>
                      {selectMode && <th className="p-4 w-10"></th>}

                      <th
                        className="text-left p-4 cursor-pointer hover:bg-[#006270] select-none transition whitespace-nowrap"
                        onClick={() => handleSort('name')}
                      >
                        Ad{' '}
                        <span className="ml-1">
                          {sortField !== 'name' ? (
                            <span className="opacity-30">↕</span>
                          ) : (
                            <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </span>
                      </th>

                      <th
                        className="text-left p-4 cursor-pointer hover:bg-[#006270] select-none transition whitespace-nowrap"
                        onClick={() => handleSort('quadrant')}
                      >
                        Kadran{' '}
                        <span className="ml-1">
                          {sortField !== 'quadrant' ? (
                            <span className="opacity-30">↕</span>
                          ) : (
                            <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </span>
                      </th>

                      <th
                        className="text-left p-4 cursor-pointer hover:bg-[#006270] select-none transition whitespace-nowrap"
                        onClick={() => handleSort('ring')}
                      >
                        Halka{' '}
                        <span className="ml-1">
                          {sortField !== 'ring' ? (
                            <span className="opacity-30">↕</span>
                          ) : (
                            <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </span>
                      </th>

                      <th className="text-left p-4 whitespace-nowrap">Açıklama</th>
                      <th className="text-left p-4 whitespace-nowrap">İşlemler</th>
                    </tr>
                  </thead>

                  <tbody className="bg-[#d8ebee] text-[#005f6b]">
                    {sortedItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-t border-[#b7d9de] transition ${
                          selectedIds.includes(item.id) ? 'bg-[#c2dfe4]' : ''
                        }`}
                      >
                        {selectMode && (
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={() => handleSelectOne(item.id)}
                              className="w-4 h-4 cursor-pointer accent-[#007c8b]"
                            />
                          </td>
                        )}

                        <td className="p-4 whitespace-nowrap">{item.name}</td>

                        <td className="p-4 text-[#005f6b]">
                          <span className="break-words">{item.quadrant}</span>
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-white rounded text-xs font-semibold ${
                              item.ring === 'Adopt'
                                ? 'bg-green-600'
                                : item.ring === 'Trial'
                                ? 'bg-blue-600'
                                : item.ring === 'Assess'
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                            }`}
                          >
                            {item.ring}
                          </span>
                        </td>

                        <td className="p-4 text-[#005f6b] text-sm">
                          <span className="break-words">{item.description}</span>
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-white transition whitespace-nowrap"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white transition whitespace-nowrap"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {sortedItems.length === 0 && (
                      <tr>
                        <td colSpan={selectMode ? 6 : 5} className="p-8 text-center text-[#007c8b]">
                          Sonuç bulunamadı
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminPage;