import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Wrench,
  Users,
  Truck,
  ShoppingCart,
  Settings,
  LogOut,
  Search,
  User as UserIcon,
  HardHat,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
} from './lib/icons';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import SeguimientoPage from './components/SeguimientoPage';
import DashboardModule from './components/DashboardModule';
import InventoryModule from './components/InventoryModule';
import WorkOrdersModule from './components/WorkOrdersModule';
import ClientsModule from './components/ClientsModule';
import POSModule from './components/POSModule';
import MechanicsModule from './components/MechanicsModule';
import UsersModule from './components/UsersModule';
import ReportsModule from './components/ReportsModule';
import SuppliersModule from './components/SuppliersModule';
import SettingsModule from './components/SettingsModule';
import LeadsModule from './components/LeadsModule';
import { apiRequest, clearSession, getSessionUser, restoreSession, SessionUser, subscribeSession, UserRole } from './lib/session';
import { Toaster } from './lib/toast';
import { WorkshopSettings } from './types';

interface AuthContextType {
  user: SessionUser | null;
  role: UserRole | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true, logout: () => {} });

// Tabs accesibles y tab por defecto según rol
const TABS_BY_ROLE: Record<string, string[]> = {
  admin:         ['dashboard', 'orders', 'inventory', 'pos', 'leads', 'reports', 'mechanics', 'suppliers', 'clients', 'settings'],
  receiver:      ['dashboard', 'orders', 'inventory', 'pos', 'clients'],
  stock_manager: ['dashboard', 'inventory', 'suppliers'],
  mechanic:      ['mechanic-portal', 'inventory'],
};
const DEFAULT_TAB: Record<string, string> = {
  admin:         'dashboard',
  receiver:      'orders',
  stock_manager: 'inventory',
  mechanic:      'mechanic-portal',
};

interface WorkshopContextType {
  settings: WorkshopSettings;
  refresh: () => Promise<void>;
}

const DEFAULT_WORKSHOP: WorkshopSettings = { name: 'TALLER MECÁNICO', address: '', phone: '', email: '', tagline: '' };
const WorkshopContext = createContext<WorkshopContextType>({ settings: DEFAULT_WORKSHOP, refresh: async () => {} });
export const useWorkshop = () => useContext(WorkshopContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getSessionUser());
    setRole(getSessionUser()?.role || null);

    const unsubscribe = subscribeSession(() => {
      const currentUser = getSessionUser();
      setUser(currentUser);
      setRole(currentUser?.role || null);
    });

    restoreSession().finally(() => setLoading(false));

    return () => {
      unsubscribe();
    };
  }, []);

  const logout = () => clearSession();

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => useContext(AuthContext);

