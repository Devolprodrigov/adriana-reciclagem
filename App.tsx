import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, DollarSign, FileText, 
  Scale, User, Briefcase, Sparkles, CheckCircle2, Menu, X, Truck,
  LogOut
} from 'lucide-react';
import { 
  auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, FirebaseUser,
  collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [customersPF, setCustomersPF] = useState<CustomerPF[]>([]);
  const [customersPJ, setCustomersPJ] = useState<CustomerPJ[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);

  // Monitorar Login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Carregar todos os dados do Firebase
  useEffect(() => {
    if (!user) return;

    const unsubProducts = onSnapshot(collection(db, 'products'), (s) => {
      setProducts(s.docs.map(d => ({ ...d.data(), id: d.id })) as any);
    });

    const unsubPF = onSnapshot(collection(db, 'customersPF'), (s) => {
      setCustomersPF(s.docs.map(d => ({ ...d.data(), id: d.id })) as any);
    });

    const unsubPJ = onSnapshot(collection(db, 'customersPJ'), (s) => {
      setCustomersPJ(s.docs.map(d => ({ ...d.data(), id: d.id })) as any);
    });

    const unsubFinancials = onSnapshot(query(collection(db, 'financials'), orderBy('date', 'desc')), (s) => {
      setFinancials(s.docs.map(d => ({ ...d.data(), id: d.id })) as any);
    });

    return () => { unsubProducts(); unsubPF(); unsubPJ(); unsubFinancials(); };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("E-mail ou senha inválidos.");
    }
  };

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  if (!isAuthReady) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 p-6">
        <form onSubmit={handleLogin} className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-6 shadow-xl shadow-indigo-100">A</div>
          <h2 className="text-2xl font-black text-center mb-8 uppercase tracking-tighter">Adriana ERP</h2>
          <div className="space-y-4 mb-6">
            <input type="email" placeholder="E-mail" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-sm" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Senha" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-sm" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all">Entrar no Sistema</button>
        </form>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18}/> },
    { id: 'produtos', label: 'Catálogo', icon: <Package size={18}/> },
    { id: 'estoque', label: 'Estoque', icon: <Scale size={18}/> },
    { id: 'pf-clientes', label: 'Clientes PF', icon: <User size={18}/> },
    { id: 'pj-clientes', label: 'Empresas PJ', icon: <Briefcase size={18}/> },
    { id: 'pedidos', label: 'Novo Pedido', icon: <ShoppingCart size={18}/> },
    { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={18}/> },
    { id: 'notas-fiscais', label: 'Notas Fiscais', icon: <FileText size={18}/> },
    { id: 'mtr', label: 'Manifesto MTR', icon: <Truck size={18}/> },
    { id: 'ai-insights', label: 'IA Insights', icon: <Sparkles size={18}/> },
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
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-8 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">A</div>
          <h1 className="font-black text-slate-800 tracking-tighter text-lg uppercase">ADRIANA</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => signOut(auth)} className="p-8 border-t border-slate-100 flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-rose-600 transition-colors">
          <LogOut size={18}/> Sair
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {notification && (
          <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-l-4 border-emerald-500 animate-in fade-in zoom-in">
            <CheckCircle2 className="text-emerald-400 w-5 h-5" />
            <span className="font-black uppercase text-[10px] tracking-widest">{notification}</span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;