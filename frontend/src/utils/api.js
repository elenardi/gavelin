import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Attach token setiap request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('gavelin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle token expired
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gavelin_token');
      window.location.href = '/auth';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (data)     => api.post('/auth/register', data),
  login:    (data)     => api.post('/auth/login', data),
  getMe:    ()         => api.get('/auth/me'),
  updateProfile: (d)   => api.patch('/auth/profile', d),
  getNotifications: () => api.get('/auth/notifications'),
  markNotificationsRead: () => api.patch('/auth/notifications/read'),
};

export const packApi = {
  getAll:     ()      => api.get('/packs'),
  getById:    (id)    => api.get(`/packs/${id}`),
  open:       (id)    => api.post(`/packs/${id}/open`),
  getHistory: ()      => api.get('/packs/history/mine'),
};

export const collectionApi = {
  getCards:       (params) => api.get('/collection/cards', { params }),
  upgradeCard:    (id)     => api.post(`/collection/cards/${id}/upgrade`),
  convertCard:    (id, amount) => api.post(`/collection/cards/${id}/convert`, { amount }),
  getDecks:       ()       => api.get('/collection/decks'),
  createDeck:     (data)   => api.post('/collection/decks', data),
  updateDeck:     (id, d)  => api.put(`/collection/decks/${id}`, d),
  deleteDeck:     (id)     => api.delete(`/collection/decks/${id}`),
};

export const communityApi = {
  getFriends:      ()      => api.get('/community/friends'),
  searchUsers:     (q)     => api.get('/community/search', { params: { q } }),
  sendRequest:     (id)    => api.post('/community/friends/request', { addresseeId: id }),
  respondRequest:  (id, a) => api.patch(`/community/friends/${id}`, { action: a }),
  removeFriend:    (id)    => api.delete(`/community/friends/${id}`),
  getGifts:        ()      => api.get('/community/gifts'),
  sendGift:        (data)  => api.post('/community/gift', data),
  claimGift:       (id)    => api.post(`/community/gift/${id}/claim`),
};

export const battleApi = {
  startAI:     (data) => api.post('/battle/ai/start', data),
  pvpQueue:    (data) => api.post('/battle/pvp/queue', data),
  getHistory:  ()     => api.get('/battle/history'),
  getLeaderboard: () => api.get('/battle/leaderboard'),
};

export const shopApi = {
  getItems:    ()         => api.get('/shop'),
  buyItem:     (id, qty)  => api.post(`/shop/buy/${id}`, { quantity: qty }),
  getHistory:  ()         => api.get('/shop/history'),
};

export const missionApi = {
  getAll:    ()    => api.get('/missions'),
  claim:     (id)  => api.post(`/missions/${id}/claim`),
  loginCheck: ()   => api.post('/missions/login-checkin'),
};

export const newsApi = {
  getAll: () => api.get('/news'),
};

export default api;
