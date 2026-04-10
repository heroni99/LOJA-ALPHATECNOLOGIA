import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Package,
  Plus,
  Search,
} from "lucide-react"
import { notFound } from "next/navigation"

import { ProductsFilters } from "@/components/products/products-filters"
import { ProductStatusBadge } from "@/components/products/product-status-badge"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatCentsToBRL,
  formatQuantity,
  getProductListFilters,
  type ProductSummary,
} from "@/lib/products"
import {
  getCurrentStoreContext,
  listProductCategories,
  listProducts,
} from "@/lib/products-server"

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

  if (filters.isService !== null) {
    params.set("is_service", String(filters.isService))
  }

  if (page > 1) {
    params.set("page", String(page))
  }

  const query = params.toString()

  return query ? `/products?${query}` : "/products"
}

const productColumns: DataTableColumn<ProductSummary>[] = [
  {
    key: "image",
    header: "Imagem",
    cell: (product) =>
      product.imageUrl ? (
        <div className="overflow-hidden rounded-xl border border-border/70">
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={32}
            height={32}
            className="size-8 object-cover"
          />
        </div>
      ) : (
        <div className="flex size-8 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 text-muted-foreground">
          <ImageIcon className="size-4" />
        </div>
      ),
    className: "w-14",
  },
  {
    key: "internal_code",
    header: "Código interno",
    cell: (product) => (
      <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
        {product.internalCode}
      </Badge>
    ),
  },
  {
    key: "name",
    header: "Nome",
    cell: (product) => (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-foreground">{product.name}</span>
        <span className="text-xs text-muted-foreground">
          {product.supplierName ?? "Sem fornecedor"}
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
    key: "stock_total",
    header: "Estoque total",
    cell: (product) => {
      if (product.isService) {
        return <span className="text-muted-foreground">N/A</span>
      }

      return (
        <span
          className={
            product.isBelowMin ? "font-semibold text-red-700" : "font-semibold text-emerald-700"
          }
        >
          {formatQuantity(product.stockTotal)}
        </span>
      )
    },
    className: "text-right",
    headClassName: "text-right",
  },
  {
    key: "status",
    header: "Status",
    cell: (product) => <ProductStatusBadge active={product.active} />,
  },
]

function ProductsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <SectionCard title="Filtros" description="Carregando filtros de produtos.">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_220px_180px_180px_auto]">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-40" />
        </div>
      </SectionCard>

      <SectionCard title="Catálogo" description="Carregando listagem de produtos.">
        <div className="rounded-3xl border border-border/70">
          <div className="grid grid-cols-[72px_160px_minmax(220px,1fr)_180px_140px_140px_120px] gap-4 border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span>Imagem</span>
            <span>Código</span>
            <span>Nome</span>
            <span>Categoria</span>
            <span className="text-right">Preço</span>
            <span className="text-right">Estoque</span>
            <span>Status</span>
          </div>
          <div className="grid gap-0">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={`product-skeleton-${index}`}
                className="grid grid-cols-[72px_160px_minmax(220px,1fr)_180px_140px_140px_120px] gap-4 border-b border-border/50 px-4 py-3 last:border-b-0"
              >
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-6 w-28" />
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-5 w-28" />
                <Skeleton className="ml-auto h-5 w-24" />
                <Skeleton className="ml-auto h-5 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

async function ProductsPageContent({ searchParams = {} }: ProductsPageProps) {
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
            {products.totalCount}{" "}
            {products.totalCount === 1 ? "produto" : "produtos"}
          </Badge>
        }
        subtitle="Gerencie o catálogo com filtros rápidos, estoque consolidado e navegação direta para o detalhe do item."
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
        description="Busque por nome ou código e refine por categoria, status e tipo."
      >
        <ProductsFilters
          categories={categories}
          currentSearch={filters.search}
          currentCategoryId={filters.categoryId}
          currentActive={filters.active}
          currentIsService={filters.isService}
        />
      </SectionCard>

      <SectionCard
        title="Catálogo"
        description="Clique em uma linha para abrir o detalhe completo do produto."
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="size-4" />
            Página {products.page} de {products.totalPages}
          </div>
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

export default function ProductsPage(props: ProductsPageProps) {
  return (
    <Suspense fallback={<ProductsPageSkeleton />}>
      <ProductsPageContent {...props} />
    </Suspense>
  )
}
