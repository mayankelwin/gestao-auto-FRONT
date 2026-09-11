import type { Component } from "vue";
import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Boxes,
  Building2,
  CalendarClock,
  CalendarRange,
  ClipboardList,
  Cog,
  Coins,
  CreditCard,
  FileText,
  Landmark,
  LayoutGrid,
  Package,
  QrCode,
  Percent,
  ReceiptText,
  Ruler,
  Scale,
  ScrollText,
  Settings2,
  Shapes,
  ShieldCheck,
  ShoppingCart,
  Split,
  Store,
  Tags,
  Target,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Warehouse,
  ShoppingBag,
  Layers,
  UserCheck,
  Calculator,
  Sliders,
  Shield,
} from "lucide-vue-next";

export type TenantRole =
  "OPERADOR" | "COMERCIAL" | "FINANCEIRO" | "CONTADOR" | "TENANT_ADMIN" | "PLATFORM_ADMIN";

export interface NavItem {
  label: string;
  to: string;
  icon: Component;
  pending?: string;
  papel?: TenantRole;
}

export interface NavGroup {
  label: string;
  to?: string;
  icon?: Component;
  items?: NavItem[];
  papel?: TenantRole;
}

export const navigation: NavGroup[] = [
  {
    label: "Dashboard",
    to: "/",
    icon: LayoutGrid,
  },
  {
    label: "Vendas",
    icon: TrendingUp,
    items: [
      { label: "Pedidos de Venda", to: "/pedidos-de-venda", icon: ShoppingCart },
      { label: "Entregas", to: "/entregas", icon: Truck },
      { label: "Faturas de Venda", to: "/faturas-de-venda", icon: ReceiptText },
    ],
  },
  {
    label: "Compras",
    icon: ShoppingBag,
    items: [
      { label: "Pedidos de Compra", to: "/pedidos-de-compra", icon: ShoppingCart },
      { label: "Recebimentos", to: "/recebimentos", icon: Truck },
      { label: "Faturas de Compra", to: "/faturas-de-compra", icon: ReceiptText },
    ],
  },
  {
    label: "Estoque",
    icon: Layers,
    items: [
      { label: "Itens", to: "/itens", icon: Package },
      { label: "Grupos de Item", to: "/grupos-de-item", icon: Shapes },
      { label: "Depósitos", to: "/depositos", icon: Warehouse },
      { label: "Saldos", to: "/saldos", icon: Boxes },
      { label: "Movimentos", to: "/movimentos", icon: ScrollText },
      { label: "Lotes & Séries", to: "/lotes-e-series", icon: QrCode },
      { label: "Inventário Físico", to: "/inventario-fisico", icon: ClipboardList },
    ],
  },
  {
    label: "Parceiros",
    icon: UserCheck,
    items: [
      { label: "Clientes", to: "/clientes", icon: Users },
      { label: "Fornecedores", to: "/fornecedores", icon: Users },
      { label: "Grupos de Cliente", to: "/grupos", icon: Users },
      { label: "Grupos de Fornecedor", to: "/grupos-de-fornecedor", icon: Users },
    ],
  },
  {
    label: "Financeiro",
    icon: Banknote,
    items: [
      { label: "Pagamentos", to: "/pagamentos", icon: Banknote },
      { label: "Contas a Receber", to: "/contas-a-receber", icon: FileText },
      { label: "Contas a Pagar", to: "/contas-a-pagar", icon: FileText },
      { label: "Condições de Pagamento", to: "/condicoes-de-pagamento", icon: CalendarClock },
      { label: "Meios de Pagamento", to: "/meios-de-pagamento", icon: CreditCard },
      { label: "Contas Bancárias", to: "/contas-bancarias", icon: Landmark },
      { label: "Conciliação Bancária", to: "/conciliacao-bancaria", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Caixas",
    icon: Store,
    items: [
      { label: "Ponto de Venda", to: "/pdv", icon: Store },
      { label: "Turnos de Caixa", to: "/turnos-de-caixa", icon: ClipboardList },
      { label: "Caixas", to: "/caixas", icon: Store },
      { label: "Listas de Preço", to: "/listas-de-preco", icon: Tags },
      { label: "Preços de Item", to: "/precos-de-item", icon: Tags },
    ],
  },
  {
    label: "Contabilidade",
    icon: Calculator,
    items: [
      { label: "Plano de Contas", to: "/plano-de-contas", icon: BookOpen },
      { label: "Centros de Custo", to: "/centros-de-custo", icon: Target },
      { label: "Lançamentos", to: "/lancamentos", icon: ScrollText },
      { label: "Razão", to: "/razao", icon: ScrollText },
      { label: "Balancete", to: "/balancete", icon: BookOpen },
      { label: "Balanço", to: "/balanco", icon: Scale },
      { label: "DRE", to: "/dre", icon: TrendingUp },
      { label: "Exercícios", to: "/exercicios", icon: CalendarRange },
      { label: "Períodos Contábeis", to: "/periodos-contabeis", icon: CalendarRange },
      { label: "Naturezas de Operação", to: "/naturezas-de-operacao", icon: Percent, papel: "TENANT_ADMIN" },
    ],
  },
  {
    label: "Configurações",
    icon: Sliders,
    items: [
      { label: "Empresas", to: "/empresas", icon: Building2 },
      { label: "Moedas", to: "/moedas", icon: Coins },
      { label: "Unidades", to: "/unidades", icon: Ruler },
      { label: "Categorias de Unidade", to: "/categorias-de-unidade", icon: Shapes },
      { label: "Conversões de Unidade", to: "/conversoes-de-unidade", icon: Split },
      { label: "Séries de Numeração", to: "/configuracoes", icon: Settings2 },
    ],
  },
  {
    label: "RH",
    icon: Users,
    items: [
      { label: "Usuários", to: "/usuarios", icon: UserCog, papel: "TENANT_ADMIN" },
      {
        label: "Perfis de acesso",
        to: "/perfis-de-acesso",
        icon: ShieldCheck,
        papel: "TENANT_ADMIN",
      },
    ],
  },
  {
    label: "Plataforma",
    icon: Shield,
    items: [
      {
        label: "Clientes da Plataforma",
        to: "/clientes-da-plataforma",
        icon: Cog,
        papel: "PLATFORM_ADMIN",
      },
    ],
  },
];