import React, { useState, useMemo } from 'react';
import { Plus, Building2, Edit3, Trash2, Search, MapPin, Award, Calendar } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { CustomerPJ, FinancialRecord } from '../types';

interface Props {
  customers: CustomerPJ[];
  financials?: FinancialRecord[];
  notify: (m: string) => void;
}

const ClientesPJView: React.FC<Props> = ({ customers, financials = [], notify }) => {
  const [showModal, setShowModal] = useState(false);
  const [showTop100Modal, setShowTop100Modal] = useState(false);
  const [editing, setEditing] = useState<CustomerPJ | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Novo estado para o filtro de frequência
  const [frequencyFilter, setFrequencyFilter] = useState<'todos' | 'frequente' | 'regular'>('todos');

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

  // Mapeia e calcula a frequência de cada empresa com base no financeiro
  const clientStatsMap = useMemo(() => {
    const map: { [key: string]: { visitCount: number; uniqueWeeks: Set<number>; totalSpentOrReceived: number } } = {};

    financials.forEach(f => {
      if (!f.description) return;
      const parts = f.description.split(' - ');
      if (parts.length > 1) {
        const clientName = parts[1].trim().toUpperCase();
        if (!map[clientName]) {
          map[clientName] = { visitCount: 0, uniqueWeeks: new Set(), totalSpentOrReceived: 0 };
        }
        map[clientName].visitCount += 1;
        map[clientName].totalSpentOrReceived += Number(f.value || 0);

        if (f.date) {
          const dateObj = new Date(f.date + 'T12:00:00');
          const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
          const weekNumber = Math.ceil(((dateObj.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000) + startOfYear.getDay() + 1) / 7);
          map[clientName].uniqueWeeks.add(weekNumber);
        }
      }
    });

    return map;
  }, [financials]);

  // Enriquece as empresas com os dados de frequência calculados
  const enrichedCustomers = useMemo(() => {
    return customers.map(c => {
      const stats = clientStatsMap[c.companyName.toUpperCase()] || { visitCount: 0, uniqueWeeks: new Set(), totalSpentOrReceived: 0 };
      // Considera frequente se veio em 4 ou mais semanas distintas (média de ~1x por semana ou constância forte)
      const isFrequent = stats.uniqueWeeks.size >= 4 || stats.visitCount >= 8;
      return {
        ...c,
        visitCount: stats.visitCount,
        uniqueWeeksCount: stats.uniqueWeeks.size,
        totalValue: stats.totalSpentOrReceived,
        isFrequent
      };
    });
  }, [customers, clientStatsMap]);

  // Top 100 Empresas ordenadas por frequência/volume
  const top100Customers = useMemo(() => {
    return [...enrichedCustomers]
      .sort((a, b) => b.uniqueWeeksCount - a.uniqueWeeksCount || b.visitCount - a.visitCount || b.totalValue - a.totalValue)
      .slice(0, 100);
  }, [enrichedCustomers]);

  // Aplicação dos filtros de busca e de frequência por cor
  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter(c => {
      const matchesSearch = c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || c.cnpj.includes(searchTerm);
      if (!matchesSearch) return false;

      if (frequencyFilter === 'frequente') return c.isFrequent;
      if (frequencyFilter === 'regular') return !c.isFrequent;
      return true;
    });
  }, [enrichedCustomers, searchTerm, frequencyFilter]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Empresas & Parceiros (PJ)</h3>
          <p className="text-xs font-bold text-slate-400">Gerenciamento de clientes industriais e frequência anual</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Buscar CNPJ ou Nome..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-xs outline-none focus:ring-2 ring-indigo-500 transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowTop100Modal(true)} 
            className="bg-amber-500 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:bg-amber-600 transition-all shrink-0"
          >
            <Award size={18}/> Top 100
          </button>
          <button onClick={() => handleOpenModal(null)} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all shrink-0">
            <Plus size={20}/> Nova Empresa
          </button>
        </div>
      </div>

      {/* FILTROS DE FREQUÊNCIA (CORES) */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
        <span className="text-[10px] font-black uppercase text-slate-400 ml-2">Filtrar Frequência:</span>
        <button 
          onClick={() => setFrequencyFilter('todos')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${frequencyFilter === 'todos' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          Todas ({enrichedCustomers.length})
        </button>
        <button 
          onClick={() => setFrequencyFilter('frequente')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 ${frequencyFilter === 'frequente' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Mais Frequentes (1x+ Semana) ({enrichedCustomers.filter(c => c.isFrequent).length})
        </button>
        <button 
          onClick={() => setFrequencyFilter('regular')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${frequencyFilter === 'regular' ? 'bg-slate-700 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
        >
          Regulares / Poucas Visitas ({enrichedCustomers.filter(c => !c.isFrequent).length})
        </button>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Razão Social / CNPJ</th>
                <th className="px-8 py-5">Frequência / Visitas</th>
                <th className="px-8 py-5">Localização</th>
                <th className="px-8 py-5">Contato / Responsável</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCustomers.length > 0 ? filteredCustomers.map(c => {
                // Linha ganha cor verde suave se for frequente
                const rowStyle = c.isFrequent 
                  ? 'bg-emerald-50/60 hover:bg-emerald-100/50 border-l-4 border-emerald-500' 
                  : 'hover:bg-slate-50/50';

                return (
                  <tr key={c.id} className={`transition-colors group ${rowStyle}`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-800 text-sm uppercase">{c.companyName}</p>
                        {c.isFrequent && (
                          <span className="bg-emerald-200 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            VIP Frequente
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono font-bold text-slate-400 tracking-tighter">CNPJ: {c.cnpj}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1.5 font-black text-xs text-slate-700">
                        <Calendar size={14} className={c.isFrequent ? "text-emerald-600" : "text-slate-400"} />
                        <span>{c.visitCount} visitas ({c.uniqueWeeksCount} semanas distintas)</span>
                      </div>
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
                );
              }) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-xs font-bold uppercase">
                    Nenhuma empresa localizada com este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TOP 100 EMPRESAS */}
      {showTop100Modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl animate-in zoom-in-95 my-auto max-h-[85vh] flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[3rem]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black">
                  <Award size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Top 100 Empresas Mais Frequentes</h2>
                  <p className="text-xs font-bold text-slate-400">Classificação baseada na constância de entregas/compras ao longo do ano</p>
                </div>
              </div>
              <button onClick={() => setShowTop100Modal(false)} className="font-black text-slate-400 hover:text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs uppercase">Fechar</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest sticky top-0">
                  <tr>
                    <th className="px-6 py-4"># Posição</th>
                    <th className="px-6 py-4">Razão Social</th>
                    <th className="px-6 py-4">Semanas Ativas</th>
                    <th className="px-6 py-4">Total de Visitas</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {top100Customers.map((c, index) => (
                    <tr key={c.id || index} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-black text-indigo-600">
                        {index === 0 ? '🥇 1º' : index === 1 ? '🥈 2º' : index === 2 ? '🥉 3º' : `${index + 1}º`}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-800 text-sm uppercase">{c.companyName}</td>
                      <td className="px-6 py-4 font-bold text-xs text-slate-600">{c.uniqueWeeksCount} semanas distintas</td>
                      <td className="px-6 py-4 font-black text-xs text-slate-700">{c.visitCount} vezes</td>
                      <td className="px-6 py-4 text-right">
                        {c.isFrequent ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                            1x+ por Semana
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                            Regular
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
