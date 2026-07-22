import { useState, useEffect } from 'react';
import { communityApi, collectionApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function CommunityPage() {
  const { user } = useAuth();
  const [tab, setTab]         = useState('friends'); // friends | search | gifts
  const [friends, setFriends] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const [gifts, setGifts]     = useState([]);
  const [myCards, setMyCards] = useState([]);
  const [giftModal, setGiftModal] = useState(null); // receiverId
  const [selectedCard, setSelectedCard] = useState(null);
  const [giftMsg, setGiftMsg] = useState('');
  const [toast, setToast]     = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    communityApi.getFriends().then(r => setFriends(r.data.friends));
    communityApi.getGifts().then(r => setGifts(r.data.gifts));
  }, []);

  useEffect(() => {
    if (tab === 'gifts' && giftModal) {
      collectionApi.getCards({ sort: 'newest' }).then(r =>
        setMyCards(r.data.cards.filter(c => c.quantity > 1))
      );
    }
  }, [tab, giftModal]);

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    const { data } = await communityApi.searchUsers(searchQ);
    setSearchRes(data.users);
  };

  const handleRequest = async (userId) => {
    try {
      await communityApi.sendRequest(userId);
      showToast('Permintaan pertemanan terkirim!');
      setSearchRes(p => p.map(u => u.id === userId ? { ...u, friend_status: 'pending' } : u));
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal.');
    }
  };

  const handleRespond = async (friendshipId, action) => {
    try {
      await communityApi.respondRequest(friendshipId, action);
      showToast(action === 'accept' ? 'Pertemanan diterima!' : 'Permintaan ditolak.');
      communityApi.getFriends().then(r => setFriends(r.data.friends));
    } catch (err) {
      showToast('Gagal.');
    }
  };

  const handleSendGift = async () => {
    if (!selectedCard) return;
    try {
      await communityApi.sendGift({ receiverId: giftModal, cardId: selectedCard.card_id, message: giftMsg });
      showToast('Kartu berhasil dikirim!');
      setGiftModal(null);
      setSelectedCard(null);
      setGiftMsg('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal mengirim hadiah.');
    }
  };

  const accepted = friends.filter(f => f.status === 'accepted');
  const pending  = friends.filter(f => f.status === 'pending');

  return (
    <div className="page">
      {toast && <div className="toast">{toast}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'rgba(21,14,7,0.9)', borderBottom: '1px solid rgba(169,118,47,0.2)',
        position: 'sticky', top: 0, zIndex: 10 }}>
        {[
          { id: 'friends', label: `👥 Teman (${accepted.length})` },
          { id: 'search',  label: '🔍 Cari User' },
          { id: 'pending', label: `📩 Permintaan (${pending.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '13px 4px', border: 'none', background: 'transparent',
              color: tab === t.id ? '#f0c869' : '#a89a7c',
              fontWeight: 700, fontSize: 11,
              borderBottom: `2px solid ${tab === t.id ? '#a9762f' : 'transparent'}`,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* FRIENDS */}
      {tab === 'friends' && (
        <div style={{ padding: '16px' }}>
          {accepted.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a89a7c', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
              <p>Belum ada teman.</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Cari pengguna dan kirim permintaan pertemanan!</p>
            </div>
          ) : accepted.map(f => (
            <div key={f.friendship_id} className="glass"
              style={{ padding: '12px 16px', marginBottom: 10, borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: f.avatar_url ? `url(${f.avatar_url}) center/cover` : 'linear-gradient(135deg, #a9762f, #f59e0b)',
                border: '2px solid #a9762f', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>
                {!f.avatar_url && '⚔️'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{f.username}</div>
                <div style={{ fontSize: 10, color: '#f59e0b' }}>{f.title}</div>
                <div style={{ fontSize: 10, color: '#a89a7c' }}>Lv. {f.level}</div>
              </div>
              <button
                className="btn-primary"
                style={{ padding: '6px 12px', fontSize: 11 }}
                onClick={() => { setGiftModal(f.id); setTab('gift_flow'); }}
              >
                🎁 Kirim
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SEARCH */}
      {tab === 'search' && (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input
              placeholder="Cari username..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(169,118,47,0.3)',
                color: 'white', fontSize: 13 }}
            />
            <button className="btn-primary" style={{ padding: '10px 16px', fontSize: 13 }}
              onClick={handleSearch}>Cari</button>
          </div>

          {searchRes.map(u => (
            <div key={u.id} className="glass"
              style={{ padding: '12px 16px', marginBottom: 10, borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: u.avatar_url ? `url(${u.avatar_url}) center/cover` : 'linear-gradient(135deg, #a9762f, #3b82f6)',
                border: '2px solid rgba(169,118,47,0.4)', flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{u.username}</div>
                <div style={{ fontSize: 10, color: '#a89a7c' }}>{u.title} • Lv.{u.level}</div>
              </div>
              {u.id === user?.id ? (
                <span style={{ fontSize: 11, color: '#a89a7c' }}>Kamu</span>
              ) : u.friend_status === 'accepted' ? (
                <span style={{ fontSize: 11, color: '#22c55e' }}>✓ Teman</span>
              ) : u.friend_status === 'pending' ? (
                <span style={{ fontSize: 11, color: '#f59e0b' }}>Menunggu...</span>
              ) : (
                <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 11 }}
                  onClick={() => handleRequest(u.id)}>
                  ➕ Tambah
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PENDING REQUESTS */}
      {tab === 'pending' && (
        <div style={{ padding: '16px' }}>
          {pending.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a89a7c', padding: '60px 0' }}>
              <div style={{ fontSize: 40 }}>📩</div>
              <p style={{ marginTop: 8 }}>Tidak ada permintaan pertemanan.</p>
            </div>
          ) : pending.map(f => (
            <div key={f.friendship_id} className="glass"
              style={{ padding: '12px 16px', marginBottom: 10, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #a9762f, #f59e0b)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>⚔️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{f.username}</div>
                  <div style={{ fontSize: 10, color: '#a89a7c' }}>
                    {f.direction === 'received' ? '📩 Ingin berteman denganmu' : '📤 Terkirim'}
                  </div>
                </div>
              </div>
              {f.direction === 'received' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: 12 }}
                    onClick={() => handleRespond(f.friendship_id, 'accept')}>
                    ✓ Terima
                  </button>
                  <button style={{
                    flex: 1, padding: '8px', borderRadius: 10, fontSize: 12,
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444', cursor: 'pointer',
                  }} onClick={() => handleRespond(f.friendship_id, 'reject')}>
                    ✗ Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* GIFT FLOW */}
      {tab === 'gift_flow' && giftModal && (
        <div style={{ padding: '16px' }}>
          <button onClick={() => { setTab('friends'); setGiftModal(null); }}
            style={{ background: 'none', border: 'none', color: '#a89a7c', fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>
            ← Kembali
          </button>
          <h3 style={{ color: 'white', marginBottom: 16, fontSize: 16 }}>🎁 Kirim Kartu ke Teman</h3>
          <p style={{ color: '#a89a7c', fontSize: 12, marginBottom: 12 }}>
            Pilih kartu duplikat yang ingin dikirim:
          </p>
          {myCards.length === 0 && (
            <p style={{ color: '#ef4444', fontSize: 12 }}>Tidak ada kartu duplikat untuk dikirim.</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {myCards.map(card => (
              <div key={card.id} style={{ position: 'relative' }}>
                <div style={{
                  width: 90, height: 126, borderRadius: 8,
                  border: `2px solid ${selectedCard?.id === card.id ? '#f59e0b' : 'rgba(169,118,47,0.3)'}`,
                  background: 'linear-gradient(135deg, #2b1d10, #150e07)',
                  cursor: 'pointer', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                }} onClick={() => setSelectedCard(card)}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🃏</div>
                  <div style={{ padding: '4px 6px', fontSize: 9, fontWeight: 700, color: 'white',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                </div>
                <div style={{ position: 'absolute', top: 2, right: 2, background: '#f59e0b', borderRadius: 4,
                  fontSize: 9, padding: '1px 4px', color: '#2b1d10', fontWeight: 700 }}>
                  x{card.quantity - 1}
                </div>
              </div>
            ))}
          </div>
          <input
            placeholder="Pesan (opsional)"
            value={giftMsg}
            onChange={e => setGiftMsg(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10,
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(169,118,47,0.3)',
              color: 'white', fontSize: 13, marginBottom: 16 }}
          />
          <button className="btn-primary" style={{ width: '100%' }}
            disabled={!selectedCard} onClick={handleSendGift}>
            🎁 Kirim Hadiah
          </button>
        </div>
      )}
    </div>
  );
}
