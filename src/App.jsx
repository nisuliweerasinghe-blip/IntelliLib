import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import BookList from './pages/BookList';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Desk from './pages/Desk';
import MyBooks from './pages/MyBooks';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<BookList />} />
          <Route
            path="/desk"
            element={
              <ProtectedRoute roles={['librarian', 'admin']}>
                <Desk />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-books"
            element={
              <ProtectedRoute roles={['student']}>
                <MyBooks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['librarian', 'admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;