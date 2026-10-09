import { useEffect, useState } from "react"; 
import api from '../api/axiosInstance';

function BookList() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await api.get('/books');
                setBooks(response.data);
            } catch (err) {
                console.error('Full error:', err);
                setError('Failed to load books: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, []);

    if (loading) return <p>Loading books...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div>
            <h1>Book Library Catalog</h1>
            {books.length === 0 ? (
                <p>No books available.</p>
            ) : (
                <ul>
                    {books.map((book) => (
                        <li key={book.id}>
                            <strong>{book.title}</strong> by {book.author} - {book.availableQty}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
} 

export default BookList;