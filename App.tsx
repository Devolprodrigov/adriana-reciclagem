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

  // 🔐 MONITORAR AUTENTICAÇÃO
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 🔥 LOGIN AUTOMÁTICO (SE NÃO ESTIVER LOGADO)
  useEffect(() => {
    if (!user && isAuthReady) {
      signInWithEmailAndPassword(
        auth,
        "SEUEMAIL@gmail.com", // ⚠️ TROCAR
        "SUA_SENHA"           // ⚠️ TROCAR
      ).catch(() => {
        console.log("Login automático não executado");
      });
    }
  }, [user, isAuthReady]);

  // 📡 FIRESTORE (SÓ DEPOIS DO LOGIN)
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

    const unsubFinancials = onSnapshot(
      query(collection(db, 'financials'), orderBy('date', 'desc')),
      (s) => {
        setFinancials(s.docs.map(d => ({ ...d.data(), id: d.id })) as any);
      }
    );

    return () => {
      unsubProducts();
      unsubPF();
      unsubPJ();
      unsubFinancials();
    };
  }, [user]);

  // 🔐 LOGIN MANUAL
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      alert("E-mail ou senha inválidos.");
    }
  };

  // 🔔 NOTIFICAÇÃO
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // ⏳ LOADING
  if (!isAuthReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-12 w-12 border-b-2 border-indigo-600 rounded-full"></div>
      </div>
    );
  }

  // 🔐 TELA DE LOGIN
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 p-6">
        <form onSubmit={handleLogin} className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl">
          <h2 className="text-2xl font-black text-center mb-8 uppercase">Adriana ERP</h2>

          <input
            type="email"
            placeholder="E-mail"
            className="w-full p-4 mb-4 bg-slate-100 rounded-2xl"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Senha"
            className="w-full p-4 mb-6 bg-slate-100 rounded-2xl"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  // MENU
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
    { id: 'ai-insights', label: 'IA', icon: <Sparkles size={18}/> },
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
      default: return null;
    }
  };

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-white border-r p-4 space-y-2">
        {menuItems.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)}
            className="w-full flex gap-2 p-3 hover:bg-slate-100 rounded-xl">
            {item.icon} {item.label}
          </button>
        ))}
        <button onClick={() => signOut(auth)} className="mt-6 text-red-500">
          Sair
        </button>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        {notification && <div className="mb-4">{notification}</div>}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;