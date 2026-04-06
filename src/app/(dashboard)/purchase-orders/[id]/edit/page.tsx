import { notFound, redirect } from "next/navigation"

import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form"
import { getCurrentStoreContext } from "@/lib/products-server"
import {
  toPurchaseOrderFormValues,
} from "@/lib/purchase-orders"
import {
  getPurchaseOrderFullDetail,
  listPurchaseOrderProducts,
  listPurchaseOrderSuppliers,
} from "@/lib/purchase-orders-server"

type EditPurchaseOrderPageProps = {
  params: {
    id: string
  }
}

export default async function EditPurchaseOrderPage({
  params,
}: EditPurchaseOrderPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const [suppliers, products, purchaseOrder] = await Promise.all([
    listPurchaseOrderSuppliers(storeContext.storeId),
    listPurchaseOrderProducts(storeContext.storeId),
    getPurchaseOrderFullDetail(params.id, storeContext.storeId),
  ])

  if (!purchaseOrder) {
    notFound()
  }

  if (["PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"].includes(purchaseOrder.status)) {
    redirect(`/purchase-orders/${purchaseOrder.id}`)
  }

  return (
    <PurchaseOrderForm
      mode="edit"
      purchaseOrderId={purchaseOrder.id}
      orderNumber={purchaseOrder.orderNumber}
      suppliers={suppliers}
      products={products}
      initialValues={toPurchaseOrderFormValues(purchaseOrder)}
    />
  )
}
