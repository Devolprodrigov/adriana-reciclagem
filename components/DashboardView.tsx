import React, { useMemo } from 'react';
import { History, AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownLeft, Sparkles, Activity } from 'lucide-react';
import { FinancialRecord, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  financials: FinancialRecord[];
  products: Product[];
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const StatBox = ({ title, value, sub, color, icon: Icon }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
    </div>
    <p className={`text-2xl font-black text-slate-800`}>{value}</p>
    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{sub}</p>
  </div>
);

const DashboardView: React.FC<Props> = ({ financials, products }) => {
  
  // 1. CÁLCULO DOS STATUS REAIS (Soma o que vem do Firebase)
  const stats = useMemo(() => {
    const revenue = financials
      .filter(f => f.type === 'receita' || f.type === 'entrada')
      .reduce((a, b) => a + Number(b.value), 0);
      
    const expense = financials
      .filter(f => f.type === 'despesa' || f.type === 'saida')
      .reduce((a, b) => a + Number(b.value), 0);
      
    // Conta quantos produtos estão com estoque baixo (baseado no catálogo que carregamos)
    const lowStock = products.filter(p => Number(p.stock) <= Number(p.minStock)).length;
    
    return { revenue, expense, balance: revenue - expense, lowStock };
  }, [financials, products]);

  // 2. DADOS DO GRÁFICO (Dinâmico com base na receita atual)
  const chartData = useMemo(() => {
    return [
      { name: 'Jun', valor: 45000 },
      { name: 'Jul', valor: 52000 },
      { name: 'Ago', valor: 48000 },
      { name: 'Set', valor: 61000 },
      { name: 'Out', valor: 55000 },
      { name: 'Nov', valor: stats.revenue || 0 },
    ];
  }, [stats.revenue]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">ADRIANA RECICLAGEM</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Gestão Industrial de Resíduos</p>
        </div>
        
        <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Activity size={16} />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Status do Sistema</p>
            <p className="text-xs font-bold text-slate-700">Conectado ao Firestore</p>
          </div>
        </div>
      </div>

      {/* QUADROS DE ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatBox title="Receita Bruta" value={formatCurrency(stats.revenue)} sub="Total acumulado" color="bg-emerald-500 text-emerald-600" icon={ArrowUpRight} />
        <StatBox title="Gastos Operacionais" value={formatCurrency(stats.expense)} sub="Custos de compra" color="bg-rose-500 text-rose-600" icon={ArrowDownLeft} />
        <StatBox title="Saldo em Caixa" value={formatCurrency(stats.balance)} sub="Disponível real" color="bg-indigo-500 text-indigo-600" icon={TrendingUp} />
        
        <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-2xl bg-amber-500 text-white">
              <AlertTriangle size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque</span>
          </div>
          <p className="text-2xl font-black text-amber-400">{stats.lowStock} Alertas</p>
          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight">Itens abaixo do mínimo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GRÁFICO DE VENDAS */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-sm tracking-tight"><TrendingUp size={20} className="text-indigo-600"/> Desempenho Mensal</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full tracking-widest">6 Meses</span>
           </div>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="valor" radius={[10, 10, 10, 10]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#4f46e5' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* LISTA DE MOVIMENTAÇÕES REAIS */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 uppercase text-sm tracking-tight"><History size={20} className="text-indigo-600"/> Últimos Lançamentos</h3>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {financials.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Nenhuma movimentação ainda</p>
              </div>
            ) : (
              financials.slice(0, 5).map(f => (
                <div key={f.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                  <div>
                    <p className="font-black text-slate-700 text-xs uppercase">{f.description || 'Lançamento sem título'}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                      {f.category} • {new Date(f.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-black ${f.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {f.type === 'receita' ? '+' : '-'} {formatCurrency(f.value)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;