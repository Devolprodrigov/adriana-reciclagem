import React, { useState, useEffect } from 'react';
import { Plus, Building2, Edit3, Trash2, Search, MapPin } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { CustomerPJ } from '../types';

interface Props {
  customers: CustomerPJ[];
  notify: (m: string) => void;
}

const ClientesPJView: React.FC<Props> = ({ customers, notify }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CustomerPJ | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Estados controlados para o formulário completo
  const [formData, setFormData] = useState({
    companyName: '',
    tradeName: '',
    cnpj: '',
    phone: '',
    contact: '',
    zipCode: '',
    address: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    pixKey: ''
  });

  // Função para abrir o modal limpando ou carregando dados
  const handleOpenModal = (customer: CustomerPJ | null) => {
    if (customer) {
      setEditing(customer);
      setFormData({
        companyName: customer.companyName || '',
        tradeName: customer.tradeName || '',
        cnpj: customer.cnpj || '',
        phone: customer.phone || '',
        contact: customer.contact || '',
        zipCode: customer.zipCode || '',
        address: customer.address || '',
        number: customer.number || '',
        neighborhood: customer.neighborhood || '',
        city: customer.city || '',
        state: customer.state || '',
        pixKey: customer.pixKey || ''
      });
    } else {
      setEditing(null);
      setFormData({
        companyName: '', tradeName: '', cnpj: '', phone: '', contact: '',
        zipCode: '', address: '', number: '', neighborhood: '', city: '', state: '', pixKey: ''
      });
    }
    setShowModal(true);
  };

  const handleCepBlur = async () => {
    const cep = formData.zipCode.replace(/\D/g, '');
    if (cep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          }));
          notify("Endereço localizado!");
        } else {
          notify("CEP não encontrado.");
        }
      } catch (error) {
        notify("Erro ao buscar CEP.");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Preparação dos dados com higienização
    const companyData = {
      ...formData,
      companyName: formData.companyName.toUpperCase(),
      contact: formData.contact.toUpperCase(),
      updatedAt: serverTimestamp(),
      status: 'Ativo'
    };

    try {
      if (editing) {
        await updateDoc(doc(db, 'customersPJ', editing.id), companyData);
        notify("Empresa atualizada!");
      } else {
        await addDoc(collection(db, 'customersPJ'), {
          ...companyData,
          createdAt: serverTimestamp()
        });
        notify("Empresa cadastrada com sucesso!");
      }
      setShowModal(false);
    } catch (error) {
      console.error("Erro ao salvar PJ:", error);
      notify("Erro ao gravar no banco de dados.");
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cnpj.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Empresas & Parceiros (PJ)</h3>
          <p className="text-xs font-bold text-slate-400">Gerenciamento de clientes industriais</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Buscar CNPJ ou Nome..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-xs outline-none focus:ring-2 ring-indigo-500 transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => handleOpenModal(null)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all shrink-0">
            <Plus size={20}/> Nova Empresa
          </button>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Razão Social / CNPJ</th>
                <th className="px-8 py-5">Localização</th>
                <th className="px-8 py-5">Contato / Responsável</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCustomers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-800 text-sm uppercase">{c.companyName}</p>
                    <p className="text-[10px] font-mono font-bold text-slate-400 tracking-tighter">CNPJ: {c.cnpj}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-300" />
                      <div>
                        <p className="text-xs font-bold text-slate-600">{c.city} - {c.state}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{c.neighborhood}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-bold text-slate-800">{c.phone}</p>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Resp: {c.contact}</p>
                  </td>
                  <td className="px-8 py-5 text-right space-x-1">
                    <button onClick={() => handleOpenModal(c)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit3 size={18}/></button>
                    <button onClick={() => setDeleteConfirm(c.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PJ */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <Building2 className="text-indigo-600" /> 
                {editing ? 'Editar Empresa' : 'Nova Empresa'}
              </h2>
              <button onClick={() => setShowModal(false)} className="bg-slate-50 p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"><Plus className="rotate-45" size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1.5 block">Razão Social</label>
                  <input 
                    value={formData.companyName} 
                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                    required 
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold focus:ring-2 ring-indigo-500 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1.5 block">CNPJ</label>
                  <input 
                    value={formData.cnpj} 
                    onChange={e => setFormData({...formData, cnpj: e.target.value})}
                    required 
                    placeholder="00.000.000/0000-00" 
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold focus:ring-2 ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1.5 block">Responsável (Contato)</label>
                  <input 
                    value={formData.contact} 
                    onChange={e => setFormData({...formData, contact: e.target.value})}
                    required 
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold focus:ring-2 ring-indigo-500 outline-none" 
                  />
                </div>
                
                {/* Endereço */}
                <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1.5 block flex justify-between">
                      CEP {loadingCep && <span className="animate-spin h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full"></span>}
                    </label>
                    <input 
                      value={formData.zipCode} 
                      onChange={e => setFormData({...formData, zipCode: e.target.value})}
                      onBlur={handleCepBlur}
                      placeholder="00000-000" 
                      className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold focus:ring-2 ring-indigo-500 outline-none" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1.5 block">Endereço</label>
                    <input 
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold focus:ring-2 ring-indigo-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1.5 block">Nº</label>
                    <input 
                      value={formData.number} 
                      onChange={e => setFormData({...formData, number: e.target.value})}
                      className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold focus:ring-2 ring-indigo-500 outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1.5 block">Bairro</label>
                  <input 
                    value={formData.neighborhood} 
                    onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold focus:ring-2 ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1.5 block">Cidade</label>
                  <input 
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold focus:ring-2 ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1.5 block">Telefone</label>
                  <input 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="(41) 00000-0000"
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold focus:ring-2 ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1.5 block">Chave PIX</label>
                  <input 
                    value={formData.pixKey} 
                    onChange={e => setFormData({...formData, pixKey: e.target.value})}
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold focus:ring-2 ring-indigo-500 outline-none" 
                  />
                </div>
              </div>
              
              <div className="flex gap-4 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                <button type="submit" className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
                  {editing ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 uppercase">Excluir Empresa?</h3>
            <p className="text-sm font-bold text-slate-400 mb-8">Isso removerá os dados permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Não</button>
              <button onClick={() => { 
                deleteDoc(doc(db, 'customersPJ', deleteConfirm)); 
                setDeleteConfirm(null);
                notify("Empresa removida.");
              }} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-rose-200">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesPJView;