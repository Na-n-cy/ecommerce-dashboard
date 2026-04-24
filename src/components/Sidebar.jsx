import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Star, 
  Search, 
  Package, 
  Code, 
  LogOut,
  User
} from 'lucide-react';

const Sidebar = () => {
  const { ownerName, shopId, logout } = useAuth();

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/recommendations', label: 'Recommendations', icon: Star },
    { to: '/search-intelligence', label: 'Search Intelligence', icon: Search },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/plugin', label: 'Plugin Setup', icon: Code },
  ];

  return (
    <div className="w-60 h-screen bg-gray-900 text-white flex flex-col fixed left-0 top-0 border-r border-gray-800">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight text-blue-500 mb-4">AURÉLIA</h1>
        <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
            {ownerName?.[0] || 'O'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">{ownerName || 'Owner'}</p>
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{shopId}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <link.icon size={20} className="transition-transform group-hover:scale-110" />
            <span className="font-medium text-sm">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
