import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, DollarSign, FileText, 
  Scale, User, Briefcase, Sparkles, CheckCircle2, Truck, LogOut
} from 'lucide-react';

import { 
  auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, FirebaseUser,
  collection, onSnapshot, query, orderBy
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Escuta em tempo real todas as coleções
    const unsubProducts = onSnapshot(collection(db, 'products'), (s) => {
      setProducts(s.docs.map(d => ({ ...d.data(), id: d.id })) as any);
    });

    const unsubPF = onSnapshot(collection(db, 'customersPF'), (s) => {
      setCustomersPF(s.docs.map(d => ({ ...d.data(), id: d.id })) as any);
    });

    const unsubPJ = onSnapshot(collection(db, 'customersPJ'), (s) => {
      setCustomersPJ(s.docs.map(d => ({ ...d.data(), id: d.id })) as any);
    });

    const unsubFinancials = onSnapshot(
      query(collection(db, 'financials'), orderBy('date', 'desc')),
      (s) => {
        setFinancials(s.docs.map(d => ({ ...d.data(), id: d.id })) as any);
      }
    );

    return () => {
      unsubProducts(); unsubPF(); unsubPJ(); unsubFinancials();
    };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      alert("E-mail ou senha inválidos.");
    }
  };

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  if (!isAuthReady) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin h-12 w-12 border-b-2 border-indigo-600 rounded-full"></div></div>;

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 p-6">
        <form onSubmit={handleLogin} className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl">
          <h2 className="text-2xl font-black text-center mb-8 uppercase tracking-tighter">Adriana ERP</h2>
          <input type="email" placeholder="E-mail" className="w-full p-4 mb-4 bg-slate-100 rounded-2xl outline-none font-bold" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" className="w-full p-4 mb-6 bg-slate-100 rounded-2xl outline-none font-bold" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Entrar no Sistema</button>
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
    { id: 'pedidos', label: 'Pedidos', icon: <ShoppingCart size={18}/> },
    { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={18}/> },
    { id: 'notas-fiscais', label: 'Notas', icon: <FileText size={18}/> },
    { id: 'mtr', label: 'MTR', icon: <Truck size={18}/> },
    { id: 'ai-insights', label: 'IA Insights', icon: <Sparkles size={18}/> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-4">
        <div className="p-4 mb-6"><h1 className="font-black text-indigo-600 text-xl uppercase tracking-tighter">Adriana</h1></div>
        <nav className="flex-1 space-y-1">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => signOut(auth)} className="p-4 text-rose-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 mt-auto">
          <LogOut size={16}/> Sair
        </button>
      </aside>

      <main className="flex-1 overflow-auto p-8 relative">
        {notification && (
          <div className="fixed top-8 right-8 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in">
            <span className="text-[10px] font-black uppercase tracking-widest">{notification}</span>
          </div>
        )}
        {activeTab === 'dashboard' && <DashboardView financials={financials} products={products} />}
        {activeTab === 'produtos' && <ProdutosView products={products} notify={notify} />}
        {activeTab === 'estoque' && <EstoqueView products={products} notify={notify} />}
        {activeTab === 'pf-clientes' && <ClientesPFView customers={customersPF} notify={notify} />}
        {activeTab === 'pj-clientes' && <ClientesPJView customers={customersPJ} notify={notify} />}
        {activeTab === 'pedidos' && <OrdersView products={products} financials={financials} customersPF={customersPF} customersPJ={customersPJ} notify={notify} />}
        {activeTab === 'financeiro' && <FinanceiroView financials={financials} notify={notify} />}
        {activeTab === 'notas-fiscais' && <NFView customersPF={customersPF} customersPJ={customersPJ} notify={notify} />}
        {activeTab === 'mtr' && <MTRView notify={notify} />}
        {activeTab === 'ai-insights' && <AIInsightsView financials={financials} products={products} />}
      </main>
    </div>
  );
};

export default App;