function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isCollapsed, 
  setIsCollapsed,
  isMobile,
  isOpen,
  onClose
}: { 
  activeTab: string; 
  setActiveTab: (t: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { role, logout, user } = useAuth();
  const { settings: workshop } = useWorkshop();
  
  const menuItems = [
    { id: 'dashboard',       label: 'Panel',              icon: LayoutDashboard, roles: ['admin', 'receiver', 'stock_manager'], category: 'Operaciones' },
    { id: 'orders',          label: 'Órdenes de Trabajo', icon: ClipboardList,   roles: ['admin', 'receiver'],                  category: 'Operaciones' },
    { id: 'mechanic-portal', label: 'Mi Portal',          icon: HardHat,         roles: ['mechanic'],                           category: 'Operaciones' },
    { id: 'inventory',       label: 'Inventario',         icon: Package,         roles: ['admin', 'stock_manager', 'mechanic', 'receiver'], category: 'Operaciones' },
    { id: 'pos',             label: 'Caja / POS',         icon: ShoppingCart,    roles: ['admin', 'receiver'],                  category: 'Operaciones' },
    { id: 'leads',           label: 'Leads Web',          icon: MessageSquare,   roles: ['admin'],                              category: 'Administración' },
    { id: 'reports',         label: 'Reportes',           icon: TrendingUp,      roles: ['admin'],                              category: 'Administración' },
    { id: 'mechanics',       label: 'Staff Mecánico',     icon: Wrench,          roles: ['admin'],                              category: 'Administración' },
    { id: 'suppliers',       label: 'Proveedores',        icon: Truck,           roles: ['admin', 'stock_manager'],             category: 'Administración' },
    { id: 'clients',         label: 'Clientes',           icon: Users,           roles: ['admin', 'receiver'],                  category: 'Administración' },
    { id: 'settings',        label: 'Configuración',      icon: Settings,        roles: ['admin'],                              category: 'Administración' },
  ];

  const allowedItems = menuItems.filter(item => !role || item.roles.includes(role));
  const categories = Array.from(new Set(allowedItems.map(i => i.category)));

  return (
    <>
    {isMobile && isOpen && <div className="fixed inset-0 bg-black/40 z-10" onClick={onClose} />}
    <motion.div 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 240, x: isMobile ? (isOpen ? 0 : -300) : 0 }}
      className={`bg-sidebar-bg text-white min-h-screen flex flex-col shadow-2xl shrink-0 z-20 ${isMobile ? 'fixed left-0 top-0' : 'relative'}`}
    >
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-primary h-16">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 min-w-[32px] bg-white rounded flex items-center justify-center font-black text-primary italic">{workshop.name.charAt(0).toUpperCase()}</div>
          {!isCollapsed && <span className="font-black text-lg tracking-tighter italic uppercase truncate">{workshop.name || 'TALLER MECÁNICO'}</span>}
        </div>
        {isMobile ? (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        ) : (
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors absolute -right-3 top-20 bg-primary border-2 border-sidebar-bg shadow-xl"
          >
            {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        )}
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        {categories.map(cat => (
          <div key={cat} className="mb-4">
            {!isCollapsed && <div className="px-6 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{cat}</div>}
            {allowedItems.filter(i => i.category === cat).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isMobile) onClose();
                }}
                className={`w-full flex items-center gap-3 px-6 py-3 text-[11px] font-bold transition-all relative uppercase tracking-widest italic overflow-hidden h-11 ${
                  activeTab === item.id 
                    ? 'bg-white/10 text-white border-r-4 border-primary' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <div className="min-w-[14px]">
                  <item.icon className={`w-3.5 h-3.5 ${activeTab === item.id ? 'text-primary' : 'text-gray-600'}`} />
                </div>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800 bg-black/20">
        <div className="flex items-center gap-3 mb-4 px-2 overflow-hidden">
          <div className="w-8 h-8 min-w-[32px] bg-primary rounded-full flex items-center justify-center text-[10px] font-black italic">
            {user?.displayName?.charAt(0)}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-white truncate uppercase italic">{user?.displayName}</p>
              <p className="text-[9px] text-gray-500 capitalize font-bold">{role?.replace('_', ' ')}</p>
            </div>
          )}
        </div>
        <button 
          onClick={logout}
          className={`w-full flex items-center gap-2 py-2 text-[9px] font-black text-gray-500 hover:text-primary uppercase tracking-[0.2em] transition-colors overflow-hidden ${isCollapsed ? 'justify-center' : 'px-3'}`}
          title={isCollapsed ? 'Salir' : ''}
        >
          <LogOut className="w-3.5 h-3.5 min-w-[14px]" />
          {!isCollapsed && <span>Salir</span>}
        </button>
      </div>
    </motion.div>
    </>
  );
}

function AppContent() {
  const { user, role, loading } = useAuth();
  const [workshopSettings, setWorkshopSettings] = useState<WorkshopSettings>(DEFAULT_WORKSHOP);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');

  const refreshWorkshop = async () => {
    try {
      const data = await apiRequest<WorkshopSettings>('/api/settings/workshop');
      setWorkshopSettings((prev) => ({ ...prev, ...data }));
    } catch { /* usa el valor por defecto */ }
  };

  useEffect(() => {
    if (user) { refreshWorkshop(); }
  }, [user]);
  const MODULE_LABELS: Record<string, string> = {
    dashboard: 'Panel Diario',
    orders: 'Órdenes de Trabajo',
    'mechanic-portal': 'Mi Portal',
    inventory: 'Inventario',
    pos: 'Caja / POS',
    leads: 'Leads & Contactos Web',
    reports: 'Reportes',
    mechanics: 'Staff Mecánico',
    suppliers: 'Proveedores',
    clients: 'Clientes',
    settings: 'Configuración',
  };

  const [globalSearch, setGlobalSearch] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 1024);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  };

  // Redirigir al tab correcto cuando cambia el rol o si el tab guardado no es accesible
  useEffect(() => {
    if (!role) return;
    const allowed = TABS_BY_ROLE[role] ?? [];
    if (!allowed.includes(activeTab)) {
      handleSetActiveTab(DEFAULT_TAB[role] ?? allowed[0] ?? 'dashboard');
    }
  }, [role]); // solo cuando cambia el rol, no en cada cambio de tab

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
      if (mobile) {
        setIsCollapsed(false);
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [showAdminLogin, setShowAdminLogin] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (!user) {
    if (showAdminLogin) return <Login />;
    return <LandingPage onGoToAdmin={() => setShowAdminLogin(true)} />;
  }

  return (
    <WorkshopContext.Provider value={{ settings: workshopSettings, refresh: refreshWorkshop }}>
    <div className="flex bg-app-bg min-h-screen text-app-text overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleSetActiveTab} 
        isCollapsed={isCollapsed && !isMobile}
        setIsCollapsed={setIsCollapsed} 
        isMobile={isMobile}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="min-h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 py-2 shrink-0 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-[10px] font-black uppercase tracking-widest shrink-0"
              >
                Menu
              </button>
            )}
            <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1.5 w-full lg:w-80 border border-gray-100 focus-within:border-primary transition-colors shrink-0">
              <Search className="text-gray-400 w-4 h-4 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Buscar CI, cliente o N° OT..."
                className="bg-transparent outline-none text-[11px] font-bold uppercase tracking-widest w-full placeholder:text-gray-400"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
            {!isMobile && (
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400 truncate hidden xl:block">
                {MODULE_LABELS[activeTab] ?? ''}
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {(role === 'admin' || role === 'receiver') && (
              <button
                type="button"
                onClick={() => handleSetActiveTab('orders')}
                className="bg-primary text-white px-4 py-2 rounded-lg text-[10px] font-black shadow-lg shadow-orange-100 hover:brightness-110 transition-all uppercase italic tracking-tighter"
              >
                + Nueva OT
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[#F1F3F5] scrollbar-hide">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="p-4 lg:p-8 max-w-[1600px] mx-auto"
          >
            {activeTab === 'dashboard' && <DashboardModule />}
            {activeTab === 'orders' && <WorkOrdersModule globalSearch={globalSearch} />}
            {activeTab === 'mechanic-portal' && <WorkOrdersModule globalSearch={globalSearch} portalMode />}
            {activeTab === 'inventory' && <InventoryModule globalSearch={globalSearch} />}
            {activeTab === 'pos' && <POSModule />}
            {activeTab === 'reports' && <ReportsModule />}
            {activeTab === 'mechanics' && <MechanicsModule />}
            {activeTab === 'suppliers' && <SuppliersModule />}
            {activeTab === 'clients' && <ClientsModule globalSearch={globalSearch} />}
            {activeTab === 'leads' && <LeadsModule />}
            {activeTab === 'users' && <UsersModule />}
            {activeTab === 'settings' && <SettingsModule onNavigate={handleSetActiveTab} />}
          </motion.div>
        </div>
      </main>
    </div>
    </WorkshopContext.Provider>
  );
}

export default function App() {
  if (window.location.pathname.startsWith('/seguimiento')) {
    return <SeguimientoPage />;
  }
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}
