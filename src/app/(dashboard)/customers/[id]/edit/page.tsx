import { notFound } from "next/navigation"

import { CustomerForm } from "@/components/customers/customer-form"
import { getCustomerById } from "@/lib/customers-server"
import { toCustomerFormValues } from "@/lib/customers"
import { getCurrentStoreContext } from "@/lib/products-server"

type EditCustomerPageProps = {
  params: {
    id: string
  }
}

export default async function EditCustomerPage({
  params,
}: EditCustomerPageProps) {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const customer = await getCustomerById(params.id, storeContext.storeId)

  if (!customer) {
    notFound()
  }

  return (
    <CustomerForm
      mode="edit"
      customerId={customer.id}
      initialValues={toCustomerFormValues(customer)}
    />
  )
}
