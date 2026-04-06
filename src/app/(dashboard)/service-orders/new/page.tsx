import { notFound } from "next/navigation"

import { ServiceOrderForm } from "@/components/service-orders/service-order-form"
import { getCurrentStoreContext } from "@/lib/products-server"

export default async function NewServiceOrderPage() {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  return <ServiceOrderForm />
}
