
import React, { useState } from 'react';
import { Plus, Building2, Edit3, Trash2, CreditCard } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { CustomerPJ } from '../types';
import { handleFirestoreError, OperationType } from '../src/lib/db';

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

  // Estados para campos de endereço (para preenchimento automático)
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  const handleOpenModal = (customer: CustomerPJ | null) => {
    setEditing(customer);
    if (customer) {
      setAddress(customer.address || '');
      setNeighborhood(customer.neighborhood || '');
      setCity(customer.city || '');
      setState(customer.state || '');
      setZipCode(customer.zipCode || '');
    } else {
      setAddress('');
      setNeighborhood('');
      setCity('');
      setState('');
      setZipCode('');
    }
    setShowModal(true);
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setAddress(data.logradouro);
          setNeighborhood(data.bairro);
          setCity(data.localidade);
          setState(data.uf);
          notify("Endereço preenchido via CEP!");
          // Focar no campo número após preencher
          setTimeout(() => {
            const numInput = document.querySelector('input[name="number"]') as HTMLInputElement;
            if (numInput) numInput.focus();
          }, 100);
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

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      companyName: fd.get('companyName') as string,
      cnpj: fd.get('cnpj') as string,
      tradeName: fd.get('tradeName') as string,
      stateRegistration: fd.get('stateRegistration') as string,
      municipalRegistration: fd.get('municipalRegistration') as string,
      foundationDate: fd.get('foundationDate') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      contact: fd.get('contact') as string,
      zipCode: zipCode,
      address: address,
      number: fd.get('number') as string,
      complement: fd.get('complement') as string,
      neighborhood: neighborhood,
      city: city,
      state: state,
      pixKey: fd.get('pixKey') as string,
      status: fd.get('status') as string || 'Ativo',
      createdAt: editing ? editing.createdAt : new Date().toLocaleDateString('pt-BR'),
      responsible: 'Admin'
    };

    try {
      if (editing) {
        await updateDoc(doc(db, 'customersPJ', editing.id), data);
        notify("Empresa atualizada.");
      } else {
        await addDoc(collection(db, 'customersPJ'), data);
        notify("Empresa cadastrada!");
      }
      setShowModal(false);
      setEditing(null);
    } catch (error) {
      handleFirestoreError(error, editing ? OperationType.UPDATE : OperationType.CREATE, 'customersPJ');
      notify("Erro ao salvar empresa.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'customersPJ', id));
      notify("Empresa excluída com sucesso.");
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customersPJ/${id}`);
      notify("Erro ao excluir empresa.");
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cnpj.includes(searchTerm) ||
    c.tradeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Clientes Pessoa Jurídica</h3>
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="Buscar por Razão, Fantasia ou CNPJ..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <button onClick={() => handleOpenModal(null)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg whitespace-nowrap">
            <Plus size={20}/> Nova Empresa
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1200px]">
          <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-8 py-5">Razão Social / Fantasia</th>
              <th className="px-8 py-5">CNPJ / Localização</th>
              <th className="px-8 py-5">Contato / Responsável</th>
              <th className="px-8 py-5">PIX / Status</th>
              <th className="px-8 py-5">Cadastro</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredCustomers.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5">
                  <p className="font-black text-slate-800">{c.companyName}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{c.tradeName}</p>
                </td>
                <td className="px-8 py-5">
                  <p className="text-xs font-bold text-slate-600">{c.cnpj}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{c.city}, {c.state}</p>
                </td>
                <td className="px-8 py-5">
                  <p className="text-xs font-bold text-slate-800">{c.email}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{c.phone}</p>
                  <p className="text-[10px] font-black text-indigo-600 mt-1 uppercase tracking-widest">Resp: {c.contact}</p>
                </td>
                <td className="px-8 py-5">
                  <p className="text-[10px] font-black text-indigo-500 uppercase">{c.pixKey || 'Não informado'}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${c.status === 'Ativo' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {c.status || 'Ativo'}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{c.createdAt}</p>
                </td>
                <td className="px-8 py-5 text-right space-x-1">
                  <button onClick={() => handleOpenModal(c)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Editar"><Edit3 size={18}/></button>
                  <button onClick={() => setDeleteConfirm(c.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Excluir"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Building2 className="text-indigo-600" /> Cadastro PJ</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold hover:text-slate-600 transition-colors">FECHAR</button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-8">
              {/* Seção: Dados da Empresa */}
              <div>
                <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-6 h-1 bg-indigo-600 rounded-full"></div> Identificação da Empresa
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Razão Social</label>
                    <input name="companyName" defaultValue={editing?.companyName} required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Nome Fantasia</label>
                    <input name="tradeName" defaultValue={editing?.tradeName} required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">CNPJ</label>
                    <input name="cnpj" defaultValue={editing?.cnpj} required placeholder="00.000.000/0000-00" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Inscrição Estadual</label>
                    <input name="stateRegistration" defaultValue={editing?.stateRegistration} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Inscrição Municipal</label>
                    <input name="municipalRegistration" defaultValue={editing?.municipalRegistration} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Data de Fundação</label>
                    <input name="foundationDate" type="date" defaultValue={editing?.foundationDate} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Status do Cadastro</label>
                    <select name="status" defaultValue={editing?.status || 'Ativo'} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-indigo-500 transition-all">
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                      <option value="Bloqueado">Bloqueado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção: Contato */}
              <div>
                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-6 h-1 bg-emerald-600 rounded-full"></div> Contato & Financeiro
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Nome do Responsável</label>
                    <input name="contact" defaultValue={editing?.contact} required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-emerald-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Telefone</label>
                    <input name="phone" defaultValue={editing?.phone} required placeholder="(00) 0000-0000" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-emerald-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">E-mail Corporativo</label>
                    <input name="email" type="email" defaultValue={editing?.email} required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-emerald-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Chave PIX (Empresa)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input name="pixKey" defaultValue={editing?.pixKey} placeholder="CNPJ ou E-mail Financeiro" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-emerald-500 transition-all" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Endereço */}
              <div>
                <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-6 h-1 bg-amber-600 rounded-full"></div> Endereço Sede
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2 flex justify-between">
                      CEP {loadingCep && <span className="animate-pulse text-indigo-600">Buscando...</span>}
                    </label>
                    <input 
                      name="zipCode" 
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      onBlur={handleCepBlur}
                      required 
                      placeholder="00000-000" 
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-amber-500 transition-all" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Logradouro</label>
                    <input 
                      name="address" 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required 
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-amber-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Número</label>
                    <input name="number" defaultValue={editing?.number} required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-amber-500 transition-all" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Complemento</label>
                    <input name="complement" defaultValue={editing?.complement} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-amber-500 transition-all" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Bairro</label>
                    <input 
                      name="neighborhood" 
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      required 
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-amber-500 transition-all" 
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Cidade</label>
                    <input 
                      name="city" 
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required 
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-amber-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Estado (UF)</label>
                    <input 
                      name="state" 
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required 
                      maxLength={2} 
                      placeholder="SP" 
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-amber-500 transition-all uppercase" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all hover:bg-slate-200">Cancelar</button>
                <button type="submit" className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300">Salvar Empresa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Confirmar Exclusão</h3>
            <p className="text-sm font-bold text-slate-400 mb-8">Tem certeza que deseja remover esta empresa? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-700">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesPJView;
