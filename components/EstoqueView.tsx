import React, { useState } from 'react';
import { Search, Scale, AlertCircle, ArrowUp, Plus, Box } from 'lucide-react';
import { Product } from '../types';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

interface Props {
  products: Product[];
  notify: (m: string) => void;
}

const EstoqueView: React.FC<Props> = ({ products, notify }) => {
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [weights, setWeights] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

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
        updatedAt: serverTimestamp()
      });
      notify(`+${weightValue}kg adicionados!`);
      setWeights(prev => ({ ...prev, [productId]: '' }));
    } catch (error) {
      console.error("Erro ao salvar peso:", error);
      notify("Erro ao atualizar estoque.");
    }
  };

  const handleSaveNewItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    
    const data = {
      code: (fd.get('code') as string).toUpperCase(),
      name: (fd.get('name') as string).toUpperCase(),
      category: fd.get('category') as string,
      costPrice: Number(fd.get('costPrice')),
      sellPrice: Number(fd.get('sellPrice')),
      stock: Number(fd.get('stock')),
      minStock: Number(fd.get('minStock')),
      unit: 'KG',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'products'), data);
      notify("Material adicionado ao estoque!");
      setShowModal(false);
    } catch (error) {
      console.error("Erro ao criar item:", error);
      notify("Erro ao criar material.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Monitor de Estoque</h3>
          <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Adriana Reciclagem</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input onChange={e => setQ(e.target.value)} placeholder="Pesquisar..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none" />
          </div>
          <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700">
            <Plus size={18}/> Novo Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase())).map(p => (
          <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4"><Scale size={28} /></div>
            <h4 className="font-black text-slate-800 uppercase text-center text-sm">{p.name}</h4>
            <p className="text-[10px] font-bold text-slate-400 mb-6">{p.code}</p>
            <p className="text-4xl font-black text-slate-800 mb-6">{p.stock}<span className="text-xs ml-1 opacity-40 uppercase">{p.unit}</span></p>
            
            <div className="w-full flex gap-2">
              <input type="number" placeholder="KG" value={weights[p.id] || ''} onChange={(e) => setWeights({ ...weights, [p.id]: e.target.value })}
                className="flex-1 bg-slate-50 rounded-xl py-3 text-center font-black outline-none border border-slate-100" />
              <button onClick={() => handleAddStock(p.id)} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100"><ArrowUp size={16}/></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl">
            <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter">Novo Material</h2>
            <form onSubmit={handleSaveNewItem} className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><input name="name" placeholder="NOME DO MATERIAL" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold uppercase outline-none" /></div>
              <input name="code" placeholder="CÓDIGO/SKU" required className="p-4 bg-slate-50 rounded-2xl font-bold uppercase outline-none" />
              <select name="category" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none"><option value="Metais">Metais</option><option value="Plásticos">Plásticos</option><option value="Papelão">Papelão</option></select>
              <input name="costPrice" type="number" step="0.01" placeholder="CUSTO R$" required className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
              <input name="sellPrice" type="number" step="0.01" placeholder="VENDA R$" required className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
              <input name="stock" type="number" placeholder="ESTOQUE INICIAL" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
              <input name="minStock" type="number" placeholder="ESTOQUE MÍNIMO" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
              <button type="submit" disabled={isSaving} className="col-span-2 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs mt-4">
                {isSaving ? 'Salvando...' : 'Confirmar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstoqueView;