import { notFound } from "next/navigation"

import { SupplierForm } from "@/components/suppliers/supplier-form"
import { getCurrentStoreContext } from "@/lib/products-server"
import { toSupplierFormValues } from "@/lib/suppliers"
import { getSupplierById } from "@/lib/suppliers-server"

type EditSupplierPageProps = {
  params: {
    id: string
  }
}

export default async function EditSupplierPage({
  params,
}: EditSupplierPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const supplier = await getSupplierById(params.id, storeContext.storeId)

  if (!supplier) {
    notFound()
  }

  return (
    <SupplierForm
      mode="edit"
      supplierId={supplier.id}
      initialValues={toSupplierFormValues(supplier)}
    />
  )
}
