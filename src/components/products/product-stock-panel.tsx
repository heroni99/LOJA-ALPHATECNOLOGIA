"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Box, Boxes, PackagePlus, Save } from "lucide-react"
import { useForm } from "react-hook-form"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingButton } from "@/components/shared/loading-button"
import { SectionCard } from "@/components/shared/section-card"
import { MoneyInput } from "@/components/shared/money-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import {
  defaultInventoryAdjustmentFormValues,
  defaultInventoryEntryFormValues,
  formatQuantityInput,
  inventoryAdjustmentFormSchema,
  inventoryEntryFormSchema,
  parseQuantityInput,
  toInventoryAdjustmentMutationInput,
  toInventoryEntryMutationInput,
  type InventoryAdjustmentFormValues,
  type InventoryEntryFormValues,
  type InventoryLocationOption,
} from "@/lib/inventory"
import {
  formatDecimalInput,
  formatQuantity,
  getProductStockLevel,
  getProductStockLevelLabel,
  type ProductStockBalance,
} from "@/lib/products"
import { toast } from "@/lib/toast"

type ProductStockPanelProps = {
  productId: string
  productName: string
  stockMin: number
  isService: boolean
  initialBalances: ProductStockBalance[]
}

type InventoryLocationDto = {
  id: string
  name: string
  description: string | null
  is_default: boolean
  active: boolean
}

type InventoryStockBalanceDto = {
  id: string | null
  product_id: string
  location_id: string
  quantity: number
  updated_at: string | null
}

function StockStatusBadge({
  balance,
  stockMin,
}: {
  balance: ProductStockBalance
  stockMin: number
}) {
  if (!balance.locationActive) {
    return (
      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
        Inativo
      </Badge>
    )
  }

  const level = getProductStockLevel(balance.quantity, stockMin)

  if (level === "above_min") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 text-emerald-700"
      >
        {getProductStockLevelLabel(level)}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
      {getProductStockLevelLabel(level)}
    </Badge>
  )
}

function normalizeInventoryLocation(item: InventoryLocationDto): InventoryLocationOption {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    isDefault: Boolean(item.is_default),
    active: Boolean(item.active),
  }
}

function getDefaultEntryValues(productId: string): InventoryEntryFormValues {
  return {
    ...defaultInventoryEntryFormValues,
    product_id: productId,
  }
}

function getDefaultAdjustmentValues(productId: string): InventoryAdjustmentFormValues {
  return {
    ...defaultInventoryAdjustmentFormValues,
    product_id: productId,
  }
}

function getPreferredLocationId(locations: InventoryLocationOption[]) {
  return (locations.find((location) => location.isDefault) ?? locations[0] ?? null)?.id ?? ""
}

