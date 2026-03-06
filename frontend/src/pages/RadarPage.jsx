import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRadarItems } from '../services/api';
import { useAuth } from '../context/AuthContext';

const QUADRANTS = [
  'Application & Development',
  'DataBase & Data Layer',
  'Infrastructure',
  'Collaboration & Other',
];

const RINGS = ['Adopt', 'Trial', 'Assess', 'Hold'];

const RING_COLORS = {
  Adopt: '#22c55e',
  Trial: '#3b82f6',
  Assess: '#eab308',
  Hold: '#ef4444',
};

const QUADRANT_ANGLES = {
  'DataBase & Data Layer': 0, // sağ üst
  'Collaboration & Other': 1, // sağ alt
  Infrastructure: 2,          // sol alt
  'Application & Development': 3, // sol üst
};

const hashStringToInt = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

function RadarPage() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);

  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getRadarItems().then((res) => setItems(res.data));
  }, []);

  // -------------------------
  // Çakışma önleme (collision)
  // -------------------------
  const DOT_R = 12;
  const MIN_DIST = DOT_R * 2 + 4; // 28

  const dist2 = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  };

  const getItemPositionWithAvoidance = (item, placed) => {
    const quadrantIndex = QUADRANT_ANGLES[item.quadrant];
    const ringIndex = RINGS.indexOf(item.ring);

    const centerX = 400;
    const centerY = 400;

    const ringRadii = [90, 180, 270, 360];
    const innerRadius = ringIndex === 0 ? 15 : ringRadii[ringIndex - 1] + 15;
    const outerRadius = ringRadii[ringIndex] - 15;

    const rand = mulberry32(hashStringToInt(String(item.id)));
    const startAngle = quadrantIndex * 90 - 90;

    for (let attempt = 0; attempt < 60; attempt++) {
      const radius = innerRadius + rand() * (outerRadius - innerRadius);

      const angleDeg = startAngle + 8 + ((rand() + attempt * 0.07) % 1) * 74;
      const angle = angleDeg * (Math.PI / 180);

      const pos = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };

      let ok = true;
      for (const p of placed) {
        if (dist2(pos, p) < MIN_DIST * MIN_DIST) {
          ok = false;
          break;
        }
      }

      if (ok) return pos;
    }

    const fallbackRadius = (innerRadius + outerRadius) / 2;
    const fallbackAngle = (startAngle + 45) * (Math.PI / 180);
    return {
      x: centerX + fallbackRadius * Math.cos(fallbackAngle),
      y: centerY + fallbackRadius * Math.sin(fallbackAngle),
    };
  };

  const positions = useMemo(() => {
    const map = {};
    const placedByGroup = new Map();

    for (const item of items) {
      const key = `${item.quadrant}__${item.ring}`;
      if (!placedByGroup.has(key)) placedByGroup.set(key, []);
      const placed = placedByGroup.get(key);

      const pos = getItemPositionWithAvoidance(item, placed);
      map[item.id] = pos;
      placed.push(pos);
    }

    return map;
  }, [items]);

  const getPosition = (item) => positions[item.id];

  // Her item'a numara ver
  const itemNumbers = useMemo(() => {
    const map = {};
    items.forEach((item, index) => {
      map[item.id] = index + 1;
    });
    return map;
  }, [items]);

  return (
    <div className="min-h-screen bg-[#f0f8f9] text-gray-900">
      {/* Header (daha kompakt) */}
      <div className="flex justify-between items-center px-4 md:px-8 py-3 md:py-4 bg-[#007c8b]">
        <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
          KUMTEL Tech Radar
        </h1>

        {isAdmin ? (
          <button
            onClick={() => navigate('/admin')}
            className="bg-[#006a76] text-white font-semibold px-4 py-2 rounded transition hover:bg-[#005a64]"
          >
            Admin Panel
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="bg-[#006a76] text-white font-semibold px-4 py-2 rounded transition hover:bg-[#005a64]"
          >
            Giriş Yap
          </button>
        )}
      </div>

      {/* Layout:
          - Küçük ekranda: Radar üstte, Liste altta (order ile)
          - md+ ekranda: solda panel, sağda radar (row)
      */}
      <div className="flex flex-col md:flex-row">
        {/* Radar (üstte gelsin) */}
        <div className="order-1 md:order-2 flex-1 p-3 md:p-6 overflow-hidden md:sticky md:top-0">
          {/* Kare alan: büyüse bile taşma/kırpma olmaz */}
          <div className="mx-auto w-full aspect-square max-w-[780px] xl:max-w-[820px] flex items-center justify-center">
            <svg
              viewBox="0 0 800 800"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full"
            >
              {/* Arka plan büyük ring yazıları */}
              {[
                { text: 'ADOPT', r: 45, color: '#22c55e' },
                { text: 'TRIAL', r: 135, color: '#3b82f6' },
                { text: 'ASSESS', r: 225, color: '#eab308' },
                { text: 'HOLD', r: 315, color: '#ef4444' },
              ].map(({ text, r, color }) => (
                <text
                  key={text}
                  x={400 + r}
                  y="410"
                  fill={color}
                  fontSize="18"
                  fontWeight="bold"
                  textAnchor="middle"
                  opacity="0.15"
                  style={{ userSelect: 'none' }}
                >
                  {text}
                </text>
              ))}

              {/* Halkalar */}
              {[360, 270, 180, 90].map((r, i) => (
                <circle
                  key={i}
                  cx="400"
                  cy="400"
                  r={r}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
              ))}

              {/* Kadran çizgileri */}
              <line x1="400" y1="40" x2="400" y2="760" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="40" y1="400" x2="760" y2="400" stroke="#cbd5e1" strokeWidth="1" />

              {/* Kadran etiketleri */}
              <text x="590" y="75" fill="#007c8b" fontSize="13" fontWeight="bold">
                Database &
              </text>
              <text x="590" y="91" fill="#007c8b" fontSize="13" fontWeight="bold">
                Data Layer
              </text>

              <text x="95" y="75" fill="#007c8b" fontSize="13" fontWeight="bold">
                Application &
              </text>
              <text x="95" y="91" fill="#007c8b" fontSize="13" fontWeight="bold">
                Development
              </text>

              <text x="95" y="735" fill="#007c8b" fontSize="13" fontWeight="bold">
                Infrastructure
              </text>

              <text x="590" y="735" fill="#007c8b" fontSize="13" fontWeight="bold">
                Collaboration &
              </text>
              <text x="590" y="751" fill="#007c8b" fontSize="13" fontWeight="bold">
                Other
              </text>

              {/* Noktalar */}
              {items.map((item) => {
                const pos = getPosition(item);
                if (!pos) return null;

                const color = RING_COLORS[item.ring];
                const isHovered = hoveredItem?.id === item.id;
                const isSelected = selectedItem?.id === item.id;
                const num = itemNumbers[item.id];

                return (
                  <g
                    key={item.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isHovered || isSelected ? 14 : 12}
                      fill={color}
                      opacity={isHovered || isSelected ? 1 : 0.85}
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 4}
                      fill="white"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                      {num}
                    </text>

                    {(isHovered || isSelected) && (
                      <text x={pos.x + 16} y={pos.y + 4} fill="#007c8b" fontSize="11" fontWeight="bold">
                        {item.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Sol Panel (altta gelsin) */}
        <div className="order-2 md:order-1 w-full md:w-72 bg-white p-4 md:p-5 border-t md:border-t-0 md:border-r border-gray-200 overflow-y-auto md:h-[calc(100vh-64px)] md:sticky md:top-0">
          {/* Seçili item detayı */}
          {selectedItem && (
            <div className="mb-5 bg-[#e8f5f7] p-4 rounded-lg border border-[#007c8b]">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: RING_COLORS[selectedItem.ring] }}
                >
                  {itemNumbers[selectedItem.id]}
                </span>
                <h3 className="text-base font-bold text-[#007c8b]">{selectedItem.name}</h3>
              </div>

              <span
                className={`px-2 py-1 rounded text-xs font-semibold mr-2 text-white ${
                  selectedItem.ring === 'Adopt'
                    ? 'bg-green-500'
                    : selectedItem.ring === 'Trial'
                    ? 'bg-blue-500'
                    : selectedItem.ring === 'Assess'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              >
                {selectedItem.ring}
              </span>

              <span className="text-gray-500 text-xs">{selectedItem.quadrant}</span>

              {selectedItem.description && (
                <p className="text-gray-600 text-sm mt-2">{selectedItem.description}</p>
              )}
            </div>
          )}

          {/* Halkalar legend */}
          <div className="mb-5">
            <p className="text-xs font-bold text-[#007c8b] uppercase tracking-widest mb-2">
              Halkalar
            </p>

            {RINGS.map((ring) => (
              <div key={ring} className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RING_COLORS[ring] }} />
                <span className="text-sm text-gray-700">{ring}</span>
              </div>
            ))}
          </div>

          {/* Teknoloji listesi */}
          {QUADRANTS.map((q) => {
            const qItems = items.filter((i) => i.quadrant === q);
            if (qItems.length === 0) return null;

            return (
              <div key={q} className="mb-4">
                <p className="text-xs font-bold text-[#007c8b] uppercase tracking-wider mb-2 border-b border-[#007c8b] pb-1">
                  {q}
                </p>

                {RINGS.map((ring) => {
                  const ringItems = qItems.filter((i) => i.ring === ring);
                  if (ringItems.length === 0) return null;

                  return (
                    <div key={ring} className="mb-2">
                      <p className="text-xs font-semibold mb-1" style={{ color: RING_COLORS[ring] }}>
                        {ring}
                      </p>

                      {ringItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                          className={`flex items-center gap-2 text-sm cursor-pointer py-1 px-2 rounded transition ${
                            selectedItem?.id === item.id
                              ? 'bg-[#e8f5f7] text-[#007c8b] font-semibold'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: RING_COLORS[item.ring] }}
                          >
                            {itemNumbers[item.id]}
                          </span>
                          {item.name}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RadarPage;