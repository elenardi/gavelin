import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { path: '/home',        label: 'Home',       icon: HomeIcon },
  { path: '/collection',  label: 'Koleksi',    icon: CollectionIcon },
  { path: '/battle',      label: 'Battle',     icon: BattleIcon },
  { path: '/community',   label: 'Komunitas',  icon: CommunityIcon },
  { path: '/shop',        label: 'Shop',       icon: ShopIcon },
];

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="nav-bar">
      {NAV_ITEMS.map(item => {
        const active = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <div
            key={item.path}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon active={active} />
            <span>{item.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

function HomeIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? '#7c3aed' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  );
}
function CollectionIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? '#7c3aed' : 'none'} stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="7" height="9" rx="1"/>
      <rect x="9" y="3" width="7" height="9" rx="1"/>
      <rect x="5" y="14" width="14" height="7" rx="1"/>
    </svg>
  );
}
function BattleIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? '#7c3aed' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
      <path d="M13 19l6-6 3 3-6 6-3-3z"/>
      <path d="M2 11l6-6 3 3-6 6-3-3z"/>
    </svg>
  );
}
function CommunityIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? '#7c3aed' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function ShopIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? '#7c3aed' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}
