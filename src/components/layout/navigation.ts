import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  BarChart3,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MapPin,
  Package,
  PackageCheck,
  PackagePlus,
  Receipt,
  RotateCcw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react"

export type NavigationItem = {
  href: string
  label: string
  description: string
  icon: LucideIcon
}

export type NavigationGroup = {
  title: string
  items: NavigationItem[]
}

export const navigationGroups: NavigationGroup[] = [
  {
    title: "Operação",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        description: "Visão geral da operação da loja.",
        icon: LayoutDashboard,
      },
      {
        href: "/pdv",
        label: "PDV",
        description: "Venda rápida no balcão.",
        icon: ShoppingCart,
      },
      {
        href: "/cash",
        label: "Caixa",
        description: "Abertura, sangria e fechamento.",
        icon: Wallet,
      },
      {
        href: "/sales",
        label: "Vendas",
        description: "Histórico e conferência das vendas.",
        icon: Receipt,
      },
    ],
  },
  {
    title: "Estoque",
    items: [
      {
        href: "/inventory",
        label: "Estoque",
        description: "Posição geral de estoque.",
        icon: Package,
      },
      {
        href: "/inventory/entry",
        label: "Entradas",
        description: "Recebimentos e lançamentos.",
        icon: PackagePlus,
      },
      {
        href: "/inventory/adjustment",
        label: "Ajustes",
        description: "Correções de inventário.",
        icon: PackageCheck,
      },
      {
        href: "/inventory/transfer",
        label: "Transferências",
        description: "Movimentações entre locais.",
        icon: ArrowLeftRight,
      },
      {
        href: "/units",
        label: "Unidades",
        description: "Controle de IMEI e seriais.",
        icon: Smartphone,
      },
      {
        href: "/stock-locations",
        label: "Locais",
        description: "Mapeamento de posições de estoque.",
        icon: MapPin,
      },
    ],
  },
  {
    title: "Cadastros",
    items: [
      {
        href: "/products",
        label: "Produtos",
        description: "Catálogo e precificação.",
        icon: Tag,
      },
      {
        href: "/services",
        label: "Serviços",
        description: "Catálogo de serviços técnicos.",
        icon: Wrench,
      },
      {
        href: "/customers",
        label: "Clientes",
        description: "Relacionamento e histórico.",
        icon: Users,
      },
      {
        href: "/suppliers",
        label: "Fornecedores",
        description: "Parceiros e abastecimento.",
        icon: Truck,
      },
      {
        href: "/categories",
        label: "Categorias",
        description: "Classificação do catálogo.",
        icon: FolderOpen,
      },
    ],
  },
  {
    title: "Financeiro",
    items: [
      {
        href: "/financial",
        label: "Financeiro",
        description: "Visão consolidada do financeiro.",
        icon: TrendingUp,
      },
      {
        href: "/accounts-payable",
        label: "Contas a Pagar",
        description: "Compromissos com fornecedores.",
        icon: ArrowDownCircle,
      },
      {
        href: "/accounts-receivable",
        label: "Contas a Receber",
        description: "Recebimentos de clientes.",
        icon: ArrowUpCircle,
      },
    ],
  },
  {
    title: "Serviços",
    items: [
      {
        href: "/service-orders",
        label: "Ordens de Serviço",
        description: "Assistência e acompanhamento técnico.",
        icon: ClipboardList,
      },
      {
        href: "/purchase-orders",
        label: "Pedidos de Compra",
        description: "Reposição e compras.",
        icon: ShoppingBag,
      },
      {
        href: "/returns",
        label: "Devoluções",
        description: "Trocas e estornos.",
        icon: RotateCcw,
      },
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        href: "/reports",
        label: "Relatórios",
        description: "Análises e indicadores.",
        icon: BarChart3,
      },
      {
        href: "/fiscal",
        label: "Fiscal",
        description: "Documentos e obrigações fiscais.",
        icon: FileText,
      },
      {
        href: "/settings",
        label: "Configurações",
        description: "Parâmetros do sistema.",
        icon: Settings,
      },
    ],
  },
]

export const navigationItems: NavigationItem[] = navigationGroups.flatMap(
  (group) => group.items
)

export function isNavigationItemActive(item: NavigationItem, pathname: string) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function getNavigationItem(pathname: string) {
  return (
    navigationItems.find(
      (item) => isNavigationItemActive(item, pathname)
    ) ?? null
  )
}
