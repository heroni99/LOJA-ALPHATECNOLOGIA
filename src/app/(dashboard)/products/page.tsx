import Link from "next/link"
import { ChevronLeft, ChevronRight, Package, Plus } from "lucide-react"
import { notFound } from "next/navigation"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { ProductStatusBadge } from "@/components/products/product-status-badge"
import { ProductsFilters } from "@/components/products/products-filters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getCurrentStoreContext,
  listProductCategories,
  listProducts,
} from "@/lib/products-server"
import {
  formatCentsToBRL,
  formatQuantity,
  getProductListFilters,
  type ProductSummary,
} from "@/lib/products"

type ProductsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function buildPageHref(
  page: number,
  filters: ReturnType<typeof getProductListFilters>
) {
  const params = new URLSearchParams()

  if (filters.search) {
    params.set("search", filters.search)
  }

  if (filters.categoryId) {
    params.set("category_id", filters.categoryId)
  }

  if (filters.active !== null) {
    params.set("active", String(filters.active))
  }

  if (page > 1) {
    params.set("page", String(page))
  }

  const query = params.toString()

  return query ? `/products?${query}` : "/products"
}

const productColumns: DataTableColumn<ProductSummary>[] = [
  {
    key: "internal_code",
    header: "Código interno",
    cell: (product) => (
      <span className="font-medium text-foreground">{product.internalCode}</span>
    ),
  },
  {
    key: "name",
    header: "Nome",
    cell: (product) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{product.name}</span>
        <span className="text-xs text-muted-foreground">
          {product.categoryName ?? "Sem categoria"}
        </span>
      </div>
    ),
    className: "whitespace-normal",
  },
  {
    key: "category",
    header: "Categoria",
    cell: (product) => product.categoryName ?? "Sem categoria",
  },
  {
    key: "sale_price",
    header: "Preço venda",
    cell: (product) => formatCentsToBRL(product.salePriceCents),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "total_stock",
    header: "Estoque total",
    cell: (product) => formatQuantity(product.totalStock),
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "status",
    header: "Status",
    cell: (product) => <ProductStatusBadge active={product.active} />,
  },
]

export default async function ProductsPage({ searchParams = {} }: ProductsPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const filters = getProductListFilters(searchParams)
  const [categories, products] = await Promise.all([
    listProductCategories(storeContext.storeId),
    listProducts(storeContext.storeId, filters),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Produtos"
        titleSlot={
          <Badge variant="outline" className="border-primary/20 text-primary">
            {products.totalCount} {products.totalCount === 1 ? "item" : "itens"}
          </Badge>
        }
        description="Gerencie o catálogo com filtros, status de ativação, estoque consolidado e navegação rápida para detalhe e edição."
        actions={
          <Button asChild>
            <Link href="/products/new">
              <Plus />
              Novo produto
            </Link>
          </Button>
        }
      />

      <SectionCard
        title="Filtros"
        description="Pesquise por nome, código, marca, modelo, categoria e status do cadastro."
      >
        <ProductsFilters
          categories={categories}
          currentSearch={filters.search}
          currentCategoryId={filters.categoryId}
          currentActive={filters.active}
        />
      </SectionCard>

      <SectionCard
        title="Catálogo"
        description="Clique em um item para abrir o detalhe completo do produto."
      >
        <DataTable
          columns={productColumns}
          data={products.items}
          getRowKey={(product) => product.id}
          getRowHref={(product) => `/products/${product.id}`}
          emptyState={
            <EmptyState
              icon={Package}
              title="Nenhum produto encontrado."
              description="Ajuste os filtros ou cadastre um novo item para começar o catálogo."
              className="min-h-64 rounded-none border-0 bg-transparent"
            />
          }
        />

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {products.page} de {products.totalPages}
          </p>
          <div className="flex gap-2">
            {products.page > 1 ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(products.page - 1, filters)}>
                  <ChevronLeft />
                  Anterior
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <ChevronLeft />
                Anterior
              </Button>
            )}
            {products.page < products.totalPages ? (
              <Button variant="outline" asChild>
                <Link href={buildPageHref(products.page + 1, filters)}>
                  Próxima
                  <ChevronRight />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Próxima
                <ChevronRight />
              </Button>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
