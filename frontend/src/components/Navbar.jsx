import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();
  const isStaff = user.role === 'librarian' || user.role === 'admin';

  return (
    <header className="navbar">
      <span className="navbar-brand">IntelliLib</span>

      <nav className="navbar-links">
        <NavLink to="/" end>Catalog</NavLink>
        {user.role === 'student' && <NavLink to="/my-books">My books</NavLink>}
        {isStaff && (
          <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/desk">Desk</NavLink>
          </>
        )}
        {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
      </nav>

      <div className="navbar-user">
        <NavLink to="/account">{user.name}</NavLink>
        <span className="navbar-role">{user.role}</span>
        <button onClick={logout}>Log out</button>
      </div>
    </header>
  );
}

export default Navbar;