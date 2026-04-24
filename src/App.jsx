import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

// Import pages (skeletons first)
import Dashboard from './pages/Dashboard';
import Recommendations from './pages/Recommendations';
import SearchIntelligence from './pages/SearchIntelligence';
import Products from './pages/Products';
import PluginSetup from './pages/PluginSetup';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/search-intelligence" element={<SearchIntelligence />} />
        <Route path="/products" element={<Products />} />
        <Route path="/plugin" element={<PluginSetup />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
