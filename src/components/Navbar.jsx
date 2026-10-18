import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <span className="navbar-brand">Smart Library</span>

      <nav className="navbar-links">
        <NavLink to="/" end>Catalog</NavLink>
        {(user.role === 'librarian' || user.role === 'admin') && (
          <NavLink to="/desk">Desk</NavLink>
        )}
        {user.role === 'student' && <NavLink to="/my-books">My books</NavLink>}
      </nav>

      <div className="navbar-user">
        <span>{user.name}</span>
        <span className="navbar-role">{user.role}</span>
        <button onClick={logout}>Log out</button>
      </div>
    </header>
  );
}

export default Navbar;