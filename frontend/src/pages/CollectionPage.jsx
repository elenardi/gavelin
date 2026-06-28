import { useState, useEffect, useCallback } from 'react';
import { collectionApi, communityApi } from '../utils/api';
import CardRenderer from '../components/Card/CardRenderer';

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
const TYPE_ICON = { character: '⚔️', spell: '✨', item: '🎒', location: '🗺️', trap: '⚠️' };
const CLASS_ICON = { warrior:'🛡️', mage:'🔮', rogue:'🗡️', cleric:'✝️', ranger:'🏹', barbarian:'💢', druid:'🌿', paladin:'⚡', bard:'🎵', monk:'👊' };

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

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'rgba(13,5,32,0.9)', borderBottom: '1px solid rgba(124,58,237,0.2)',
        position: 'sticky', top: 0, zIndex: 10 }}>
        {['cards', 'decks'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '14px', border: 'none', background: 'transparent',
              color: tab === t ? '#c084fc' : '#8b7aa8',
              fontWeight: 700, fontSize: 13,
              borderBottom: `2px solid ${tab === t ? '#7c3aed' : 'transparent'}`,
              cursor: 'pointer',
            }}>
            {t === 'cards' ? `🃏 Kartu (${cards.length})` : `📋 Deck (${decks.length})`}
          </button>
        ))}
      </div>

      {/* CARDS TAB */}
      {tab === 'cards' && (
        <div style={{ padding: '12px 16px' }}>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none', opacity: 0.5 }}>🔍</span>
            <input
              placeholder="Cari kartu..."
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              style={{
                width: '100%', padding: '10px 36px 10px 36px', borderRadius: 12,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(124,58,237,0.25)',
                color: 'white', fontSize: 13, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {filters.search && (
              <button onClick={() => setFilters(p => ({ ...p, search: '' }))}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#8b7aa8', cursor: 'pointer', fontSize: 14, padding: 2 }}>
                ✕
              </button>
            )}
          </div>

          {/* Rarity filter chips */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#6b5f8a', fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Rarity</div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              <button onClick={() => setFilters(p => ({ ...p, rarity: '' }))}
                style={chipStyle(filters.rarity === '', '#7c3aed', 'rgba(124,58,237,0.15)', 'rgba(124,58,237,0.35)')}>
                Semua
              </button>
              {RARITIES.map(r => {
                const c = RARITY_PILL[r];
                const active = filters.rarity === r;
                return (
                  <button key={r} onClick={() => setFilters(p => ({ ...p, rarity: active ? '' : r }))}
                    style={chipStyle(active, c.active, c.bg, c.border)}>
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type filter chips */}
          <div style={{ marginBottom: filters.type === 'character' ? 8 : 14 }}>
            <div style={{ fontSize: 10, color: '#6b5f8a', fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Tipe</div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              <button onClick={() => setFilters(p => ({ ...p, type: '', class: '' }))}
                style={chipStyle(filters.type === '', '#7c3aed', 'rgba(124,58,237,0.15)', 'rgba(124,58,237,0.35)')}>
                Semua
              </button>
              {TYPES.map(t => {
                const active = filters.type === t;
                return (
                  <button key={t} onClick={() => setFilters(p => ({ ...p, type: active ? '' : t, class: '' }))}
                    style={chipStyle(active, '#c084fc', 'rgba(192,132,252,0.12)', 'rgba(192,132,252,0.3)')}>
                    {TYPE_ICON[t]} {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class sub-filter — hanya muncul ketika type = character */}
          {filters.type === 'character' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#6b5f8a', fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Class</div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                <button onClick={() => setFilters(p => ({ ...p, class: '' }))}
                  style={chipStyle(filters.class === '', '#7c3aed', 'rgba(124,58,237,0.15)', 'rgba(124,58,237,0.35)')}>
                  Semua
                </button>
                {CLASSES.map(cl => {
                  const active = filters.class === cl;
                  return (
                    <button key={cl} onClick={() => setFilters(p => ({ ...p, class: active ? '' : cl }))}
                      style={chipStyle(active, '#e879f9', 'rgba(232,121,249,0.12)', 'rgba(232,121,249,0.3)')}>
                      {CLASS_ICON[cl]} {cl}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active filter summary + clear all */}
          {(filters.rarity || filters.type || filters.class || filters.search) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#8b7aa8' }}>{cards.length} kartu ditemukan</span>
              <button onClick={() => setFilters({ rarity: '', type: '', class: '', search: '' })}
                style={{ fontSize: 11, color: '#c084fc', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Reset filter ✕
              </button>
            </div>
          )}

          {loading && <div style={{ textAlign: 'center', color: '#8b7aa8', padding: 40 }}>Loading...</div>}

          {/* Card grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {cards.map(card => (
              <div key={card.id} style={{ position: 'relative' }}>
                <CardRenderer
                  card={card}
                  size="sm"
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
            <div style={{ textAlign: 'center', color: '#8b7aa8', padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🃏</div>
              <p>Belum ada kartu di koleksimu.</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Buka pack untuk mendapatkan kartu!</p>
            </div>
          )}
        </div>
      )}

      {/* DECKS TAB */}
      {tab === 'decks' && (
        <div style={{ padding: '12px 16px' }}>
          <button className="btn-primary" style={{ width: '100%', marginBottom: 16 }}
            onClick={() => setDeckModal(true)}>
            ➕ Buat Deck Baru
          </button>

          {decks.map(deck => (
            <div key={deck.id} className="glass" style={{ padding: 16, marginBottom: 12, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{deck.name}</div>
                  <div style={{ fontSize: 11, color: '#8b7aa8' }}>{deck.cards?.length || 0} kartu</div>
                </div>
                <button style={{
                  background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                }} onClick={() => collectionApi.deleteDeck(deck.id).then(() => collectionApi.getDecks().then(r => setDecks(r.data.decks)))}>
                  Hapus
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {deck.cards?.slice(0, 8).map((c, i) => (
                  <div key={i} style={{
                    width: 40, height: 56, borderRadius: 4,
                    background: 'linear-gradient(135deg, #3b1f72, #1a0a2e)',
                    border: '1px solid rgba(124,58,237,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                    ) : '🃏'}
                  </div>
                ))}
                {(deck.cards?.length || 0) > 8 && (
                  <div style={{ width: 40, height: 56, borderRadius: 4, background: 'rgba(124,58,237,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#c084fc' }}>
                    +{deck.cards.length - 8}
                  </div>
                )}
              </div>
            </div>
          ))}
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
                color: '#8b7aa8', borderRadius: '50%', width: 28, height: 28,
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
                    <span style={{ fontSize: 11, color: '#8b7aa8', textTransform: 'capitalize' }}>{selectedCard.card_type}</span>
                    {selectedCard.card_type === 'character' && selectedCard.class && selectedCard.class !== 'any' && (
                      <span style={{ fontSize: 11, color: '#c084fc', textTransform: 'capitalize', background: 'rgba(124,58,237,0.15)', borderRadius: 4, padding: '1px 6px' }}>
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
                    <div style={{ fontSize: 11, color: '#8b7aa8', marginBottom: 4 }}>Level {selectedCard.current_level} / {selectedCard.max_level}</div>
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
                  <div style={{ fontSize: 11, color: '#c084fc' }}>✨ Dust: {selectedCard.card_dust_pool}</div>
                  {selectedCard.quantity > 1 && (
                    <div style={{ fontSize: 11, color: '#8b7aa8', marginTop: 2 }}>Duplikat: {selectedCard.quantity - 1}</div>
                  )}
                </div>
              </div>

              {/* Special ability */}
              {selectedCard.special_name && (
                <div style={{
                  background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: '10px 14px',
                  borderLeft: '3px solid #7c3aed', marginBottom: 16,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#c084fc' }}>{selectedCard.special_name}</div>
                  <div style={{ fontSize: 11, color: '#8b7aa8', marginTop: 2 }}>{selectedCard.special_desc}</div>
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
                    background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
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
                <p style={{ color: '#8b7aa8', fontSize: 11, margin: '4px 0 0' }}>
                  "{selectedCard.name}" (teman menerima di level 1)
                </p>
              </div>
              <button onClick={() => setShareModal(false)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', color: '#8b7aa8',
                borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14,
              }}>✕</button>
            </div>

            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8b7aa8', padding: '24px 0', fontSize: 13 }}>
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
                      background: 'linear-gradient(135deg, #7c3aed, #3b1f72)',
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
                        <div style={{ fontSize: 11, color: '#8b7aa8' }}>{f.display_name}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleShare(f.id)}
                      disabled={shareLoading}
                      style={{
                        background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
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
            background: `radial-gradient(ellipse at center, ${RARITY_GLOW[selectedCard.rarity] || 'rgba(124,58,237,0.15)'} 0%, transparent 70%)`,
          }} />

          {/* Kartu besar */}
          <div style={{ position: 'relative', zIndex: 1, marginBottom: 28, animation: 'cardRise 0.35s cubic-bezier(0.34,1.56,0.64,1)' }} onClick={e => e.stopPropagation()}>
            <CardRenderer card={selectedCard} size="xl" animated={true} />
          </div>

          <p style={{ position: 'relative', zIndex: 1, color: '#4b3f6b', fontSize: 11, marginTop: 16 }}>Ketuk mana saja untuk tutup</p>
        </div>
      )}

      {/* Create Deck Modal */}
      {deckModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="glass" style={{ width: '100%', maxWidth: 500, borderRadius: '20px 20px 0 0', padding: '20px 24px 32px' }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: 16 }}>Buat Deck Baru</h2>
            <input
              placeholder="Nama Deck"
              value={newDeck.name}
              onChange={e => setNewDeck(p => ({ ...p, name: e.target.value }))}
              style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(124,58,237,0.3)', color: 'white', fontSize: 14, marginBottom: 12 }}
            />
            <p style={{ color: '#8b7aa8', fontSize: 12, marginBottom: 16 }}>
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
            <div style={{ fontSize: 12, color: '#8b7aa8', marginBottom: 12 }}>
              {newDeck.cards.length}/20 kartu dipilih
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleCreateDeck}
                disabled={!newDeck.name || newDeck.cards.length === 0}>
                Buat Deck
              </button>
              <button onClick={() => setDeckModal(false)} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent', color: '#8b7aa8', cursor: 'pointer',
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

const chipStyle = (active, activeColor, activeBg, borderColor) => ({
  padding: '5px 12px',
  borderRadius: 20,
  border: `1px solid ${active ? activeColor : borderColor}`,
  background: active ? activeBg : 'rgba(255,255,255,0.04)',
  color: active ? activeColor : '#8b7aa8',
  fontSize: 11, fontWeight: active ? 700 : 500,
  cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
  transition: 'all 0.15s',
  textTransform: 'capitalize',
});
