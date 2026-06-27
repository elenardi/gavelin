import { useState, useEffect, useCallback } from 'react';
import { collectionApi, packApi } from '../utils/api';
import CardRenderer from '../components/Card/CardRenderer';

const RARITIES = ['', 'common', 'uncommon', 'rare', 'epic', 'legendary'];
const TYPES    = ['', 'character', 'spell', 'item', 'location', 'trap'];

export default function CollectionPage() {
  const [tab, setTab]           = useState('cards'); // cards | decks
  const [cards, setCards]       = useState([]);
  const [decks, setDecks]       = useState([]);
  const [filters, setFilters]   = useState({ rarity: '', type: '', search: '' });
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState('');
  const [deckModal, setDeckModal] = useState(false);
  const [newDeck, setNewDeck]   = useState({ name: '', cards: [] });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await collectionApi.getCards({
        rarity: filters.rarity || undefined,
        type:   filters.type   || undefined,
        search: filters.search || undefined,
        sort:   'rarity_desc',
      });
      setCards(data.cards);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadCards(); }, [loadCards]);
  useEffect(() => {
    if (tab === 'decks') collectionApi.getDecks().then(r => setDecks(r.data.decks));
  }, [tab]);

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
      collectionApi.getDecks().then(r => setDecks(r.data.decks));
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal buat deck.');
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
          {/* Search */}
          <input
            placeholder="🔍 Cari kartu..."
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(124,58,237,0.3)',
              color: 'white', fontSize: 13, marginBottom: 10,
            }}
          />

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
            <select value={filters.rarity} onChange={e => setFilters(p => ({ ...p, rarity: e.target.value }))}
              style={selectStyle}>
              <option value="">Semua Rarity</option>
              {RARITIES.slice(1).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filters.type} onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
              style={selectStyle}>
              <option value="">Semua Tipe</option>
              {TYPES.slice(1).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

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
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setSelectedCard(null)}>
          <div onClick={e => e.stopPropagation()} className="glass"
            style={{ width: '100%', maxWidth: 500, borderRadius: '20px 20px 0 0', padding: '20px 24px 32px' }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <CardRenderer card={selectedCard} size="md" />
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 4 }}>{selectedCard.name}</h2>
                <span className={`rarity-badge rarity-${selectedCard.rarity}`}>{selectedCard.rarity}</span>

                {/* Level stars */}
                <div style={{ marginTop: 10, marginBottom: 4 }}>
                  <div style={{ fontSize: 11, color: '#8b7aa8', marginBottom: 4 }}>Level {selectedCard.current_level} / {selectedCard.max_level}</div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {Array.from({ length: selectedCard.max_level }).map((_, i) => (
                      <div key={i} style={{
                        width: 20, height: 6, borderRadius: 3,
                        background: i < selectedCard.current_level ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                      }} />
                    ))}
                  </div>
                </div>

                {/* Dust info */}
                <div style={{ fontSize: 11, color: '#c084fc' }}>
                  ✨ Dust: {selectedCard.card_dust_pool}
                </div>
                {selectedCard.quantity > 1 && (
                  <div style={{ fontSize: 11, color: '#8b7aa8' }}>
                    Duplikat: {selectedCard.quantity - 1}
                  </div>
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

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              {/* Upgrade */}
              {selectedCard.current_level < selectedCard.max_level && (
                <button
                  className="btn-gold"
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={() => handleUpgrade(selectedCard)}
                  disabled={selectedCard.card_dust_pool < upgradeCost}
                  title={`Butuh ${upgradeCost} dust`}
                >
                  ⬆️ Upgrade (✨{upgradeCost})
                </button>
              )}
              {/* Convert duplicates */}
              {selectedCard.quantity > 1 && (
                <button
                  className="btn-primary"
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={() => handleConvert(selectedCard)}
                >
                  🔄 Konversi Duplikat
                </button>
              )}
            </div>
          </div>
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

const selectStyle = {
  padding: '8px 12px', borderRadius: 8,
  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(124,58,237,0.3)',
  color: '#c084fc', fontSize: 12, cursor: 'pointer', flexShrink: 0,
};
