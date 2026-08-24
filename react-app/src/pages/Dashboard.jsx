import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import api from '../api';
import { 
  LayoutGrid, 
  Settings, 
  LogOut,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  PlayCircle,
  BarChart3,
  CreditCard,
  UtensilsCrossed,
  ListTodo,
  Printer,
  ChefHat
} from 'lucide-react';

export function Dashboard({ onNavigate }) {
  const { user, logout, modules, restaurantName, logoUrl } = useAuth();
  const [stats, setStats] = useState({
    freeTables: 0,
    busyTables: 0,
    todayOrders: 0,
    todaySales: 0
  });
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    loadData();
    updateGreeting();
  }, []);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  };

  const loadData = async (centerId) => {
    try {
      const data = await api.bootstrap();
      setCenters(data.centers || []);
      
      const targetCenter = centerId || data.defaultCenterId;
      if (!selectedCenter && targetCenter) {
        setSelectedCenter(targetCenter);
      }
      
      const tables = await api.getTables(targetCenter);
      const free = tables.filter(t => t.open_accounts === 0).length;
      const busy = tables.filter(t => t.open_accounts > 0).length;
      setStats({
        freeTables: free,
        busyTables: busy,
        todayOrders: busy,
        todaySales: 0
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadData(selectedCenter);
  }, [selectedCenter]);

  const allMenuItems = [
    { 
      id: 'tables', 
      icon: LayoutGrid, 
      title: 'Mesas', 
      subtitle: 'Ver mapa de mesas',
      gradient: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      roles: ['admin', 'manager', 'cashier', 'waiter']
    },
    { 
      id: 'kds', 
      icon: ChefHat, 
      title: 'KDS', 
      subtitle: 'Cocina en vivo',
      gradient: 'from-orange-500 to-red-600',
      bgLight: 'bg-orange-50',
      roles: ['admin', 'manager', 'cashier', 'kitchen']
    },
    {
      id: 'shifts',
      icon: PlayCircle, 
      title: 'Turnos', 
      subtitle: 'Apertura y cierre',
      gradient: 'from-teal-500 to-teal-600',
      bgLight: 'bg-teal-50',
      roles: ['admin', 'manager', 'cashier']
    },
    {
      id: 'reports',
      icon: BarChart3,
      title: 'Reportes',
      subtitle: 'Ventas, anulaciones y CXC',
      gradient: 'from-orange-500 to-orange-600',
      bgLight: 'bg-orange-50',
      roles: ['admin', 'manager']
    },
    {
      id: 'settings', 
      icon: Settings, 
      title: 'Configuración', 
      subtitle: 'Productos y más',
      gradient: 'from-violet-500 to-violet-600',
      bgLight: 'bg-violet-50',
      roles: ['admin', 'manager']
    },
  ];

  const menuItems = allMenuItems.filter(item => 
    !item.roles || item.roles.includes(user?.role || 'waiter')
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600">
                {logoUrl ? (
                  <img src={logoUrl} alt={restaurantName} className="w-full h-full object-contain p-1" />
                ) : (
                  <UtensilsCrossed className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">
                  {greeting}, {user?.full_name?.split(' ')[0] || 'Usuario'}
                </h1>
                <p className="text-xs text-gray-500">
                  {user?.role === 'admin' ? 'Administrador' : user?.role === 'manager' ? 'Gerente' : user?.role === 'cashier' ? 'Cajero' : user?.role === 'waiter' ? 'Mesero' : user?.role}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Selector */}
        {centers.length > 0 && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {centers.map(center => (
              <m.button
                key={center.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCenter(center.id)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                  ${selectedCenter === center.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}
              >
                {center.name}
              </m.button>
            ))}
          </div>
        )}
      </header>

      {/* Stats */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <m.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-100"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <LayoutGrid className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                +{stats.freeTables}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.freeTables}</p>
            <p className="text-xs text-gray-500">Mesas libres</p>
          </m.div>

          <m.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                Activas
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.busyTables}</p>
            <p className="text-xs text-gray-500">Mesas ocupadas</p>
          </m.div>

          <m.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.todayOrders}</p>
            <p className="text-xs text-gray-500">Órdenes hoy</p>
          </m.div>

          <m.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-100"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-violet-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">Q {stats.todaySales.toFixed(0)}</p>
            <p className="text-xs text-gray-500">Ventas del día</p>
          </m.div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Acciones Rápidas
          </h2>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {menuItems.map((item, index) => (
            <m.button
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate(item.id)}
              className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col items-center text-center gap-2"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-sm`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xs font-medium text-gray-900 leading-tight">{item.title}</h3>
              </div>
            </m.button>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2">
        <div className="flex justify-around">
          <button onClick={() => onNavigate('tables')}
            className="flex flex-col items-center gap-0.5 p-2 text-gray-400 hover:text-primary-600"
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-medium">Mesas</span>
          </button>
          <button 
            onClick={() => onNavigate('kds')}
            className="flex flex-col items-center gap-0.5 p-2 text-orange-500 hover:text-orange-600"
          >
            <ChefHat className="w-5 h-5" />
            <span className="text-[10px] font-medium">KDS</span>
          </button>
          <button 
            onClick={() => onNavigate('accounts')}
            className="flex flex-col items-center gap-0.5 p-2 text-gray-400 hover:text-primary-600"
          >
            <ListTodo className="w-5 h-5" />
            <span className="text-[10px] font-medium">Cuentas</span>
          </button>
          {['admin', 'manager', 'cashier'].includes(user?.role) && (
            <button 
              onClick={() => onNavigate('reprints')}
              className="flex flex-col items-center gap-0.5 p-2 text-gray-400 hover:text-primary-600"
            >
              <Printer className="w-5 h-5" />
              <span className="text-[10px] font-medium">Reimpr.</span>
            </button>
          )}
          {['admin', 'manager'].includes(user?.role) && (
            <button 
              onClick={() => onNavigate('settings')}
              className="flex flex-col items-center gap-0.5 p-2 text-gray-400 hover:text-primary-600"
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] font-medium">Config.</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
