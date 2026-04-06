import { notFound } from "next/navigation"

import { CustomerForm } from "@/components/customers/customer-form"
import { getCurrentStoreContext } from "@/lib/products-server"

export default async function NewCustomerPage() {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  return <CustomerForm mode="create" />
}
