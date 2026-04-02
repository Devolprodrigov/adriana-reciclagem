import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, DollarSign, FileText, 
  Scale, User, Briefcase, Sparkles, CheckCircle2, Menu, X, Truck,
  LogOut
} from 'lucide-react';
import { 
  auth, db, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, FirebaseUser,
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
import { seedProducts } from './src/seedProducts';

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

  // 1. Monitorar o Estado da Autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Capturar o resultado do Redirecionamento (ESSENCIAL PARA REDIRECT)
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          setUser(result.user);
          notify("Login realizado com sucesso!");
        }
      } catch (error) {
        console.error("Erro no retorno do login:", error);
        // Se der erro de Cross-Origin, o console vai avisar aqui
      }
    };
    handleRedirect();
  }, []);

  // 3. Carregar Dados do Firebase quando logado
  useEffect(() => {
    if (!user) return;

    testConnection();
    seedProducts();

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[];
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
      // Forçar a seleção de conta para evitar logins automáticos bugados
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Erro ao iniciar login:", error);
      notify("Erro ao iniciar conexão com o Google.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
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
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-slate-100">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-4xl mx-auto mb-8 shadow-xl shadow-indigo-100">A</div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter mb-2">ADRIANA ERP</h1>
          <p className="text-slate-400 font-bold mb-10 text-[10px] uppercase tracking-[0.3em]">Gestão Industrial & Resíduos</p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-4 bg-slate-900 text-white font-black py-5 px-6 rounded-2xl hover:bg-black transition-all active:scale-[0.98] shadow-2xl text-[11px] uppercase tracking-widest"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 brightness-200" alt="Google" />
            Acessar com Google
          </button>
          
          <div className="mt-10 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-tight">
              Aviso: O sistema utiliza redirecionamento seguro para autenticação.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18}/>, color: 'hover:bg-indigo-50 hover:text-indigo-600' },
    { id: 'produtos', label: 'Catálogo', icon: <Package size={18}/>, color: 'hover:bg-blue-50 hover:text-blue-600' },
    { id: 'estoque', label: 'Estoque', icon: <Scale size={18}/>, color: 'hover:bg-amber-50 hover:text-amber-600' },
    { id: 'pf-clientes', label: 'Clientes PF', icon: <User size={18}/>, color: 'hover:bg-emerald-50 hover:text-emerald-600' },
    { id: 'pj-clientes', label: 'Empresas PJ', icon: <Briefcase size={18}/>, color: 'hover:bg-cyan-50 hover:text-cyan-600' },
    { id: 'pedidos', label: 'Novo Pedido', icon: <ShoppingCart size={18}/>, color: 'hover:bg-rose-50 hover:text-rose-600' },
    { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={18}/>, color: 'hover:bg-green-50 hover:text-green-600' },
    { id: 'notas-fiscais', label: 'Notas Fiscais', icon: <FileText size={18}/>, color: 'hover:bg-violet-50 hover:text-violet-600' },
    { id: 'mtr', label: 'Manifesto MTR', icon: <Truck size={18}/>, color: 'hover:bg-amber-50 hover:text-amber-600' },
    { id: 'ai-insights', label: 'IA Insights', icon: <Sparkles size={18}/>, color: 'hover:bg-purple-50 hover:text-purple-600' },
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
                <h1 className="font-black text-slate-800 tracking-tighter leading-none text-lg uppercase">ADRIANA</h1>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 leading-none">Reciclagem & ERP</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id as ActiveTab); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : `text-slate-500 ${item.color}`}`}>
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
            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-l-4 border-emerald-500">
              <CheckCircle2 className="text-emerald-400 w-5 h-5" />
              <span className="font-black uppercase text-[10px] tracking-widest">{notification}</span>
            </div>
          </div>
        )}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">{(activeTab || '').replace('-', ' ')}</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{user?.displayName || 'USUÁRIO'}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user?.email}</span>
              </div>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-xl border-2 border-slate-50 shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-lg">
                  {user?.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <button onClick={handleLogout} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
              <LogOut size={18} />
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