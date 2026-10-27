import { useState, useEffect } from 'react';
import {
  Home,
  LayoutGrid,
  Flame,
  CircleDollarSign,
  Printer,
  Settings
} from 'lucide-react';
import { m } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import api from '../api';

export function MacDock({ currentView = 'dashboard', onNavigate, kitchenOrdersCount = 0 }) {
  const { user, canView } = useAuth();
  const isSuperadmin = String(user?.role || '').toLowerCase() === 'superadmin';

  const [kdsEnabled, setKdsEnabled] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.kds.getStatus().then((res) => {
      if (isMounted && res) setKdsEnabled(Boolean(res.enabled));
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  useSocket({
    'settings:module_kds_toggled': ({ enabled }) => {
      setKdsEnabled(Boolean(enabled));
    },
  });

  const userRole = user?.role || 'waiter';

  // Configuración de los íconos de la barra dock con diseño squircle a color y fondo blanco translúcido
  const dockItems = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: Home,
      gradient: 'bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8]',
      shadow: 'shadow-md shadow-blue-500/35',
      allowed: !canView || canView('dashboard'),
    },
    {
      id: 'tables',
      label: 'Mesas',
      icon: LayoutGrid,
      gradient: 'bg-gradient-to-b from-[#06b6d4] to-[#0284c7]',
      shadow: 'shadow-md shadow-cyan-500/35',
      allowed: !canView || canView('tables'),
    },
    {
      id: 'kds',
      label: 'KDS',
      icon: Flame,
      gradient: 'bg-gradient-to-b from-[#f59e0b] to-[#ea580c]',
      shadow: 'shadow-md shadow-orange-500/35',
      badge: kitchenOrdersCount > 0 ? kitchenOrdersCount : null,
      allowed: (!canView || canView('kds')) && (kdsEnabled || isSuperadmin),
    },
    {
      id: 'accounts',
      label: 'Cuentas',
      icon: CircleDollarSign,
      gradient: 'bg-gradient-to-b from-[#10b981] to-[#059669]',
      shadow: 'shadow-md shadow-emerald-500/35',
      allowed: !canView || canView('accounts'),
    },
    {
      id: 'divider-1',
      isDivider: true,
      allowed: true,
    },
    {
      id: 'reprints',
      label: 'Reimpr.',
      icon: Printer,
      gradient: 'bg-gradient-to-b from-[#8b5cf6] to-[#6366f1]',
      shadow: 'shadow-md shadow-purple-500/35',
      allowed: !canView
        ? ['superadmin', 'admin', 'manager', 'cashier'].includes(userRole)
        : canView('reprints'),
    },
    {
      id: 'settings',
      label: 'Config.',
      icon: Settings,
      gradient: 'bg-gradient-to-b from-[#334155] to-[#1e293b]',
      shadow: 'shadow-md shadow-slate-800/35',
      allowed: ['superadmin', 'admin', 'manager'].includes(userRole),
    },
  ];

  const visibleItems = dockItems.filter((item) => item.allowed);

  return (
    <div className="fixed bottom-2.5 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none max-w-[calc(100vw-1rem)]">
      {/* Contenedor Flotante Estilo Dock macOS Blanco Semi-Transparente */}
      <m.nav
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="pointer-events-auto bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 rounded-[22px] sm:rounded-[28px] px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-2.5 max-w-full"
      >
        {visibleItems.map((item) => {
          if (item.isDivider) {
            return (
              <div
                key={item.id}
                className="w-px h-7 sm:h-8 bg-slate-300/80 mx-0.5 sm:mx-1 self-center rounded-full"
              />
            );
          }

          const isActive = currentView === item.id;
          const IconComponent = item.icon;

          return (
            <div key={item.id} className="relative flex flex-col items-center group">
              {/* Tooltip flotante superior */}
              <div className="absolute -top-8 px-2 py-0.5 rounded-lg bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-semibold tracking-wide shadow-lg border border-white/10 pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col items-center">
                <span>{item.label}</span>
                <span className="w-1.5 h-1.5 bg-slate-900/90 rotate-45 -mb-1 mt-[-2px] border-r border-b border-white/10" />
              </div>

              {/* Botón interactivo con efecto de magnificación macOS */}
              <m.button
                type="button"
                whileHover={{
                  y: -4,
                  scale: 1.1,
                  transition: { type: 'spring', stiffness: 450, damping: 18 },
                }}
                whileTap={{
                  scale: 0.92,
                  y: 0,
                  transition: { duration: 0.1 },
                }}
                onClick={() => onNavigate && onNavigate(item.id)}
                className="flex flex-col items-center justify-center p-0.5 sm:p-1.5 rounded-2xl transition-colors focus:outline-none relative cursor-pointer"
              >
                {/* Cuadro de ícono estilo squircle con gradiente vivo */}
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[16px] sm:rounded-2xl flex items-center justify-center transition-all duration-200 relative ${
                    item.gradient
                  } ${item.shadow} ${
                    isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-blue-500/20 scale-102' : ''
                  }`}
                >
                  <IconComponent className="w-4 h-4 sm:w-6 sm:h-6 text-white" strokeWidth={2.2} />

                  {/* Badge de KDS / Notificación */}
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] sm:min-w-[18px] h-4 sm:h-[18px] px-1 bg-rose-500 text-white text-[9px] sm:text-[10px] font-black rounded-full flex items-center justify-center shadow ring-2 ring-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Etiqueta de texto debajo */}
                <span
                  className={`text-[10px] sm:text-xs tracking-tight leading-tight mt-0.5 sm:mt-1 transition-colors ${
                    isActive
                      ? 'text-slate-900 font-bold'
                      : 'text-slate-600 font-medium group-hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </span>

                {/* Punto activo indicador estilo macOS debajo del texto */}
                <div className="h-1 flex items-center justify-center mt-0.5">
                  {isActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-sm" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
                  )}
                </div>
              </m.button>
            </div>
          );
        })}
      </m.nav>
    </div>
  );
}

export default MacDock;
