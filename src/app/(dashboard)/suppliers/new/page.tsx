import { notFound } from "next/navigation"

import { SupplierForm } from "@/components/suppliers/supplier-form"
import { getCurrentStoreContext } from "@/lib/products-server"

export default async function NewSupplierPage() {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  return <SupplierForm mode="create" />
}
