import React, { useState } from 'react';
import { Plus, User, Edit3, Trash2, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { CustomerPF } from '../types';

interface Props {
  customers: CustomerPF[];
  notify: (m: string) => void;
}

const ClientesPFView: React.FC<Props> = ({ customers, notify }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CustomerPF | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Estados controlados para preenchimento automático
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const handleOpenModal = (customer: CustomerPF | null) => {
    setEditing(customer);
    if (customer) {
      setZipCode(customer.zipCode || '');
      setAddress(customer.address || '');
      setNeighborhood(customer.neighborhood || '');
      setCity(customer.city || '');
      setState(customer.state || '');
    } else {
      setZipCode('');
      setAddress('');
      setNeighborhood('');
      setCity('');
      setState('');
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

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const customerData = {
      name: (fd.get('name') as string).toUpperCase(),
      cpf: fd.get('cpf') as string,
      rg: fd.get('rg') as string,
      birthDate: fd.get('birthDate') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      zipCode: zipCode,
      address: address,
      number: fd.get('number') as string,
      neighborhood: neighborhood,
      city: city,
      state: state,
      pixKey: fd.get('pixKey') as string,
      status: fd.get('status') as string || 'Ativo',
      updatedAt: new Date().toISOString(),
      createdAt: editing ? editing.createdAt : new Date().toISOString()
    };

    try {
      if (editing) {
        await updateDoc(doc(db, 'customersPF', editing.id), customerData);
        notify("Cadastro atualizado com sucesso!");
      } else {
        await addDoc(collection(db, 'customersPF'), customerData);
        notify("Cliente cadastrado com sucesso!");
      }
      
      // SÓ FECHA A TELA SE CHEGAR AQUI (SEM ERRO NO BANCO)
      setShowModal(false);
      setEditing(null);
    } catch (error) {
      console.error("Erro Firebase:", error);
      notify("Erro ao salvar no banco de dados. Verifique sua conexão.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'customersPF', id));
      notify("Cliente removido.");
      setDeleteConfirm(null);
    } catch (error) {
      notify("Erro ao excluir cliente.");
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Clientes (Pessoa Física)</h3>
        <div className="flex w-full md:w-auto gap-2">
          <input 
            placeholder="Buscar por nome ou CPF..." 
            className="flex-1 md:w-64 bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-xs outline-none focus:ring-2 ring-indigo-100"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={() => handleOpenModal(null)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-all">
            <Plus size={20}/> Novo Cliente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Nome / CPF</th>
                <th className="px-8 py-5">Localização</th>
                <th className="px-8 py-5">Contato</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCustomers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-800 text-sm">{c.name}</p>
                    <p className="text-[10px] font-bold text-slate-400">{c.cpf}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-bold text-slate-600">{c.city} - {c.state}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{c.neighborhood}</p>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-slate-600">
                    {c.phone}
                  </td>
                  <td className="px-8 py-5 text-right space-x-1">
                    <button onClick={() => handleOpenModal(c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit3 size={18}/></button>
                    <button onClick={() => setDeleteConfirm(c.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl animate-in zoom-in-95 my-auto">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800 uppercase">Ficha Cadastral PF</h2>
              <button onClick={() => setShowModal(false)} className="font-black text-slate-300 hover:text-slate-600">FECHAR</button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Nome Completo</label>
                  <input name="name" defaultValue={editing?.name} required className="w-full bg-slate-50 p-4 rounded-2xl font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">CPF</label>
                  <input name="cpf" defaultValue={editing?.cpf} required placeholder="000.000.000-00" className="w-full bg-slate-50 p-4 rounded-2xl font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Telefone</label>
                  <input name="phone" defaultValue={editing?.phone} required placeholder="(41) 99999-9999" className="w-full bg-slate-50 p-4 rounded-2xl font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 flex justify-between">
                    CEP {loadingCep && <span className="animate-spin">...</span>}
                  </label>
                  <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} onBlur={handleCepBlur} placeholder="00000-000" className="w-full bg-slate-50 p-4 rounded-2xl font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Cidade</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Endereço</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Bairro</label>
                  <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Chave PIX</label>
                  <input name="pixKey" defaultValue={editing?.pixKey} className="w-full bg-slate-50 p-4 rounded-2xl font-bold" />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl">Confirmar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* O Modal de exclusão (DeleteConfirm) continua o mesmo do seu código original */}
    </div>
  );
};

export default ClientesPFView;