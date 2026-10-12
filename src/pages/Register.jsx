import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import './Auth.css';

function Register() {
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            await api.post('/users/register', { name, email, password, role: 'student' });
            navigate('/login');
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
                <p className="auth-brand">Smart Library</p>
                <h1>One card opens every shelf.</h1>
                <p className="auth-lead">
                    Register once to borrow books, join waiting lists, and get an email the moment a reserved book is ready.
                </p>
            </section>

            <section className="auth-side">
                <form className="member-card" onSubmit={handleSubmit}>
                    <h2>Join the library</h2>
                    <p className="card-hint">It takes less than a minute.</p>

                    <label htmlFor="name">Full name</label>
                    <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />

                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />

                    <label htmlFor="password">Password</label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} required />

                    {error && <p className="form-error" role="alert">{error}</p>}

                    <button type="submit" disabled={submitting}>
                        {submitting ? 'Creating your card...' : 'Create account'}
                    </button>

                    <p className="card-switch">
                        Already a member? <Link to="/login">Sign in</Link>
                    </p>
                </form>
            </section>
        </main>
    );
}

export default Register;