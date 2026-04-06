import { notFound } from "next/navigation"

import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form"
import {
  getCurrentStoreContext,
} from "@/lib/products-server"
import {
  listPurchaseOrderProducts,
  listPurchaseOrderSuppliers,
} from "@/lib/purchase-orders-server"

export default async function NewPurchaseOrderPage() {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const [suppliers, products] = await Promise.all([
    listPurchaseOrderSuppliers(storeContext.storeId),
    listPurchaseOrderProducts(storeContext.storeId),
  ])

  return (
    <PurchaseOrderForm
      mode="create"
      suppliers={suppliers}
      products={products}
    />
  )
}
