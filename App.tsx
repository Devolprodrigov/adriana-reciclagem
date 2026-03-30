import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, DollarSign, FileText, 
  Scale, User, Briefcase, Sparkles, CheckCircle2, Menu, X, Truck,
  LogIn, LogOut
} from 'lucide-react';
import { 
  auth, db, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, FirebaseUser,
  collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType, testConnection
} from './firebase';
import { Product, CustomerPF, CustomerPJ, FinancialRecord, ActiveTab } from './types';
import DashboardView from './components/DashboardView';
import ProdutosView from './components/ProdutosView';
import EstoqueView from './components/EstoqueView';
import ClientesPFView from './components/ClientesPFView';
import ClientesPJView from './components/ClientesPJView';
import OrdersView from './components/OrdersView';
import FinanceiroView from './components/FinanceiroView';
import NFView from './components/NFView';
import MTRView from './components/MTRView';
import AIInsightsView from './components/AIInsightsView';
import { seedProducts } from './src/seedProducts'; // Importação do seu script de carga

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem('ironcore_active_tab');
    return (saved as ActiveTab) || 'dashboard';
  });
  const [notification, setNotification] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [customersPF, setCustomersPF] = useState<CustomerPF[]>([]);
  const [customersPJ, setCustomersPJ] = useState<CustomerPJ[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Monitora o estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Monitora os dados do Firestore quando o usuário está logado
  useEffect(() => {
    if (!user) return;

    testConnection();
    
    // PASSO 1: DISPARA A CARGA DOS PRODUTOS DA ADRIANA
    // Isso roda uma vez sempre que você logar ou der refresh.
    seedProducts();

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any;
      setProducts(data);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'products'));

    const unsubPF = onSnapshot(collection(db, 'customersPF'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any;
      setCustomersPF(data);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'customersPF'));

    const unsubPJ = onSnapshot(collection(db, 'customersPJ'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any;
      setCustomersPJ(data);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'customersPJ'));

    const unsubFinancials = onSnapshot(query(collection(db, 'financials'), orderBy('date', 'desc')), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any;
      setFinancials(data);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'financials'));

    return () => {
      unsubProducts();
      unsubPF();
      unsubPJ();
      unsubFinancials();
    };
  }, [user]);

  useEffect(() => {
    localStorage.setItem('ironcore_active_tab', activeTab);
  }, [activeTab]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      notify("Erro ao fazer login com Google.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      notify("Sessão encerrada.");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-4xl mx-auto mb-8 shadow-lg shadow-indigo-200">A</div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Bem-vindo à Adriana</h1>
          <p className="text-slate-500 font-medium mb-10">Reciclagem & Gestão Industrial</p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 font-bold py-4 px-6 rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Entrar com Google
          </button>
          
          <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Acesso Restrito a Colaboradores</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20}/>, color: 'hover:bg-indigo-50 hover:text-indigo-600' },
    { id: 'produtos', label: 'Catálogo', icon: <Package size={20}/>, color: 'hover:bg-blue-50 hover:text-blue-600' },
    { id: 'estoque', label: 'Estoque', icon: <Scale size={20}/>, color: 'hover:bg-amber-50 hover:text-amber-600' },
    { id: 'pf-clientes', label: 'Clientes PF', icon: <User size={20}/>, color: 'hover:bg-emerald-50 hover:text-emerald-600' },
    { id: 'pj-clientes', label: 'Empresas PJ', icon: <Briefcase size={20}/>, color: 'hover:bg-cyan-50 hover:text-cyan-600' },
    { id: 'pedidos', label: 'Novo Pedido', icon: <ShoppingCart size={20}/>, color: 'hover:bg-rose-50 hover:text-rose-600' },
    { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={20}/>, color: 'hover:bg-green-50 hover:text-green-600' },
    { id: 'notas-fiscais', label: 'Notas Fiscais', icon: <FileText size={20}/>, color: 'hover:bg-violet-50 hover:text-violet-600' },
    { id: 'mtr', label: 'Manifesto MTR', icon: <Truck size={20}/>, color: 'hover:bg-amber-50 hover:text-amber-600' },
    { id: 'ai-insights', label: 'IA Insights', icon: <Sparkles size={20}/>, color: 'hover:bg-purple-50 hover:text-purple-600' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView financials={financials} products={products} />;
      case 'produtos': return <ProdutosView products={products} notify={notify} />;
      case 'estoque': return <EstoqueView products={products} notify={notify} />;
      case 'pf-clientes': return <ClientesPFView customers={customersPF} notify={notify} />;
      case 'pj-clientes': return <ClientesPJView customers={customersPJ} notify={notify} />;
      case 'pedidos': return <OrdersView products={products} financials={financials} customersPF={customersPF} customersPJ={customersPJ} notify={notify} />;
      case 'financeiro': return <FinanceiroView financials={financials} notify={notify} />;
      case 'notas-fiscais': return <NFView customersPF={customersPF} customersPJ={customersPJ} notify={notify} />;
      case 'mtr': return <MTRView notify={notify} />;
      case 'ai-insights': return <AIInsightsView financials={financials} products={products} />;
      default: return <DashboardView financials={financials} products={products} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed bottom-6 right-6 z-50 bg-indigo-600 text-white p-4 rounded-full shadow-xl">
        {sidebarOpen ? <X size={24}/> : <Menu size={24}/>}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl">A</div>
              <div>
                <h1 className="font-black text-slate-800 tracking-tight leading-none text-lg">ADRIANA</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reciclagem & ERP</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id as ActiveTab); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : `text-slate-500 ${item.color}`}`}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {notification && (
          <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right-10">
            <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
              <CheckCircle2 className="text-emerald-400 w-5 h-5" />
              <span className="font-bold text-sm">{notification}</span>
            </div>
          </div>
        )}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-xl font-black text-slate-800 capitalize tracking-tight">{(activeTab || '').replace('-', ' ')}</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-slate-800">{user?.displayName || 'Usuário'}</span>
                <span className="text-[10px] font-bold text-slate-400">{user?.email}</span>
              </div>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-xl border-2 border-slate-100" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                  {user?.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <button 
              onClick={handleLogout}
              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;