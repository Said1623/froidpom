import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './Sidebar.module.css';

const NAV = [
  { to: '/',            icon: '◈',  label: 'Tableau de bord' },
  { to: '/chambres',    icon: '❄',  label: 'Chambres' },
  { to: '/clients',     icon: '👤', label: 'Clients' },
  { to: '/reservations',icon: '📋', label: 'Réservations' },
  { to: '/entrees',     icon: '↓',  label: 'Entrées' },
  { to: '/sorties',     icon: '↑',  label: 'Sorties' },
  { to: '/paiements',   icon: '€',  label: 'Paiements' },
  { to: '/locations',   icon: '📦', label: 'Locations' },
  { to: '/stock',       icon: '≡',  label: 'Suivi Stock' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>❄</span>
        <div>
          <div className={styles.brandName}>Froidpom</div>
          <div className={styles.brandSub}>Gestion frigorifique</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.linkIcon}>{item.icon}</span>
            <span className={styles.linkLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{(user?.nom || user?.username || '?')[0].toUpperCase()}</div>
          <div>
            <div className={styles.userName}>{user?.nom || user?.username}</div>
            <div className={styles.userRole}>{user?.role}</div>
          </div>
        </div>
        <button className={styles.logout} onClick={handleLogout} title="Déconnexion">⏻</button>
      </div>
    </aside>
  );
}
