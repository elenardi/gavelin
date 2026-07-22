import { useState, useEffect, useCallback } from 'react';
import { collectionApi, communityApi } from '../utils/api';
import CardRenderer from '../components/Card/CardRenderer';
import { generateCardSvg } from '../utils/cardArtGenerator';

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const TYPES    = ['character', 'spell', 'item', 'location', 'trap'];
const CLASSES  = ['warrior', 'mage', 'rogue', 'cleric', 'ranger', 'barbarian', 'druid', 'paladin', 'bard', 'monk'];

const RARITY_PILL = {
  common:    { bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.4)', active: '#94a3b8' },
  uncommon:  { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.4)',   active: '#22c55e' },
  rare:      { bg: 'rgba(59,130,246,0.12)',   border: 'rgba(59,130,246,0.4)',  active: '#3b82f6' },
  epic:      { bg: 'rgba(168,85,247,0.12)',   border: 'rgba(168,85,247,0.4)', active: '#a855f7' },
  legendary: { bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.4)', active: '#f59e0b' },
};
const CLASS_ICON = { warrior:'🛡️', mage:'🔮', rogue:'🗡️', cleric:'✝️', ranger:'🏹', barbarian:'💢', druid:'🌿', paladin:'⚡', bard:'🎵', monk:'👊' };

// Ikon garis tipis (bukan emoji) untuk tab header & filter tipe — konsisten dgn gaya Navigation.jsx
const IconBook = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const IconDeck = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6"/>
  </svg>
);
const IconStar = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconSparkle = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>
    <path d="M12 9a3 3 0 0 0 3 3 3 3 0 0 0-3 3 3 3 0 0 0-3-3 3 3 0 0 0 3-3z"/>
  </svg>
);
const IconHex = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
  </svg>
);
const IconLocation = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1"/>
    <rect x="13" y="3" width="8" height="8" rx="1"/>
    <rect x="3" y="13" width="8" height="8" rx="1"/>
    <rect x="13" y="13" width="8" height="8" rx="1"/>
  </svg>
);
const IconTrap = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const TYPE_ICON = { character: IconStar, spell: IconSparkle, item: IconHex, location: IconLocation, trap: IconTrap };

const RARITY_GLOW = {
  common:    'rgba(148,163,184,0.12)',
  uncommon:  'rgba(34,197,94,0.15)',
  rare:      'rgba(59,130,246,0.18)',
  epic:      'rgba(168,85,247,0.22)',
  legendary: 'rgba(245,158,11,0.25)',
};

