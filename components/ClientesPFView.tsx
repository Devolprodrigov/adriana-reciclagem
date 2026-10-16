import React, { useState, useMemo } from 'react';
import { Plus, Edit3, Trash2, Award, Calendar, TrendingUp, Filter } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { CustomerPF, FinancialRecord } from '../types';

interface Props {
  customers: CustomerPF[];
  financials?: FinancialRecord[];
  notify: (m: string) => void;
}

const ClientesPFView: React.FC<Props> = ({ customers, financials = [], notify }) => {
  const [showModal, setShowModal] = useState(false);
  const [showTop100Modal, setShowTop100Modal] = useState(false);
  const [editing, setEditing] = useState<CustomerPF | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const [frequencyFilter, setFrequencyFilter] = useState<'todos' | 'frequente' | 'regular'>('todos');

  const now = new Date();
  const currentYearStr = now.getFullYear().toString();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');

  const [top100Year, setTop100Year] = useState<string>(currentYearStr);
  const [top100Month, setTop100Month] = useState<string>(currentMonthStr);
  const [top100Day, setTop100Day] = useState<string>('todos');

  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const handleOpenModal = (customer: CustomerPF | null) => {
    setEditing(customer);
    setZipCode(customer?.zipCode || '');
    setAddress(customer?.address || '');
    setNeighborhood(customer?.neighborhood || '');
    setCity(customer?.city || '');
    setState(customer?.state || '');
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
      phone: fd.get('phone') as string,
      pixKey: fd.get('pixKey') as string,
      zipCode: zipCode,
      address: address,
      neighborhood: neighborhood,
      city: city,
      state: state,
      updatedAt: new Date().toISOString(),
      createdAt: editing ? editing.createdAt : new Date().toISOString(),
      status: 'Ativo'
    };

    try {
      setShowModal(false);
      notify("Salvando no sistema...");

      if (editing) {
        await updateDoc(doc(db, 'customersPF', editing.id), customerData);
        notify("Cadastro atualizado!");
      } else {
        await addDoc(collection(db, 'customersPF'), customerData);
        notify("Cliente cadastrado com sucesso!");
      }
      
      setEditing(null);
    } catch (error) {
      console.error("Erro Firebase:", error);
      notify("ERRO AO SALVAR! A tela será reaberta.");
      setShowModal(true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'customersPF', id));
      notify("Cliente removido.");
      setDeleteConfirm(null);
    } catch (error) {
      notify("Erro ao excluir.");
    }
  };

  const normalizeText = (str: string) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  };

  const filteredFinancialsForTop100 = useMemo(() => {
    return financials.filter(f => {
      if (!f.date) return false;
      const [fYear, fMonth, fDay] = f.date.split('-');

      if (top100Year !== 'todos' && fYear !== top100Year) return false;
      if (top100Month !== 'todos' && fMonth !== top100Month) return false;
      if (top100Day !== 'todos' && fDay !== top100Day) return false;

      return true;
    });
  }, [financials, top100Year, top100Month, top100Day]);

  const enrichedCustomers = useMemo(() => {
    return customers.map(c => {
      const normalizedCustomerName = normalizeText(c.name);
      let visitCount = 0;
      let totalValue = 0;
      const uniqueWeeks = new Set<number>();

      let globalVisitCount = 0;
      const globalUniqueWeeks = new Set<number>();

      filteredFinancialsForTop100.forEach(f => {
        const descNormalized = normalizeText(f.description || '');
        const partnerIdMatch = (f as any).partnerId === c.id;
        const nameMatch = descNormalized.includes(normalizedCustomerName);

        if (partnerIdMatch || nameMatch) {
          visitCount += 1;
          totalValue += Number(f.value || 0);

          if (f.date) {
            const dateObj = new Date(f.date + 'T12:00:00');
            const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
            const weekNumber = Math.ceil(((dateObj.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000) + startOfYear.getDay() + 1) / 7);
            uniqueWeeks.add(weekNumber);
          }
        }
      });

      financials.forEach(f => {
        const descNormalized = normalizeText(f.description || '');
        const partnerIdMatch = (f as any).partnerId === c.id;
        const nameMatch = descNormalized.includes(normalizedCustomerName);

        if (partnerIdMatch || nameMatch) {
          globalVisitCount += 1;
          if (f.date) {
            const dateObj = new Date(f.date + 'T12:00:00');
            const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
            const weekNumber = Math.ceil(((dateObj.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000) + startOfYear.getDay() + 1) / 7);
            globalUniqueWeeks.add(weekNumber);
          }
        }
      });

      const isFrequent = globalUniqueWeeks.size >= 4 || globalVisitCount >= 8;

      return {
        ...c,
        visitCount,
        uniqueWeeksCount: uniqueWeeks.size,
        totalValue,
        globalVisitCount,
        isFrequent
      };
    });
  }, [customers, filteredFinancialsForTop100, financials]);

  const top100Customers = useMemo(() => {
    return [...enrichedCustomers]
      .filter(c => c.visitCount > 0)
      .sort((a, b) => b.uniqueWeeksCount - a.uniqueWeeksCount || b.visitCount - a.visitCount || b.totalValue - a.totalValue)
      .slice(0, 100);
  }, [enrichedCustomers]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYearStr);
    financials.forEach(f => {
      if (f.date) {
        const y = f.date.split('-')[0];
        if (y) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [financials, currentYearStr]);

  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf.includes(searchTerm);
      if (!matchesSearch) return false;

      if (frequencyFilter === 'frequente') return c.isFrequent;
      if (frequencyFilter === 'regular') return !c.isFrequent;
      return true;
    });
  }, [enrichedCustomers, searchTerm, frequencyFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Clientes (PF)</h3>
          <p className="text-xs font-bold text-slate-400">Gerenciamento e controle de frequência anual</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <input 
            placeholder="Buscar por nome ou CPF..." 
            className="flex-1 md:w-56 bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-xs outline-none focus:ring-2 ring-indigo-100"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            onClick={() => setShowTop100Modal(true)} 
            className="bg-amber-500 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:bg-amber-600 transition-all"
          >
            <Award size={18}/> Top 100
          </button>
          <button 
            onClick={() => handleOpenModal(null)} 
            className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-all"
          >
            <Plus size={18}/> Novo Cliente
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
        <span className="text-[10px] font-black uppercase text-slate-400 ml-2">Filtrar Frequência:</span>
        <button 
          onClick={() => setFrequencyFilter('todos')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${frequencyFilter === 'todos' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          Todos ({enrichedCustomers.length})
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

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Nome / CPF</th>
                <th className="px-8 py-5">Frequência / Visitas</th>
                <th className="px-8 py-5">Localização</th>
                <th className="px-8 py-5">Contato</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCustomers.length > 0 ? filteredCustomers.map(c => {
                const rowStyle = c.isFrequent 
                  ? 'bg-emerald-50/60 hover:bg-emerald-100/50 border-l-4 border-emerald-500' 
                  : 'hover:bg-slate-50/50';

                return (
                  <tr key={c.id} className={`transition-colors ${rowStyle}`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-800 text-sm">{c.name}</p>
                        {c.isFrequent && (
                          <span className="bg-emerald-200 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            VIP Frequente
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">{c.cpf}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1.5 font-black text-xs text-slate-700">
                        <Calendar size={14} className={c.isFrequent ? "text-emerald-600" : "text-slate-400"} />
                        <span>{c.globalVisitCount} visitas totais</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-slate-600">{c.city} - {c.state}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{c.neighborhood}</p>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-600">{c.phone}</td>
                    <td className="px-8 py-5 text-right space-x-1">
                      <button onClick={() => handleOpenModal(c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit3 size={18}/></button>
                      <button onClick={() => setDeleteConfirm(c.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-xs font-bold uppercase">
                    Nenhum cliente localizado com este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TOP 100 CLIENTES CORRIGIDO (VISUAL ELEGANTE E ESPAÇADO) */}
      {showTop100Modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl animate-in zoom-in-95 my-auto max-h-[90vh] flex flex-col">
            
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 rounded-t-[3rem]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black">
                  <Award size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Top 100 Clientes Mais Frequentes</h2>
                  <p className="text-xs font-bold text-slate-400">Classificação baseada nas vendas registradas no período</p>
                </div>
              </div>
              <button onClick={() => setShowTop100Modal(false)} className="font-black text-slate-400 hover:text-slate-700 bg-white px-5 py-2.5 rounded-2xl border border-slate-200 text-xs uppercase self-end md:self-auto shadow-sm">Fechar</button>
            </div>
            
            <div className="px-8 py-4 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 uppercase">
                <Filter size={14} className="text-indigo-600"/> Filtrar Período:
              </div>

              <select 
                value={top100Year} 
                onChange={(e) => setTop100Year(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none shadow-sm cursor-pointer"
              >
                <option value="todos">Todos os Anos</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>Ano: {y}</option>
                ))}
              </select>

              <select 
                value={top100Month} 
                onChange={(e) => setTop100Month(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none shadow-sm cursor-pointer"
              >
                <option value="todos">Todos os Meses</option>
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                <option value="03">Março</option>
                <option value="04">Abril</option>
                <option value="05">Maio</option>
                <option value="06">Junho</option>
                <option value="07">Julho</option>
                <option value="08">Agosto</option>
                <option value="09">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>

              <select 
                value={top100Day} 
                onChange={(e) => setTop100Day(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none shadow-sm cursor-pointer"
              >
                <option value="todos">Todos os Dias</option>
                {Array.from({ length: 31 }, (_, i) => {
                  const d = String(i + 1).padStart(2, '0');
                  return <option key={d} value={d}>Dia {i + 1}</option>;
                })}
              </select>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 w-28"># Posição</th>
                    <th className="px-6 py-4">Nome do Cliente</th>
                    <th className="px-6 py-4 w-44">Semanas Ativas</th>
                    <th className="px-6 py-4 w-36">Total de Visitas</th>
                    <th className="px-6 py-4 text-right w-40">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {top100Customers.length > 0 ? top100Customers.map((c, index) => (
                    <tr key={c.id || index} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-5 font-black text-indigo-600 text-sm">
                        {index === 0 ? '🥇 1º' : index === 1 ? '🥈 2º' : index === 2 ? '🥉 3º' : `${index + 1}º`}
                      </td>
                      <td className="px-6 py-5 font-black text-slate-800 text-sm">{c.name}</td>
                      <td className="px-6 py-5 font-bold text-xs text-slate-600 whitespace-nowrap">{c.uniqueWeeksCount} semanas distintas</td>
                      <td className="px-6 py-5 font-black text-xs text-slate-700 whitespace-nowrap">{c.visitCount} vezes</td>
                      <td className="px-6 py-5 text-right whitespace-nowrap">
                        {c.isFrequent ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase inline-block">
                            1x+ por Semana
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase inline-block">
                            Regular
                          </span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="text-center py-20 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Nenhum registro de atendimento encontrado para este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                    CEP {loadingCep && <span className="animate-pulse">Buscando...</span>}
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
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition-all">
                Confirmar Cadastro
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center">
            <h3 className="text-lg font-black text-slate-800 uppercase mb-2">Excluir Cliente?</h3>
            <p className="text-slate-500 text-sm font-bold mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-rose-200">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesPFView;
