
import React, { useState } from 'react';
import { Plus, Search, Edit3, Trash2, Tag, Box, DollarSign } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import { handleFirestoreError, OperationType } from '../src/lib/db';

interface Props {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  notify: (m: string) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const ProdutosView: React.FC<Props> = ({ products, notify }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
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
      if (editingProduct) {
        const productRef = doc(db, 'products', editingProduct.id);
        await updateDoc(productRef, data);
        notify("Material atualizado com sucesso!");
      } else {
        await addDoc(collection(db, 'products'), data);
        notify("Novo material adicionado!");
      }
      setShowModal(false);
      setEditingProduct(null);
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
      notify("Erro ao salvar produto.");
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      notify("Material removido.");
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      notify("Erro ao remover produto.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Catálogo de Materiais</h3>
          <p className="text-xs font-bold text-slate-400">Gerencie seu portfólio de produtos e preços</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Pesquisar material..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none" 
            />
          </div>
          <button 
            onClick={() => { setEditingProduct(null); setShowModal(true); }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 shrink-0"
          >
            <Plus size={18}/> Novo Item
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-8 py-5">Material / Código</th>
              <th className="px-8 py-5">Categoria</th>
              <th className="px-8 py-5 text-right">Preço Custo</th>
              <th className="px-8 py-5 text-right">Preço Venda</th>
              <th className="px-8 py-5 text-center">Estoque Atual</th>
              <th className="px-8 py-5 text-center">Esq. Mínimo</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-8 py-5">
                  <p className="font-black text-slate-800">{p.name}</p>
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">{p.code}</p>
                </td>
                <td className="px-8 py-5">
                  <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">{p.category}</span>
                </td>
                <td className="px-8 py-5 text-right font-bold text-slate-500">{formatCurrency(p.costPrice)}</td>
                <td className="px-8 py-5 text-right font-black text-emerald-600">{formatCurrency(p.sellPrice)}</td>
                <td className="px-8 py-5 text-center">
                  <span className={`font-black ${p.stock <= p.minStock ? 'text-rose-600' : 'text-slate-800'}`}>{p.stock} {p.unit}</span>
                </td>
                <td className="px-8 py-5 text-center font-bold text-slate-400">{p.minStock} {p.unit}</td>
                <td className="px-8 py-5 text-right space-x-1">
                  <button onClick={() => { setEditingProduct(p); setShowModal(true); }} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Edit3 size={18}/></button>
                  <button onClick={() => setDeleteConfirm(p.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
              {editingProduct ? <Edit3 className="text-indigo-600"/> : <Plus className="text-indigo-600"/>}
              {editingProduct ? 'Editar Material' : 'Novo Material'}
            </h2>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nome do Material</label>
                 <div className="relative">
                   <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                   <input name="name" defaultValue={editingProduct?.name} required className="w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                 </div>
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Código / SKU</label>
                 <input name="code" defaultValue={editingProduct?.code} required className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Categoria</label>
                 <select name="category" defaultValue={editingProduct?.category} className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="Metais">Metais</option>
                    <option value="Plásticos">Plásticos</option>
                    <option value="Papelão">Papelão</option>
                    <option value="Outros">Outros</option>
                 </select>
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Preço de Custo</label>
                 <input name="costPrice" type="number" step="0.01" defaultValue={editingProduct?.costPrice} required className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Preço de Venda</label>
                 <input name="sellPrice" type="number" step="0.01" defaultValue={editingProduct?.sellPrice} required className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Estoque Inicial</label>
                 <input name="stock" type="number" defaultValue={editingProduct?.stock || 0} required className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Estoque Mínimo</label>
                 <input name="minStock" type="number" defaultValue={editingProduct?.minStock || 10} required className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              
              <div className="col-span-2 flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700">Salvar Material</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Confirmar Exclusão</h3>
            <p className="text-sm font-bold text-slate-400 mb-8">Tem certeza que deseja remover este material? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
              <button onClick={() => deleteProduct(deleteConfirm)} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-700">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProdutosView;
