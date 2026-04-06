import { notFound } from "next/navigation"

import { InventoryAdjustmentForm } from "@/components/inventory/inventory-adjustment-form"
import { listStockLocations } from "@/lib/inventory-server"
import { getCurrentStoreContext } from "@/lib/products-server"

export default async function InventoryAdjustmentPage() {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const locations = await listStockLocations(storeContext.storeId)

  return (
    <InventoryAdjustmentForm
      locations={locations.filter((location) => location.active)}
    />
  )
}