export function ProductStockPanel({
  productId,
  productName,
  stockMin,
  isService,
  initialBalances,
}: ProductStockPanelProps) {
  const router = useRouter()
  const [balances, setBalances] = useState(initialBalances)
  const [selectedBalance, setSelectedBalance] = useState<ProductStockBalance | null>(null)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [isEntryOpen, setIsEntryOpen] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const [locations, setLocations] = useState<InventoryLocationOption[]>([])
  const [hasLoadedLocations, setHasLoadedLocations] = useState(false)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const adjustmentForm = useForm<InventoryAdjustmentFormValues>({
    resolver: zodResolver(inventoryAdjustmentFormSchema),
    defaultValues: getDefaultAdjustmentValues(productId),
  })
  const entryForm = useForm<InventoryEntryFormValues>({
    resolver: zodResolver(inventoryEntryFormSchema),
    defaultValues: getDefaultEntryValues(productId),
  })

  useEffect(() => {
    setBalances(initialBalances)
  }, [initialBalances])

  useEffect(() => {
    if (!selectedBalance || !isAdjustmentOpen) {
      return
    }

    adjustmentForm.reset({
      product_id: productId,
      location_id: selectedBalance.locationId,
      new_quantity: formatDecimalInput(selectedBalance.quantity),
      reason: "",
    })
  }, [adjustmentForm, isAdjustmentOpen, productId, selectedBalance])

  async function ensureLocationsLoaded() {
    if (hasLoadedLocations || isLoadingLocations) {
      return
    }

    try {
      setIsLoadingLocations(true)

      const response = await fetch("/api/inventory/locations")
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível carregar os locais."
        )
      }

      const normalizedLocations = Array.isArray(responseData?.data)
        ? (responseData.data as InventoryLocationDto[]).map(normalizeInventoryLocation)
        : []

      setLocations(normalizedLocations)
      setHasLoadedLocations(true)

      if (!entryForm.getValues("location_id")) {
        const preferredLocationId = getPreferredLocationId(normalizedLocations)

        if (preferredLocationId) {
          entryForm.setValue("location_id", preferredLocationId, {
            shouldDirty: false,
          })
        }
      }
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsLoadingLocations(false)
    }
  }

  function upsertBalance(
    locationId: string,
    quantity: number,
    updatedAt: string | null,
    locationName?: string | null,
    locationActive?: boolean
  ) {
    setBalances((currentBalances) => {
      const existingIndex = currentBalances.findIndex(
        (balance) => balance.locationId === locationId
      )

      if (existingIndex === -1) {
        return [
          ...currentBalances,
          {
            id: locationId,
            locationId,
            locationName: locationName ?? null,
            locationActive: locationActive ?? true,
            quantity,
            updatedAt,
          },
        ]
      }

      return currentBalances.map((balance) =>
        balance.locationId === locationId
          ? {
              ...balance,
              quantity,
              updatedAt,
              locationName: locationName ?? balance.locationName,
              locationActive: locationActive ?? balance.locationActive,
            }
          : balance
      )
    })
  }

  async function handleAdjustmentSubmit(values: InventoryAdjustmentFormValues) {
    if (!selectedBalance) {
      return
    }

    try {
      setIsAdjusting(true)

      const payload = toInventoryAdjustmentMutationInput(values)
      const response = await fetch("/api/inventory/adjustment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível ajustar o estoque."
        )
      }

      const updatedBalance = (responseData?.data ?? null) as InventoryStockBalanceDto | null
      const newQuantity =
        typeof responseData?.new_quantity === "number"
          ? responseData.new_quantity
          : updatedBalance?.quantity ?? payload.new_quantity

      upsertBalance(
        payload.location_id,
        newQuantity,
        updatedBalance?.updated_at ?? selectedBalance.updatedAt,
        selectedBalance.locationName,
        selectedBalance.locationActive
      )

      toast.success(
        responseData?.skipped
          ? "O estoque já estava com essa quantidade."
          : "Ajuste de estoque registrado com sucesso."
      )
      setIsAdjustmentOpen(false)
      setSelectedBalance(null)
      adjustmentForm.reset(getDefaultAdjustmentValues(productId))
      router.refresh()
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsAdjusting(false)
    }
  }

  async function handleEntrySubmit(values: InventoryEntryFormValues) {
    try {
      setIsEntering(true)

      const payload = toInventoryEntryMutationInput(values)
      const response = await fetch("/api/inventory/entry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível registrar a entrada."
        )
      }

      const updatedBalance = (responseData?.data ?? null) as InventoryStockBalanceDto | null
      const selectedLocation =
        locations.find((location) => location.id === payload.location_id) ?? null
      const newQuantity =
        typeof responseData?.new_quantity === "number"
          ? responseData.new_quantity
          : updatedBalance?.quantity ?? payload.quantity

      upsertBalance(
        payload.location_id,
        newQuantity,
        updatedBalance?.updated_at ?? null,
        selectedLocation?.name ?? null,
        true
      )

      toast.success("Entrada de estoque registrada com sucesso.")
      setIsEntryOpen(false)
      entryForm.reset(getDefaultEntryValues(productId))
      router.refresh()
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsEntering(false)
    }
  }

  const columns: DataTableColumn<ProductStockBalance>[] = [
    {
      key: "location",
      header: "Local",
      cell: (balance) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">
            {balance.locationName ?? "Sem local"}
          </span>
          {!balance.locationActive ? (
            <span className="text-xs text-muted-foreground">
              Local inativo com saldo histórico.
            </span>
          ) : null}
        </div>
      ),
      className: "whitespace-normal",
    },
    {
      key: "quantity",
      header: "Quantidade atual",
      cell: (balance) => (
        <span className="font-semibold text-foreground">
          {formatQuantity(balance.quantity)}
        </span>
      ),
      className: "text-right",
      headClassName: "text-right",
    },
    {
      key: "stock_min",
      header: "Estoque mínimo",
      cell: () => formatQuantity(stockMin),
      className: "text-right",
      headClassName: "text-right",
    },
    {
      key: "status",
      header: "Status",
      cell: (balance) => <StockStatusBadge balance={balance} stockMin={stockMin} />,
    },
    {
      key: "actions",
      header: "Ações",
      cell: (balance) => (
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => {
            setSelectedBalance(balance)
            setIsAdjustmentOpen(true)
          }}
        >
          Ajustar
        </Button>
      ),
      className: "text-right",
      headClassName: "text-right",
    },
  ]

  return (
    <>
      <SectionCard
        title="Estoque por local"
        description="Distribuição atual do saldo nas localizações da loja, com ajuste rastreado por movimentação."
        action={
          !isService ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setIsEntryOpen(true)
                void ensureLocationsLoaded()
              }}
            >
              <PackagePlus />
              Dar entrada
            </Button>
          ) : null
        }
      >
        {isService ? (
          <EmptyState
            icon={Boxes}
            title="Serviço sem estoque."
            description="Serviços não controlam estoque físico nem movimentações por local."
            className="min-h-56 rounded-none border-0 bg-transparent"
          />
        ) : (
          <DataTable
            columns={columns}
            data={balances}
            getRowKey={(balance) => balance.id}
            emptyState={
              <EmptyState
                icon={Box}
                title="Nenhum local disponível."
                description="Cadastre ao menos um local ativo para começar a movimentar o estoque."
                className="min-h-56 rounded-none border-0 bg-transparent"
              />
            }
          />
        )}
      </SectionCard>

      <Dialog
        open={isAdjustmentOpen}
        onOpenChange={(open) => {
          setIsAdjustmentOpen(open)

          if (!open) {
            setSelectedBalance(null)
            adjustmentForm.reset(getDefaultAdjustmentValues(productId))
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ajustar estoque
              {selectedBalance?.locationName
                ? ` - ${selectedBalance.locationName}`
                : ""}
            </DialogTitle>
            <DialogDescription>
              Atualize o saldo real do produto neste local e registre o motivo do ajuste.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Quantidade atual
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {selectedBalance ? formatQuantity(selectedBalance.quantity) : "0"}
            </p>
          </div>

          <Form {...adjustmentForm}>
            <form
              id="product-stock-adjustment-form"
              onSubmit={adjustmentForm.handleSubmit(handleAdjustmentSubmit)}
              className="grid gap-4"
            >
              <FormField
                control={adjustmentForm.control}
                name="new_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova quantidade *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="0.001"
                        inputMode="decimal"
                        onChange={(event) =>
                          field.onChange(formatQuantityInput(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={adjustmentForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="min-h-28"
                        placeholder="Explique a divergência encontrada ou a correção realizada."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdjustmentOpen(false)}
            >
              Cancelar
            </Button>
            <LoadingButton
              type="submit"
              form="product-stock-adjustment-form"
              isLoading={isAdjusting}
              loadingLabel="Confirmando..."
            >
              <Save />
              Confirmar ajuste
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEntryOpen}
        onOpenChange={(open) => {
          setIsEntryOpen(open)

          if (open) {
            if (!entryForm.getValues("location_id") && locations.length > 0) {
              const preferredLocationId = getPreferredLocationId(locations)

              if (preferredLocationId) {
                entryForm.setValue("location_id", preferredLocationId, {
                  shouldDirty: false,
                })
              }
            }

            void ensureLocationsLoaded()
            return
          }

          entryForm.reset(getDefaultEntryValues(productId))
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar entrada</DialogTitle>
            <DialogDescription>
              Lance uma entrada manual para incrementar o saldo deste produto em um local ativo.
            </DialogDescription>
          </DialogHeader>

          <Form {...entryForm}>
            <form
              id="product-stock-entry-form"
              onSubmit={entryForm.handleSubmit(handleEntrySubmit)}
              className="grid gap-4"
            >
              <FormItem>
                <FormLabel>Produto</FormLabel>
                <Input value={productName} readOnly disabled />
              </FormItem>

              <FormField
                control={entryForm.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoadingLocations || locations.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              isLoadingLocations
                                ? "Carregando locais..."
                                : "Selecione o local"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={entryForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        step="0.001"
                        inputMode="decimal"
                        placeholder="1"
                        onChange={(event) =>
                          field.onChange(formatQuantityInput(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={entryForm.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo unitário *</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0,00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={entryForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="min-h-28"
                        placeholder="Informações sobre recebimento, conferência ou origem da entrada."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isLoadingLocations && locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum local ativo está disponível para receber estoque.
                </p>
              ) : null}
            </form>
          </Form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEntryOpen(false)}
            >
              Cancelar
            </Button>
            <LoadingButton
              type="submit"
              form="product-stock-entry-form"
              isLoading={isEntering}
              loadingLabel="Confirmando..."
              disabled={
                isLoadingLocations ||
                locations.length === 0 ||
                parseQuantityInput(entryForm.watch("quantity")) <= 0
              }
            >
              <Save />
              Confirmar entrada
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
