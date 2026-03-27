
export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: string;
}

export interface CustomerPF {
  id: string;
  name: string;
  cpf: string;
  rg?: string;
  birthDate?: string;
  gender?: string;
  email: string;
  phone: string;
  phoneSecondary?: string;
  zipCode: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  status: string;
  createdAt: string;
  responsible: string;
  pixKey?: string;
}

export interface CustomerPJ {
  id: string;
  companyName: string;
  cnpj: string;
  tradeName: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  foundationDate?: string;
  email: string;
  phone: string;
  contact: string;
  zipCode: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  status: string;
  createdAt: string;
  responsible: string;
  pixKey?: string;
}

export interface FinancialRecord {
  id: string;
  type: 'receita' | 'despesa';
  description: string;
  value: number;
  date: string;
  status: string;
  category: string;
  bankTransactionId?: string; // Link to the original bank transaction
}

export interface BankTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  status: 'PENDING' | 'COMPLETED';
}

export type ActiveTab = 'dashboard' | 'produtos' | 'estoque' | 'pf-clientes' | 'pj-clientes' | 'pedidos' | 'financeiro' | 'notas-fiscais' | 'mtr' | 'ai-insights';
