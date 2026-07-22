import { useState, useEffect } from 'react';
import { shopApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const TYPE_LABELS = {
  avatar_frame: '🖼️ Frame Profil',
  title:        '🏷️ Title',
  card_back:    '🃏 Card Back',
  gems:         '💎 Gems',
  gold:         '💰 Gold',
  dust:         '✨ Dust',
  pack:         '🎴 Pack',
};

export default function ShopPage() {
  const { user, refreshUser } = useAuth();
  const [items, setItems]     = useState([]);
  const [filter, setFilter]   = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState('');
  const [buyConfirm, setBuyConfirm] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    shopApi.getItems().then(r => setItems(r.data.items));
  }, []);

  const handleBuy = async (item) => {
    setLoading(true);
    try {
      const { data } = await shopApi.buyItem(item.id, 1);
      showToast(data.message);
      setBuyConfirm(null);
      refreshUser();
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal membeli item.');
    } finally {
      setLoading(false);
    }
  };

  const types = [...new Set(items.map(i => i.item_type))];
  const filtered = filter ? items.filter(i => i.item_type === filter) : items;
  const featured = items.filter(i => i.is_featured);

  return (
    <div className="page">
      {toast && <div className="toast">{toast}</div>}

      {/* Header */}
      <div style={{ padding: '16px 20px 12px', background: 'rgba(21,14,7,0.8)',
        borderBottom: '1px solid rgba(169,118,47,0.2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>🛒 Shop</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.4)',
              padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
              <span>💰</span>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>{(user?.gold || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.4)',
              padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
              <span>💎</span>
              <span style={{ color: '#60a5fa', fontWeight: 700 }}>{user?.gems || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div style={{ padding: '16px 16px 0' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 12 }}>⭐ Featured</h3>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {featured.map(item => (
              <ShopCard key={item.id} item={item} onBuy={() => setBuyConfirm(item)} user={user} featured />
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', borderBottom: '1px solid rgba(169,118,47,0.2)' }}>
        <button onClick={() => setFilter('')}
          style={filterBtnStyle(filter === '')}>Semua</button>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            style={filterBtnStyle(filter === t)}>
            {TYPE_LABELS[t] || t}
          </button>
        ))}
      </div>

      {/* All items */}
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {filtered.map(item => (
          <ShopCard key={item.id} item={item} onBuy={() => setBuyConfirm(item)} user={user} />
        ))}
      </div>

      {/* Buy Confirm Modal */}
      {buyConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setBuyConfirm(null)}>
          <div onClick={e => e.stopPropagation()} className="glass"
            style={{ width: '100%', maxWidth: 500, borderRadius: '20px 20px 0 0', padding: '24px 24px 32px' }}>
            <h3 style={{ color: 'white', marginBottom: 8, fontSize: 17 }}>Konfirmasi Pembelian</h3>
            <p style={{ color: '#a89a7c', fontSize: 13, marginBottom: 16 }}>
              Beli <strong style={{ color: 'white' }}>{buyConfirm.name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
              {buyConfirm.cost_gold > 0 && (
                <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 8, padding: '6px 16px', color: '#f59e0b', fontWeight: 700 }}>
                  💰 {buyConfirm.cost_gold.toLocaleString()} Gold
                </span>
              )}
              {buyConfirm.cost_gems > 0 && (
                <span style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)',
                  borderRadius: 8, padding: '6px 16px', color: '#60a5fa', fontWeight: 700 }}>
                  💎 {buyConfirm.cost_gems} Gems
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-gold" style={{ flex: 1 }} disabled={loading} onClick={() => handleBuy(buyConfirm)}>
                {loading ? 'Membeli...' : '✅ Beli Sekarang'}
              </button>
              <button onClick={() => setBuyConfirm(null)} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent', color: '#a89a7c', cursor: 'pointer',
              }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShopCard({ item, onBuy, user, featured }) {
  const canAfford = (item.cost_gold === 0 || user?.gold >= item.cost_gold) &&
                    (item.cost_gems === 0 || user?.gems >= item.cost_gems);

  return (
    <div className="glass" style={{
      borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${featured ? 'rgba(245,158,11,0.4)' : 'rgba(169,118,47,0.2)'}`,
      minWidth: featured ? 140 : undefined,
    }}>
      {/* Image / Icon */}
      <div style={{
        height: 90,
        background: item.image_url ? `url(${item.image_url}) center/cover` : 'linear-gradient(135deg, #4a3218, #2b1d10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
        position: 'relative',
      }}>
        {!item.image_url && (item.item_type === 'gems' ? '💎' : item.item_type === 'gold' ? '💰' :
          item.item_type === 'avatar_frame' ? '🖼️' : item.item_type === 'title' ? '🏷️' :
          item.item_type === 'card_back' ? '🃏' : '✨')}
        {item.is_featured && (
          <div style={{ position: 'absolute', top: 4, right: 4, background: '#f59e0b',
            borderRadius: 4, fontSize: 9, padding: '1px 5px', color: '#2b1d10', fontWeight: 700 }}>HOT</div>
        )}
      </div>

      <div style={{ padding: '10px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'white', marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        <div style={{ fontSize: 9, color: '#a89a7c', marginBottom: 8,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.description}
        </div>

        {/* Price */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {item.cost_gold > 0 && (
            <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>💰{item.cost_gold.toLocaleString()}</span>
          )}
          {item.cost_gems > 0 && (
            <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700 }}>💎{item.cost_gems}</span>
          )}
          {item.cost_gold === 0 && item.cost_gems === 0 && (
            <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }}>GRATIS</span>
          )}
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', padding: '7px', fontSize: 11, opacity: canAfford ? 1 : 0.5 }}
          onClick={onBuy}
          disabled={!canAfford}
        >
          {canAfford ? 'Beli' : 'Tidak cukup'}
        </button>
      </div>
    </div>
  );
}

const filterBtnStyle = (active) => ({
  padding: '6px 14px', borderRadius: 20, border: 'none', flexShrink: 0,
  background: active ? 'rgba(169,118,47,0.7)' : 'rgba(0,0,0,0.3)',
  color: active ? 'white' : '#a89a7c',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
});