export default function CollectionPage() {
  const [tab, setTab]           = useState('cards'); // cards | decks
  const [cards, setCards]       = useState([]);
  const [decks, setDecks]       = useState([]);
  const [filters, setFilters]   = useState({ rarity: '', type: '', class: '', search: '' });
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState('');
  const [deckModal, setDeckModal] = useState(false);
  const [newDeck, setNewDeck]   = useState({ name: '', cards: [] });
  const [shareModal, setShareModal] = useState(false);
  const [friends, setFriends]       = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [fullCardView, setFullCardView] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await collectionApi.getCards({
        rarity: filters.rarity  || undefined,
        type:   filters.type    || undefined,
        class:  filters.class   || undefined,
        search: filters.search  || undefined,
        sort:   'rarity_desc',
      });
      setCards(data.cards);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadDecks = useCallback(() =>
    collectionApi.getDecks().then(r => setDecks(r.data.decks)), []);

  useEffect(() => { loadCards(); }, [loadCards]);
  useEffect(() => { loadDecks(); }, [loadDecks]); // load saat mount agar jumlah deck akurat di tab
  useEffect(() => {
    if (tab === 'decks') loadDecks();
  }, [tab, loadDecks]);

  const handleUpgrade = async (card) => {
    try {
      const { data } = await collectionApi.upgradeCard(card.card_id);
      showToast(data.message);
      loadCards();
      setSelectedCard(null);
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal upgrade.');
    }
  };

  const handleConvert = async (card) => {
    if (!confirm(`Konversi 1 duplikat "${card.name}" menjadi dust?`)) return;
    try {
      const { data } = await collectionApi.convertCard(card.card_id, 1);
      showToast(data.message);
      loadCards();
      setSelectedCard(null);
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal konversi.');
    }
  };

  const handleCreateDeck = async () => {
    try {
      const { data } = await collectionApi.createDeck({ ...newDeck, cover_card_id: newDeck.cards[0] });
      showToast('Deck berhasil dibuat!');
      setDeckModal(false);
      setNewDeck({ name: '', cards: [] });
      loadDecks();
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal buat deck.');
    }
  };

  const openShareModal = async () => {
    setShareModal(true);
    try {
      const { data } = await communityApi.getFriends();
      setFriends((data.friends || []).filter(f => f.status === 'accepted'));
    } catch {
      setFriends([]);
    }
  };

  const handleShare = async (friendId) => {
    if (!selectedCard) return;
    setShareLoading(true);
    try {
      await communityApi.sendGift({ receiverId: friendId, cardId: selectedCard.card_id });
      showToast('Kartu berhasil dikirim ke teman! (level 1)');
      setShareModal(false);
      loadCards();
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal mengirim kartu.');
    } finally {
      setShareLoading(false);
    }
  };

  const dustCost = selectedCard
    ? (typeof selectedCard.dust_cost === 'string' ? JSON.parse(selectedCard.dust_cost) : selectedCard.dust_cost)
    : null;
  const nextLevel = selectedCard ? selectedCard.current_level + 1 : 0;
  const upgradeCost = dustCost?.[String(nextLevel)] || 0;

  return (
    <div className="page">
      {toast && <div className="toast">{toast}</div>}

      {/* Header: tabs kiri + branding kanan */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10,7,4,0.96)', borderBottom: '1px solid rgba(169,118,47,0.18)',
        padding: '18px 28px', position: 'sticky', top: 0, zIndex: 10, gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 28 }}>
          {['cards', 'decks'].map(t => {
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: active ? '#f0c869' : '#8a7a5c',
                  fontWeight: 700, fontSize: 14, letterSpacing: 0.3,
                  padding: '0 0 10px', borderBottom: `2px solid ${active ? '#c9832f' : 'transparent'}`,
                }}>
                {t === 'cards' ? <IconBook /> : <IconDeck />}
                <span className="font-title">{t === 'cards' ? `Kartu (${cards.length})` : `Deck (${decks.length})`}</span>
              </button>
            );
          })}
        </div>
        <div className="font-title" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 18, letterSpacing: 2, color: '#ecdfc4', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.2 }}>
            Gavelin
          </div>
          <div style={{ fontSize: 10, letterSpacing: 2.5, color: '#8a7a5c', textTransform: 'uppercase', lineHeight: 1.2 }}>
            Card Chronicles
          </div>
        </div>
      </div>

      {/* CARDS TAB */}
      {tab === 'cards' && (
        <div style={{ padding: '20px 28px 32px' }}>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: 18 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none', opacity: 0.5 }}>🔍</span>
            <input
              placeholder="Cari kartu..."
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              style={{
                width: '100%', padding: '10px 36px 10px 36px', borderRadius: 12,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(169,118,47,0.25)',
                color: 'white', fontSize: 13, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {filters.search && (
              <button onClick={() => setFilters(p => ({ ...p, search: '' }))}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#a89a7c', cursor: 'pointer', fontSize: 14, padding: 2 }}>
                ✕
              </button>
            )}
          </div>

          {/* Rarity filter chips */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#8a7a5c', fontWeight: 700, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>Rarity</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setFilters(p => ({ ...p, rarity: '' }))}
                style={accentChipStyle(filters.rarity === '')}>
                Semua
              </button>
              {RARITIES.map(r => {
                const c = RARITY_PILL[r];
                const active = filters.rarity === r;
                return (
                  <button key={r} onClick={() => setFilters(p => ({ ...p, rarity: active ? '' : r }))}
                    style={rarityChipStyle(active, c.active)}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type filter chips */}
          <div style={{ marginBottom: filters.type === 'character' ? 10 : 18 }}>
            <div style={{ fontSize: 10, color: '#8a7a5c', fontWeight: 700, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>Tipe</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setFilters(p => ({ ...p, type: '', class: '' }))}
                style={accentChipStyle(filters.type === '')}>
                Semua
              </button>
              {TYPES.map(t => {
                const active = filters.type === t;
                const Icon = TYPE_ICON[t];
                return (
                  <button key={t} onClick={() => setFilters(p => ({ ...p, type: active ? '' : t, class: '' }))}
                    style={neutralChipStyle(active)}>
                    <Icon /> {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class sub-filter — hanya muncul ketika type = character */}
          {filters.type === 'character' && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: '#8a7a5c', fontWeight: 700, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>Class</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setFilters(p => ({ ...p, class: '' }))}
                  style={accentChipStyle(filters.class === '')}>
                  Semua
                </button>
                {CLASSES.map(cl => {
                  const active = filters.class === cl;
                  return (
                    <button key={cl} onClick={() => setFilters(p => ({ ...p, class: active ? '' : cl }))}
                      style={rarityChipStyle(active, '#e879f9')}>
                      {CLASS_ICON[cl]} {cl}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active filter summary + clear all */}
          {(filters.rarity || filters.type || filters.class || filters.search) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: '#a89a7c' }}>{cards.length} kartu ditemukan</span>
              <button onClick={() => setFilters({ rarity: '', type: '', class: '', search: '' })}
                style={{ fontSize: 11, color: '#f0c869', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Reset filter ✕
              </button>
            </div>
          )}

          {loading && <div style={{ textAlign: 'center', color: '#a89a7c', padding: 40 }}>Loading...</div>}

          {/* Card grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14 }}>
            {cards.map(card => (
              <div key={card.id} style={{ position: 'relative', justifySelf: 'center' }}>
                <CardRenderer
                  card={card}
                  size="md"
                  onClick={() => setSelectedCard(card)}
                  selected={selectedCard?.id === card.id}
                />
                {card.quantity > 1 && (
                  <div style={{
                    position: 'absolute', bottom: 4, right: 4,
                    background: 'rgba(0,0,0,0.8)', borderRadius: 4,
                    fontSize: 9, padding: '1px 4px', color: '#f59e0b', fontWeight: 700,
                  }}>
                    x{card.quantity}
                  </div>
                )}
              </div>
            ))}
          </div>

          {cards.length === 0 && !loading && (
            <div style={{ textAlign: 'center', color: '#a89a7c', padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🃏</div>
              <p>Belum ada kartu di koleksimu.</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Buka pack untuk mendapatkan kartu!</p>
            </div>
          )}
        </div>
      )}

      {/* DECKS TAB */}
      {tab === 'decks' && (
        <div style={{ padding: '20px 28px 32px' }}>
          <button
            onClick={() => setDeckModal(true)}
            style={{
              width: '100%', marginBottom: 24, border: 'none', cursor: 'pointer',
              borderRadius: 16, padding: '16px 24px',
              background: 'linear-gradient(135deg, #e0a83f, #a9762f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 4px 18px rgba(169,118,47,0.35)',
            }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#f0c869', fontSize: 15, fontWeight: 700, lineHeight: 1,
            }}>+</span>
            <span className="font-title" style={{ fontSize: 14, fontWeight: 700, color: '#1a0f04', letterSpacing: 0.5 }}>
              Buat Deck Baru
            </span>
          </button>

          {decks.map(deck => (
            <div key={deck.id} className="glass" style={{ padding: '20px 22px', marginBottom: 20, borderRadius: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div className="font-title" style={{ fontSize: 19, fontWeight: 700, color: '#f2e9d8' }}>{deck.name}</div>
                  <div style={{ fontSize: 12, color: '#a89a7c', marginTop: 4 }}>{deck.cards?.length || 0} kartu</div>
                </div>
                <button style={{
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
                  color: '#ef4444', borderRadius: 20, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }} onClick={() => collectionApi.deleteDeck(deck.id).then(() => collectionApi.getDecks().then(r => setDecks(r.data.decks)))}>
                  Hapus
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 10 }}>
                {deck.cards?.slice(0, 8).map((c, i) => {
                  const rarityColor = RARITY_PILL[c.rarity]?.active || '#94a3b8';
                  return (
                    <div key={i} style={{
                      aspectRatio: '4 / 5', borderRadius: 8, position: 'relative', overflow: 'hidden',
                      border: `1px solid ${rarityColor}`,
                      background: `url(${c.image_url || generateCardSvg(c)}) center/cover`,
                      boxShadow: `0 0 8px ${rarityColor}40`,
                    }}>
                      {c.current_level > 1 && (
                        <div style={{
                          position: 'absolute', top: 4, right: 4,
                          background: 'rgba(245,158,11,0.92)', borderRadius: 4,
                          padding: '1px 5px', fontSize: 9, fontWeight: 700, color: '#1a0a2e',
                        }}>
                          Lv.{c.current_level}
                        </div>
                      )}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 20%, transparent 100%)',
                        padding: '10px 6px 5px', textAlign: 'center',
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#f2e9d8', lineHeight: 1.25, display: 'block' }}>{c.name}</span>
                      </div>
                    </div>
                  );
                })}
                {(deck.cards?.length || 0) > 8 && (
                  <div style={{
                    aspectRatio: '4 / 5', borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(169,118,47,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#c9832f' }}>+{deck.cards.length - 8}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {decks.length === 0 && (
            <div style={{ textAlign: 'center', color: '#a89a7c', padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <p>Belum ada deck.</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Buat deck untuk bertarung!</p>
            </div>
          )}
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setSelectedCard(null)}>
          <div onClick={e => e.stopPropagation()} className="glass"
            style={{
              width: '100%', maxWidth: 480,
              borderRadius: 20,
              padding: '0 0 24px',
              maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
            }}>

            {/* Drag handle + close */}
            <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto' }} />
              <button onClick={() => setSelectedCard(null)} style={{
                position: 'absolute', right: 16, top: 12,
                background: 'rgba(255,255,255,0.1)', border: 'none',
                color: '#a89a7c', borderRadius: '50%', width: 28, height: 28,
                cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto', padding: '16px 20px 0', flex: 1 }}>
              {/* Card preview + info */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, cursor: 'zoom-in' }} title="Lihat kartu penuh" onClick={() => setFullCardView(true)}>
                  <CardRenderer card={selectedCard} size="md" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 6, lineHeight: 1.3 }}>{selectedCard.name}</h2>

                  {/* Rarity + type + class (for character) */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                    <span className={`rarity-badge rarity-${selectedCard.rarity}`}>{selectedCard.rarity}</span>
                    <span style={{ fontSize: 11, color: '#a89a7c', textTransform: 'capitalize' }}>{selectedCard.card_type}</span>
                    {selectedCard.card_type === 'character' && selectedCard.class && selectedCard.class !== 'any' && (
                      <span style={{ fontSize: 11, color: '#f0c869', textTransform: 'capitalize', background: 'rgba(169,118,47,0.15)', borderRadius: 4, padding: '1px 6px' }}>
                        {selectedCard.class}
                      </span>
                    )}
                  </div>

                  {/* Stats — with upgrade bonus display */}
                  {(() => {
                    const upgradeStats = selectedCard.upgrade_stats
                      ? (typeof selectedCard.upgrade_stats === 'string' ? JSON.parse(selectedCard.upgrade_stats) : selectedCard.upgrade_stats)
                      : [];
                    const lvlBonus = upgradeStats.find(u => u.level === selectedCard.current_level) || null;

                    const statVal = (base, bonus) => bonus
                      ? <span>{base}<span style={{ color: '#22c55e', fontSize: 11 }}>+{bonus}</span></span>
                      : base;

                    return (
                      <>
                        {selectedCard.card_type === 'character' && (
                          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                            <div style={{ textAlign: 'center', background: 'rgba(34,197,94,0.1)', borderRadius: 6, padding: '4px 6px', flex: 1 }}>
                              <div style={{ fontSize: 10, color: '#22c55e', marginBottom: 1 }}>❤️ HP</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>{statVal(selectedCard.hp, lvlBonus?.hp)}</div>
                            </div>
                            <div style={{ textAlign: 'center', background: 'rgba(239,68,68,0.1)', borderRadius: 6, padding: '4px 6px', flex: 1 }}>
                              <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 1 }}>⚔️ ATK</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>{statVal(selectedCard.attack, lvlBonus?.atk)}</div>
                            </div>
                            <div style={{ textAlign: 'center', background: 'rgba(59,130,246,0.1)', borderRadius: 6, padding: '4px 6px', flex: 1 }}>
                              <div style={{ fontSize: 10, color: '#3b82f6', marginBottom: 1 }}>🛡 DEF</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6' }}>{statVal(selectedCard.defense, lvlBonus?.def)}</div>
                            </div>
                          </div>
                        )}
                        {(selectedCard.card_type === 'spell' || selectedCard.card_type === 'trap') && (
                          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                            <div style={{ textAlign: 'center', background: 'rgba(239,68,68,0.1)', borderRadius: 6, padding: '4px 12px', flex: 1 }}>
                              <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 1 }}>✨ DMG</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>{statVal(selectedCard.attack, lvlBonus?.atk)}</div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Level bar */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#a89a7c', marginBottom: 4 }}>Level {selectedCard.current_level} / {selectedCard.max_level}</div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {Array.from({ length: selectedCard.max_level }).map((_, i) => (
                        <div key={i} style={{
                          flex: 1, height: 5, borderRadius: 3,
                          background: i < selectedCard.current_level ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                        }} />
                      ))}
                    </div>
                  </div>

                  {/* Dust + duplikat */}
                  <div style={{ fontSize: 11, color: '#f0c869' }}>✨ Dust: {selectedCard.card_dust_pool}</div>
                  {selectedCard.quantity > 1 && (
                    <div style={{ fontSize: 11, color: '#a89a7c', marginTop: 2 }}>Duplikat: {selectedCard.quantity - 1}</div>
                  )}
                </div>
              </div>

              {/* Special ability */}
              {selectedCard.special_name && (
                <div style={{
                  background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: '10px 14px',
                  borderLeft: '3px solid #a9762f', marginBottom: 16,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f0c869' }}>{selectedCard.special_name}</div>
                  <div style={{ fontSize: 11, color: '#a89a7c', marginTop: 2 }}>{selectedCard.special_desc}</div>
                </div>
              )}
            </div>

            {/* Actions — pinned at bottom */}
            <div style={{ display: 'flex', gap: 8, padding: '16px 20px 0', flexShrink: 0, flexWrap: 'wrap' }}>
              {selectedCard.current_level < selectedCard.max_level && (
                <button
                  className="btn-gold"
                  style={{ flex: 1, fontSize: 12, minWidth: 120 }}
                  onClick={() => handleUpgrade(selectedCard)}
                  disabled={selectedCard.card_dust_pool < upgradeCost}
                  title={`Butuh ${upgradeCost} dust`}
                >
                  ⬆️ Upgrade (✨{upgradeCost})
                </button>
              )}
              {selectedCard.quantity > 1 && (
                <button
                  className="btn-primary"
                  style={{ flex: 1, fontSize: 12, minWidth: 120 }}
                  onClick={() => handleConvert(selectedCard)}
                >
                  🔄 Konversi Duplikat
                </button>
              )}
              {selectedCard.quantity > 1 && (
                <button
                  onClick={openShareModal}
                  style={{
                    flex: 1, fontSize: 12, minWidth: 120,
                    padding: '12px', borderRadius: 12, cursor: 'pointer',
                    background: 'linear-gradient(135deg, #c9832f, #8a5a2b)',
                    border: 'none', color: 'white', fontWeight: 700,
                  }}
                >
                  📤 Kirim ke Teman
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share / Send Card Modal */}
      {shareModal && selectedCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShareModal(false)}>
          <div onClick={e => e.stopPropagation()} className="glass"
            style={{ width: '100%', maxWidth: 400, borderRadius: 20, padding: '20px 20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ color: 'white', fontSize: 15, fontWeight: 700, margin: 0 }}>Kirim ke Teman</h3>
                <p style={{ color: '#a89a7c', fontSize: 11, margin: '4px 0 0' }}>
                  "{selectedCard.name}" (teman menerima di level 1)
                </p>
              </div>
              <button onClick={() => setShareModal(false)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', color: '#a89a7c',
                borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14,
              }}>✕</button>
            </div>

            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#a89a7c', padding: '24px 0', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                Belum ada teman. Tambah teman dulu di halaman Komunitas.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {friends.map(f => (
                  <div key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 14px',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #a9762f, #4a3218)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0, overflow: 'hidden',
                    }}>
                      {f.avatar_url
                        ? <img src={f.avatar_url} alt={f.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : '👤'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.username}
                      </div>
                      {f.display_name && (
                        <div style={{ fontSize: 11, color: '#a89a7c' }}>{f.display_name}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleShare(f.id)}
                      disabled={shareLoading}
                      style={{
                        background: 'linear-gradient(135deg, #c9832f, #8a5a2b)',
                        border: 'none', color: 'white', borderRadius: 8,
                        padding: '6px 14px', fontSize: 12, fontWeight: 700,
                        cursor: shareLoading ? 'not-allowed' : 'pointer',
                        opacity: shareLoading ? 0.6 : 1, flexShrink: 0,
                      }}
                    >
                      Kirim
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Card View — Marvel Snap style */}
      {fullCardView && selectedCard && (
        <div
          onClick={() => setFullCardView(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '24px 20px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Glow background sesuai rarity */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse at center, ${RARITY_GLOW[selectedCard.rarity] || 'rgba(169,118,47,0.15)'} 0%, transparent 70%)`,
          }} />

          {/* Kartu besar */}
          <div style={{ position: 'relative', zIndex: 1, marginBottom: 28, animation: 'cardRise 0.35s cubic-bezier(0.34,1.56,0.64,1)' }} onClick={e => e.stopPropagation()}>
            <CardRenderer card={selectedCard} size="xl" animated={true} />
          </div>

          <p style={{ position: 'relative', zIndex: 1, color: '#6b5a3c', fontSize: 11, marginTop: 16 }}>Ketuk mana saja untuk tutup</p>
        </div>
      )}

      {/* Create Deck Modal */}
      {deckModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="glass" style={{ width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto', borderRadius: 20, padding: '20px 24px 32px' }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: 16 }}>Buat Deck Baru</h2>
            <input
              placeholder="Nama Deck"
              value={newDeck.name}
              onChange={e => setNewDeck(p => ({ ...p, name: e.target.value }))}
              style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(169,118,47,0.3)', color: 'white', fontSize: 14, marginBottom: 12 }}
            />
            <p style={{ color: '#a89a7c', fontSize: 12, marginBottom: 16 }}>
              Pilih kartu dari koleksimu (maks 20):
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
              {cards.map(card => (
                <CardRenderer
                  key={card.id} card={card} size="sm"
                  selected={newDeck.cards.includes(card.card_id)}
                  onClick={() => {
                    setNewDeck(p => ({
                      ...p,
                      cards: p.cards.includes(card.card_id)
                        ? p.cards.filter(id => id !== card.card_id)
                        : p.cards.length < 20 ? [...p.cards, card.card_id] : p.cards,
                    }));
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#a89a7c', marginBottom: 12 }}>
              {newDeck.cards.length}/20 kartu dipilih
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleCreateDeck}
                disabled={!newDeck.name || newDeck.cards.length === 0}>
                Buat Deck
              </button>
              <button onClick={() => setDeckModal(false)} style={{
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

const chipBase = {
  padding: '6px 14px',
  borderRadius: 20,
  fontSize: 12, fontWeight: 700,
  cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
  transition: 'all 0.15s',
  display: 'inline-flex', alignItems: 'center', gap: 5,
};

// Chip "Semua" — gold accent, solid saat aktif
const accentChipStyle = (active) => ({
  ...chipBase,
  border: `1px solid ${active ? '#c9832f' : 'rgba(240,200,105,0.35)'}`,
  background: active ? 'linear-gradient(135deg, #c9832f, #a9762f)' : 'rgba(255,255,255,0.03)',
  color: active ? '#1a0f04' : '#f0c869',
});

// Chip rarity/class — selalu berwarna sesuai rarity, solid saat aktif
const rarityChipStyle = (active, color) => ({
  ...chipBase,
  border: `1px solid ${color}`,
  background: active ? color : 'rgba(255,255,255,0.02)',
  color: active ? '#0a0a12' : color,
});

// Chip tipe kartu — netral abu-abu, jadi gold solid saat aktif
const neutralChipStyle = (active) => ({
  ...chipBase,
  border: `1px solid ${active ? '#c9832f' : 'rgba(255,255,255,0.15)'}`,
  background: active ? 'linear-gradient(135deg, #c9832f, #a9762f)' : 'rgba(255,255,255,0.03)',
  color: active ? '#1a0f04' : '#c9bda0',
});
