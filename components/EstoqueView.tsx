import React, { useState } from 'react';
import { Search, Scale, AlertCircle, ArrowUp, Plus, Box } from 'lucide-react';
import { Product } from '../types';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';

interface Props {
  products: Product[];
  notify: (m: string) => void;
}

const EstoqueView: React.FC<Props> = ({ products, notify }) => {
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [weights, setWeights] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  // --- ATUALIZAR PESO RÁPIDO ---
  const handleAddStock = async (productId: string) => {
    const weightValue = weights[productId];
    if (!weightValue || isNaN(Number(weightValue)) || Number(weightValue) <= 0) {
      notify("Insira um peso válido!");
      return;
    }

    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        stock: increment(Number(weightValue)),
        updatedAt: new Date().toISOString()
      });
      notify(`+${weightValue}kg adicionados!`);
      setWeights(prev => ({ ...prev, [productId]: '' }));
    } catch (error: any) {
      console.error("Erro ao salvar peso:", error);
      notify("Erro: " + (error.message || "Falha na conexão"));
    }
  };

  // --- SALVAR NOVO MATERIAL (BLINDADO) ---
  const handleSaveNewItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true); // Faz o botão travar em "PROCESSANDO..."
    
    try {
      const fd = new FormData(e.currentTarget);
      
      const data = {
        code: (fd.get('code') as string || '').toUpperCase(),
        name: (fd.get('name') as string || '').toUpperCase(),
        category: fd.get('category') as string,
        costPrice: Number(fd.get('costPrice')) || 0,
        sellPrice: Number(fd.get('sellPrice')) || 0,
        stock: Number(fd.get('stock')) || 0,
        minStock: Number(fd.get('minStock')) || 0,
        unit: 'KG',
        createdAt: new Date().toISOString()
      };

      // Tenta gravar no Firestore
      await addDoc(collection(db, 'products'), data);
      
      notify("Material adicionado com sucesso!");
      setShowModal(false); // Fecha o modal após o sucesso
    } catch (error: any) {
      console.error("ERRO NO FIREBASE:", error);
      // Se der erro de "Permission Denied" ou "Token", ele vai te avisar aqui
      alert("ERRO AO GRAVAR: " + (error.message || "Verifique sua internet ou permissões"));
    } finally {
      // ISSO AQUI OBRIGA O BOTÃO A DESTRAVAR SEMPRE
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Monitor de Estoque</h3>
          <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Adriana Reciclagem</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input onChange={e => setQ(e.target.value)} placeholder="Pesquisar material..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500 transition-all" />
          </div>
          <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
            <Plus size={18}/> Novo Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase())).map(p => (
          <div key={p.id} className={`bg-white p-8 rounded-[2.5rem] border ${p.stock <= p.minStock ? 'border-rose-100 bg-rose-50/20' : 'border-slate-100'} shadow-sm flex flex-col items-center transition-all hover:shadow-md`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${p.stock <= p.minStock ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-indigo-600'}`}>
              <Scale size={28} />
            </div>
            <h4 className="font-black text-slate-800 uppercase text-center text-sm">{p.name}</h4>
            <p className="text-[10px] font-bold text-slate-400 mb-6">{p.code}</p>
            <p className={`text-4xl font-black mb-6 ${p.stock <= p.minStock ? 'text-rose-600' : 'text-slate-800'}`}>
              {p.stock}
              <span className="text-xs ml-1 opacity-40 uppercase">{p.unit}</span>
            </p>
            
            <div className="w-full flex gap-2">
              <input type="number" placeholder="KG" value={weights[p.id] || ''} onChange={(e) => setWeights({ ...weights, [p.id]: e.target.value })}
                className="flex-1 bg-slate-50 rounded-xl py-3 text-center font-black outline-none border border-slate-100 focus:ring-2 ring-indigo-500" />
              <button onClick={() => handleAddStock(p.id)} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-50">
                <ArrowUp size={16}/>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter text-slate-800">Novo Material</h2>
            <form onSubmit={handleSaveNewItem} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <input name="name" placeholder="NOME DO MATERIAL" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold uppercase outline-none focus:ring-2 ring-indigo-500" />
              </div>
              <input name="code" placeholder="CÓDIGO/SKU" required className="p-4 bg-slate-50 rounded-2xl font-bold uppercase outline-none focus:ring-2 ring-indigo-500" />
              <select name="category" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none">
                <option value="Metais">Metais</option>
                <option value="Plásticos">Plásticos</option>
                <option value="Papelão">Papelão</option>
                <option value="Outros">Outros</option>
              </select>
              <input name="costPrice" type="number" step="0.01" placeholder="CUSTO R$" required className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
              <input name="sellPrice" type="number" step="0.01" placeholder="VENDA R$" required className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
              <input name="stock" type="number" placeholder="ESTOQUE INICIAL" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
              <input name="minStock" type="number" placeholder="ESTOQUE MÍNIMO" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
              
              <button type="submit" disabled={isSaving} className="col-span-2 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs mt-4 shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                {isSaving ? 'PROCESSANDO...' : 'CONFIRMAR CADASTRO'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="col-span-2 text-slate-300 font-bold text-[10px] uppercase hover:text-slate-500 transition-colors">Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstoqueView;