import { notFound } from "next/navigation"

import { ProductForm } from "@/components/products/product-form"
import {
  getCurrentStoreContext,
  getProductById,
  listProductCategories,
  listProductSuppliers,
} from "@/lib/products-server"
import { toProductFormValues } from "@/lib/products"

type EditProductPageProps = {
  params: {
    id: string
  }
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const [categories, suppliers, product] = await Promise.all([
    listProductCategories(storeContext.storeId),
    listProductSuppliers(storeContext.storeId),
    getProductById(params.id, storeContext.storeId),
  ])

  if (!product) {
    notFound()
  }

  return (
    <ProductForm
      mode="edit"
      productId={product.id}
      internalCode={product.internalCode}
      currentImageUrl={product.imageUrl}
      categories={categories}
      suppliers={suppliers}
      initialValues={toProductFormValues(product)}
    />
  )
}
