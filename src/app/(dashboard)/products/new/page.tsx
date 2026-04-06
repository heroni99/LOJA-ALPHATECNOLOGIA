import { notFound } from "next/navigation"

import { ProductForm } from "@/components/products/product-form"
import {
  getCurrentStoreContext,
  listProductCategories,
  listProductSuppliers,
} from "@/lib/products-server"

export default async function NewProductPage() {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const [categories, suppliers] = await Promise.all([
    listProductCategories(storeContext.storeId),
    listProductSuppliers(storeContext.storeId),
  ])

  return (
    <ProductForm
      mode="create"
      categories={categories}
      suppliers={suppliers}
    />
  )
}
