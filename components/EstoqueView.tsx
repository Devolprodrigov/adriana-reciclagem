
import React, { useState } from 'react';
import { Search, Scale, AlertCircle, ArrowUp, ArrowDown, Plus, Box } from 'lucide-react';
import { Product } from '../types';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../src/lib/db';

interface Props {
  products: Product[];
  notify: (m: string) => void;
}

const EstoqueView: React.FC<Props> = ({ products, notify }) => {
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleUpdateStock = async (id: string, val: number) => {
    try {
      const productRef = doc(db, 'products', id);
      await updateDoc(productRef, { stock: val });
      notify("Estoque atualizado com sucesso.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  };

  const handleSaveNewItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      code: fd.get('code') as string,
      name: fd.get('name') as string,
      category: fd.get('category') as string,
      costPrice: Number(fd.get('costPrice')),
      sellPrice: Number(fd.get('sellPrice')),
      stock: Number(fd.get('stock')),
      minStock: Number(fd.get('minStock')),
      unit: 'KG'
    };

    try {
      await addDoc(collection(db, 'products'), data);
      notify("Novo material adicionado ao estoque!");
      setShowModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Monitor de Estoque</h3>
          <p className="text-xs font-bold text-slate-400">Controle físico e pesagem de materiais</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              onChange={e => setQ(e.target.value)} 
              placeholder="Filtrar por nome ou código..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none" 
            />
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 shrink-0"
          >
            <Plus size={18}/> Novo Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase())).map(p => (
          <div key={p.id} className={`bg-white p-8 rounded-[2.5rem] border ${p.stock <= p.minStock ? 'border-rose-100 bg-rose-50/10' : 'border-slate-100'} shadow-sm flex flex-col items-center group relative overflow-hidden`}>
            {p.stock <= p.minStock && (
              <div className="absolute top-4 right-4 text-rose-500 animate-pulse">
                <AlertCircle size={20} />
              </div>
            )}
            
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${p.stock <= p.minStock ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
              <Scale size={36} />
            </div>
            
            <div className="text-center mb-6">
              <h4 className="font-black text-slate-800 text-lg leading-tight">{p.name}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p.code}</p>
            </div>

            <div className="flex flex-col items-center mb-8">
              <p className={`text-4xl font-black ${p.stock <= p.minStock ? 'text-rose-600' : 'text-slate-800'}`}>
                {p.stock}
                <span className="text-sm font-black text-slate-400 ml-1 uppercase">{p.unit}</span>
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${p.stock <= p.minStock ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                  Mín: {p.minStock} {p.unit}
                </span>
              </div>
            </div>

            <div className="w-full space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Lançamento Pesagem</label>
               <div className="flex gap-2">
                 <input 
                  type="number" 
                  placeholder="KG"
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (e.target.value !== "") handleUpdateStock(p.id, val);
                    e.target.value = "";
                  }}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-center font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                 />
                 <button className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-50">
                   <ArrowUp size={16}/>
                 </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
              <Plus className="text-indigo-600"/>
              Novo Material no Estoque
            </h2>
            <form onSubmit={handleSaveNewItem} className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nome do Material</label>
                 <div className="relative">
                   <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                   <input name="name" required className="w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                 </div>
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Código / SKU</label>
                 <input name="code" required className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Categoria</label>
                 <select name="category" className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="Metais">Metais</option>
                    <option value="Plásticos">Plásticos</option>
                    <option value="Papelão">Papelão</option>
                    <option value="Outros">Outros</option>
                 </select>
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Preço de Custo</label>
                 <input name="costPrice" type="number" step="0.01" required className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Preço de Venda</label>
                 <input name="sellPrice" type="number" step="0.01" required className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Estoque Inicial</label>
                 <input name="stock" type="number" defaultValue={0} required className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Estoque Mínimo</label>
                 <input name="minStock" type="number" defaultValue={10} required className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              
              <div className="col-span-2 flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700">Salvar Material</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstoqueView;
