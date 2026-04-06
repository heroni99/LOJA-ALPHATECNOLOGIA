import { notFound } from "next/navigation"

import { InventoryEntryForm } from "@/components/inventory/inventory-entry-form"
import { listStockLocations } from "@/lib/inventory-server"
import { getCurrentStoreContext } from "@/lib/products-server"

export default async function InventoryEntryPage() {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const locations = await listStockLocations(storeContext.storeId)

  return (
    <InventoryEntryForm
      locations={locations.filter((location) => location.active)}
    />
  )
}
