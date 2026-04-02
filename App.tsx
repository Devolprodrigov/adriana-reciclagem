import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Package, Scale, User, Briefcase, DollarSign, FileText, Truck, Sparkles, LogOut, CheckCircle2 } from 'lucide-react';
import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, FirebaseUser, collection, onSnapshot, query, orderBy } from './firebase';
import DashboardView from './components/DashboardView';
import ProdutosView from './components/ProdutosView';
import EstoqueView from './components/EstoqueView';
import ClientesPFView from './components/ClientesPFView';
import ClientesPJView from './components/ClientesPJView';
import FinanceiroView from './components/FinanceiroView';
import OrdersView from './components/OrdersView';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState<string | null>(null);
  const [financials, setFinancials] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubF = onSnapshot(query(collection(db, 'financials'), orderBy('date', 'desc')), (s) => {
      setFinancials(s.docs.map(d => ({...d.data(), id: d.id})) as any);
    });
    const unsubP = onSnapshot(collection(db, 'products'), (s) => {
      setProducts(s.docs.map(d => ({...d.data(), id: d.id})) as any);
    });
    return () => { unsubF(); unsubP(); };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert("E-mail ou senha incorretos.");
    }
  };

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 p-6">
        <form onSubmit={handleLogin} className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-6">A</div>
          <h2 className="text-2xl font-black text-center mb-8 uppercase tracking-tighter">Adriana ERP</h2>
          <div className="space-y-4 mb-6">
            <input type="email" placeholder="E-mail" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-sm" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Senha" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-sm" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col">
        <h1 className="font-black text-xl mb-10 text-indigo-600">ADRIANA ERP</h1>
        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-sm ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><LayoutDashboard size={18}/> Dashboard</button>
          <button onClick={() => setActiveTab('financeiro')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-sm ${activeTab === 'financeiro' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><DollarSign size={18}/> Financeiro</button>
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-2 text-slate-400 font-bold text-sm p-4 hover:text-rose-600"><LogOut size={18}/> Sair</button>
      </aside>
      <main className="flex-1 overflow-y-auto p-10">
        {activeTab === 'dashboard' ? <DashboardView financials={financials} products={products} /> : <FinanceiroView financials={financials} notify={m => alert(m)} />}
      </main>
    </div>
  );
};

export default App;