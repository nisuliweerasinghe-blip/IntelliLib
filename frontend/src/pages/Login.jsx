import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const sessionEnded = params.get('reason') === 'session';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(
                err.response?.data?.error ||
                'Cannot reach the server. Check that the backend is running.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-intro">
                <p className="auth-brand">IntelliLib</p>
                <h1>Your next book is already on the shelf.</h1>
                <p className="auth-lead">
                    Search the catalog, reserve what is checked out, and see what you owe, all in one place.
                </p>
            </section>

            <section className="auth-side">
                <form className="member-card" onSubmit={handleSubmit}>
                    <h2>Member Card</h2>
                    <p className="card-hint">Sign in with the email you registered with.</p>
                    {sessionEnded && !error && (
                        <p className="row-note" role="status">
                            Your session ended. Sign in again to continue.
                        </p>
              )}

                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                    />

                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />

                    {error && <p className="form-error" role="alert">{error}</p>}

                    <button type="submit" disabled={submitting}>
                        {submitting ? 'Signing in...' : 'Sign In'}
                    </button>

                    <p className="card-switch">
                        New here? <Link to="/register">Create a member card</Link>
                    </p>
                </form>
            </section>
        </main>
    );
}
export default Login;