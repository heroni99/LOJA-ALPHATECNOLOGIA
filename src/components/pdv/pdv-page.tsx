"use client"

import { useEffect, useRef, useState } from "react"
import {
  Banknote,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { CustomerAutocomplete } from "@/components/pdv/customer-autocomplete"
import { PdvScannerPanel } from "@/components/pdv/pdv-scanner-panel"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
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
import { Input } from "@/components/ui/input"
import {
  PDV_CART_STORAGE_KEY,
  buildPdvCartSummary,
  createPdvPaymentLine,
  defaultPdvDiscount,
  formatCentsToBRL,
  formatDateTime,
  formatPdvCurrencyInput,
  getCartItemSubtotalCents,
  getPdvPaymentMethodLabel,
  getPdvPaymentMethods,
  getSuggestedPaymentAmountCents,
  type PdvCartItem,
  type PdvCompletedSale,
  type PdvCustomerOption,
  type PdvDiscountInput,
  type PdvPaymentLine,
  type PdvSearchResult,
  toPdvCheckoutPayload,
} from "@/lib/pdv"
import type { CashCurrentSession } from "@/lib/cash"

type SearchApiResponse = {
  data?: PdvSearchResult[]
  error?: string
}

type CashSessionApiResponse = {
  data?: CashCurrentSession
  error?: string
}

type CheckoutApiResponse = {
  data?: PdvCompletedSale
  error?: string
}

function getPaymentMethodIcon(method: PdvPaymentLine["method"]) {
  switch (method) {
    case "CASH":
      return Banknote
    case "PIX":
      return QrCode
    case "DEBIT_CARD":
      return CreditCard
    case "CREDIT_CARD":
      return CreditCard
    default:
      return CreditCard
  }
}

function parseStoredCartItems(value: string | null) {
  if (!value) {
    return [] as PdvCartItem[]
  }

  try {
    const parsed = JSON.parse(value) as PdvCartItem[]

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (item) =>
        Boolean(item?.key) &&
        Boolean(item?.productId) &&
        typeof item?.quantity === "number" &&
        typeof item?.unitPriceCents === "number"
    )
  } catch {
    return []
  }
}

export function PdvPage() {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const cartItemsRef = useRef<PdvCartItem[]>([])
  const [session, setSession] = useState<CashCurrentSession | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<PdvSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [cartItems, setCartItems] = useState<PdvCartItem[]>([])
  const [discount, setDiscount] = useState<PdvDiscountInput>(defaultPdvDiscount)
  const [selectedCustomer, setSelectedCustomer] = useState<PdvCustomerOption | null>(
    null
  )
  const [paymentLines, setPaymentLines] = useState<PdvPaymentLine[]>([])
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false)
  const [completedSale, setCompletedSale] = useState<PdvCompletedSale | null>(null)

  cartItemsRef.current = cartItems

  const summary = buildPdvCartSummary(cartItems, paymentLines, discount)

  useEffect(() => {
    setCartItems(parseStoredCartItems(sessionStorage.getItem(PDV_CART_STORAGE_KEY)))
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (cartItems.length > 0) {
      sessionStorage.setItem(PDV_CART_STORAGE_KEY, JSON.stringify(cartItems))
      return
    }

    sessionStorage.removeItem(PDV_CART_STORAGE_KEY)
  }, [cartItems])

  useEffect(() => {
    const controller = new AbortController()

    setIsLoadingSession(true)
    fetch("/api/cash/current-session", { signal: controller.signal })
      .then(async (response) => {
        const responseData = (await response.json()) as CashSessionApiResponse

        if (!response.ok || !responseData.data) {
          throw new Error(
            responseData.error ?? "Não foi possível carregar a sessão do caixa."
          )
        }

        setSession(responseData.data)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a sessão do caixa."
        )
      })
      .finally(() => {
        setIsLoadingSession(false)
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcut)

    return () => window.removeEventListener("keydown", handleKeyboardShortcut)
  }, [])

  useEffect(() => {
    const query = search.trim()

    if (query.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setIsSearching(true)
      fetch(`/api/pdv/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const responseData = (await response.json()) as SearchApiResponse

          if (!response.ok) {
            throw new Error(
              responseData.error ?? "Não foi possível buscar itens no PDV."
            )
          }

          setSearchResults(responseData.data ?? [])
          setIsSearchOpen(true)
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return
          }

          setSearchResults([])
          toast.error(
            error instanceof Error
              ? error.message
              : "Não foi possível buscar itens no PDV."
          )
        })
        .finally(() => {
          setIsSearching(false)
        })
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [search])

  function focusSearchInput() {
    window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 40)
  }

  function clearSearch() {
    setSearch("")
    setSearchResults([])
    setIsSearchOpen(false)
  }

  function addResultToCart(result: PdvSearchResult) {
    const currentItems = cartItemsRef.current

    if (result.kind === "unit" && result.productUnitId) {
      const alreadyAdded = currentItems.some(
        (item) => item.productUnitId === result.productUnitId
      )

      if (alreadyAdded) {
        toast.error("Essa unidade já está no carrinho.")
        return false
      }

      setCartItems([
        ...currentItems,
        {
          key: result.key,
          productId: result.productId,
          productUnitId: result.productUnitId,
          internalCode: result.internalCode,
          name: result.name,
          quantity: 1,
          unitPriceCents: result.salePriceCents,
          hasSerialControl: true,
          imeiOrSerial: result.imeiOrSerial,
          availableQuantity: 1,
        },
      ])
    } else {
      const existingItem = currentItems.find(
        (item) => item.productId === result.productId && !item.productUnitId
      )

      if (existingItem) {
        if (existingItem.quantity + 1 > result.availableQuantity) {
          toast.error("Estoque indisponível para aumentar a quantidade.")
          return false
        }

        setCartItems(
          currentItems.map((item) =>
            item.key === existingItem.key
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        )
      } else {
        setCartItems([
          ...currentItems,
          {
            key: result.key,
            productId: result.productId,
            productUnitId: null,
            internalCode: result.internalCode,
            name: result.name,
            quantity: 1,
            unitPriceCents: result.salePriceCents,
            hasSerialControl: false,
            imeiOrSerial: null,
            availableQuantity: result.availableQuantity,
          },
        ])
      }
    }

    clearSearch()
    focusSearchInput()
    return true
  }

  function updateItemQuantity(itemKey: string, nextQuantity: number) {
    setCartItems((current) =>
      current.map((item) => {
        if (item.key !== itemKey || item.hasSerialControl) {
          return item
        }

        const safeQuantity = Math.min(
          Math.max(nextQuantity, 1),
          Math.max(1, Math.floor(item.availableQuantity))
        )

        return {
          ...item,
          quantity: safeQuantity,
        }
      })
    )
  }

  function removeCartItem(itemKey: string) {
    setCartItems((current) => current.filter((item) => item.key !== itemKey))
  }

  function addPaymentMethod(method: PdvPaymentLine["method"]) {
    const alreadyExists = paymentLines.some((payment) => payment.method === method)

    if (alreadyExists) {
      toast.error("Essa forma de pagamento já foi adicionada.")
      return
    }

    const suggestedAmount = getSuggestedPaymentAmountCents(summary)
    setPaymentLines((current) => [
      ...current,
      createPdvPaymentLine(method, suggestedAmount),
    ])
  }

  function updatePaymentLineAmount(paymentId: string, nextValue: string) {
    setPaymentLines((current) =>
      current.map((payment) =>
        payment.id === paymentId
          ? { ...payment, amountInput: formatPdvCurrencyInput(nextValue) }
          : payment
      )
    )
  }

  function removePaymentLine(paymentId: string) {
    setPaymentLines((current) =>
      current.filter((payment) => payment.id !== paymentId)
    )
  }

  function startNewSale() {
    setCompletedSale(null)
    setCartItems([])
    setSelectedCustomer(null)
    setPaymentLines([])
    setDiscount(defaultPdvDiscount)
    clearSearch()
    focusSearchInput()
  }

  async function handleCheckout() {
    if (!session) {
      toast.error("A sessão de caixa ainda não foi carregada.")
      return
    }

    try {
      setIsSubmittingCheckout(true)
      const payload = toPdvCheckoutPayload(
        cartItems,
        paymentLines,
        discount,
        session.id,
        selectedCustomer?.id ?? null
      )
      const response = await fetch("/api/sales/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const responseData = (await response.json()) as CheckoutApiResponse

      if (!response.ok || !responseData.data) {
        throw new Error(responseData.error ?? "Não foi possível concluir a venda.")
      }

      setCompletedSale(responseData.data)
      setIsConfirmOpen(false)
      setCartItems([])
      setSelectedCustomer(null)
      setPaymentLines([])
      setDiscount(defaultPdvDiscount)
      clearSearch()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a venda."
      )
    } finally {
      setIsSubmittingCheckout(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="PDV"
        titleSlot={
          <>
            <Badge variant="outline" className="border-primary/20 text-primary">
              {isLoadingSession ? "Carregando caixa..." : session?.terminalName ?? "PDV"}
            </Badge>
            {session ? (
              <>
                <Badge variant="outline">Operador: {session.operatorName}</Badge>
                <Badge variant="outline">
                  Abertura: {formatDateTime(session.openedAt)}
                </Badge>
              </>
            ) : null}
            <Badge variant="outline">F2 busca rápida</Badge>
          </>
        }
        description="Venda rápida com busca por nome, código, barcode ou IMEI, carrinho persistido e múltiplas formas de pagamento."
      />

      <PdvScannerPanel onProductScanned={addResultToCart} />

      <div className="grid gap-6 xl:grid-cols-12">
        <SectionCard
          title="Busca e carrinho"
          description="Pesquise itens com rapidez e monte a venda do balcão sem perder o estado do carrinho."
          className="xl:col-span-8"
        >
          <div className="grid gap-6">
            <div
              className="relative"
              onBlur={() => {
                window.setTimeout(() => setIsSearchOpen(false), 120)
              }}
            >
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={search}
                placeholder="Buscar por nome, código, barcode ou IMEI"
                className="h-14 rounded-3xl pl-12 pr-4 text-base"
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setIsSearchOpen(true)
                  }
                }}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setIsSearchOpen(true)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchResults.length > 0) {
                    event.preventDefault()
                    addResultToCart(searchResults[0])
                  }

                  if (event.key === "Escape") {
                    clearSearch()
                  }
                }}
              />

              {isSearchOpen &&
              (isSearching || searchResults.length > 0 || search.trim().length >= 2) ? (
                <div className="absolute z-20 mt-3 w-full overflow-hidden rounded-3xl border border-border bg-popover shadow-lg ring-1 ring-foreground/5">
                  {isSearching ? (
                    <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Buscando itens...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto p-2">
                      {searchResults.map((result) => (
                        <button
                          key={result.key}
                          type="button"
                          className="flex w-full items-start justify-between gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                          onMouseDown={(event) => {
                            event.preventDefault()
                            addResultToCart(result)
                          }}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">
                                {result.internalCode}
                              </span>
                              {result.imeiOrSerial ? (
                                <Badge variant="outline">
                                  {result.imeiOrSerial}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="truncate text-sm text-muted-foreground">
                              {result.name}
                            </p>
                          </div>
                          <div className="shrink-0 text-right text-sm">
                            <p className="font-medium text-foreground">
                              {formatCentsToBRL(result.salePriceCents)}
                            </p>
                            <p className="text-muted-foreground">
                              {result.kind === "unit"
                                ? "1 un."
                                : `${result.availableQuantity} disp.`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-sm text-muted-foreground">
                      Nenhum item encontrado.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3">
              {cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-background p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">
                          {item.name}
                        </span>
                        <Badge variant="outline">{item.internalCode}</Badge>
                        {item.imeiOrSerial ? (
                          <Badge variant="outline" className="border-primary/20 text-primary">
                            {item.imeiOrSerial}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatCentsToBRL(item.unitPriceCents)} por unidade
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                      {item.hasSerialControl ? (
                        <Badge>Quantidade fixa: 1</Badge>
                      ) : (
                        <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() =>
                              updateItemQuantity(item.key, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus />
                          </Button>
                          <span className="min-w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() =>
                              updateItemQuantity(item.key, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.availableQuantity}
                          >
                            <Plus />
                          </Button>
                        </div>
                      )}

                      <div className="min-w-28 text-right">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Subtotal
                        </p>
                        <p className="font-semibold text-foreground">
                          {formatCentsToBRL(getCartItemSubtotalCents(item))}
                        </p>
                      </div>

                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeCartItem(item.key)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={ShoppingCart}
                  title="Carrinho vazio."
                  description="Pesquise um produto pelo código, nome, barcode ou IMEI para começar a venda."
                  className="min-h-72"
                />
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Resumo e pagamento"
          description="Aplique desconto, vincule um cliente e monte o recebimento antes de finalizar."
          className="xl:col-span-4"
        >
          <div className="grid gap-6">
            <div className="space-y-3 rounded-3xl border border-border/70 bg-background p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <strong>{formatCentsToBRL(summary.subtotalCents)}</strong>
              </div>

              <div className="grid gap-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={discount.mode === "amount" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() =>
                      setDiscount({
                        mode: "amount",
                        value: "0,00",
                      })
                    }
                  >
                    Desconto em R$
                  </Button>
                  <Button
                    type="button"
                    variant={discount.mode === "percent" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() =>
                      setDiscount({
                        mode: "percent",
                        value: "0",
                      })
                    }
                  >
                    Desconto %
                  </Button>
                </div>

                {discount.mode === "amount" ? (
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>
                    <Input
                      value={discount.value}
                      className="pl-10"
                      inputMode="numeric"
                      onChange={(event) =>
                        setDiscount({
                          mode: "amount",
                          value: formatPdvCurrencyInput(event.target.value),
                        })
                      }
                    />
                  </div>
                ) : (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={discount.value}
                    onChange={(event) =>
                      setDiscount({
                        mode: "percent",
                        value: event.target.value,
                      })
                    }
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Desconto aplicado</span>
                <strong>{formatCentsToBRL(summary.discountAmountCents)}</strong>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl bg-primary/10 px-4 py-3">
                <span className="text-sm font-medium text-primary">Total</span>
                <strong className="text-2xl font-semibold text-primary">
                  {formatCentsToBRL(summary.totalCents)}
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Cliente</p>
              <CustomerAutocomplete
                value={selectedCustomer}
                onChange={setSelectedCustomer}
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                Formas de pagamento
              </p>
              <div className="grid grid-cols-2 gap-2">
                {getPdvPaymentMethods().map(({ method, label }) => {
                  const Icon = getPaymentMethodIcon(method)
                  const active = paymentLines.some((payment) => payment.method === method)

                  return (
                    <Button
                      key={method}
                      type="button"
                      variant={active ? "default" : "outline"}
                      className="h-16 flex-col gap-2 rounded-3xl"
                      onClick={() => addPaymentMethod(method)}
                    >
                      <Icon className="size-5" />
                      {label}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3">
              {paymentLines.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-3xl border border-border/70 bg-background p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {getPdvPaymentMethodLabel(payment.method)}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => removePaymentLine(payment.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>

                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {payment.method === "CASH" ? "Valor recebido" : "Valor"}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>
                    <Input
                      value={payment.amountInput}
                      className="pl-10"
                      inputMode="numeric"
                      onChange={(event) =>
                        updatePaymentLineAmount(payment.id, event.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Recebido</span>
                <strong>{formatCentsToBRL(summary.totalPaidCents)}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Troco</span>
                <strong>{formatCentsToBRL(summary.changeCents)}</strong>
              </div>
              {summary.paymentError ? (
                <p className="mt-3 text-sm text-red-600">{summary.paymentError}</p>
              ) : null}
            </div>

            <Button
              className="h-12 w-full text-base"
              disabled={!session || !summary.isPaymentValid || isSubmittingCheckout}
              onClick={() => setIsConfirmOpen(true)}
            >
              {isSubmittingCheckout ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ShoppingCart />
              )}
              Finalizar venda
            </Button>
          </div>
        </SectionCard>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar venda</DialogTitle>
            <DialogDescription>
              Revise os itens, o total e as formas de pagamento antes de concluir.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-3 rounded-3xl border border-border/70 bg-background p-4">
              {cartItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-muted-foreground">
                      {item.internalCode}
                      {item.imeiOrSerial ? ` • ${item.imeiOrSerial}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">{item.quantity} un.</p>
                    <strong>{formatCentsToBRL(getCartItemSubtotalCents(item))}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-3xl border border-border/70 bg-background p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Subtotal</span>
                <strong>{formatCentsToBRL(summary.subtotalCents)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Desconto</span>
                <strong>{formatCentsToBRL(summary.discountAmountCents)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 text-base">
                <span className="font-medium text-foreground">Total</span>
                <strong>{formatCentsToBRL(summary.totalCents)}</strong>
              </div>
            </div>

            <div className="space-y-2 rounded-3xl border border-border/70 bg-background p-4 text-sm">
              {summary.appliedPayments.length > 0 ? (
                summary.appliedPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-muted-foreground">
                      {getPdvPaymentMethodLabel(payment.method)}
                    </span>
                    <div className="text-right">
                      <strong>{formatCentsToBRL(payment.enteredAmountCents)}</strong>
                      {payment.method === "CASH" &&
                      payment.enteredAmountCents !== payment.appliedAmountCents ? (
                        <p className="text-xs text-muted-foreground">
                          Aplicado: {formatCentsToBRL(payment.appliedAmountCents)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Sem pagamentos lançados.</p>
              )}
              {summary.changeCents > 0 ? (
                <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                  <span className="text-muted-foreground">Troco</span>
                  <strong>{formatCentsToBRL(summary.changeCents)}</strong>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSubmittingCheckout}
              onClick={handleCheckout}
            >
              {isSubmittingCheckout ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ShoppingCart />
              )}
              Confirmar venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(completedSale)}
        onOpenChange={(open) => {
          if (!open) {
            setCompletedSale(null)
            focusSearchInput()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Venda concluída</DialogTitle>
            <DialogDescription>
              A venda foi registrada com sucesso no PDV.
            </DialogDescription>
          </DialogHeader>

          {completedSale ? (
            <div className="grid gap-4">
              <div className="rounded-3xl bg-primary/10 px-4 py-5 text-center">
                <p className="text-sm text-primary/80">Número da venda</p>
                <strong className="text-3xl font-semibold text-primary">
                  {completedSale.saleNumber}
                </strong>
              </div>

              <div className="space-y-2 rounded-3xl border border-border/70 bg-background p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Total</span>
                  <strong>{formatCentsToBRL(completedSale.totalCents)}</strong>
                </div>
                {completedSale.changeCents > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Troco</span>
                    <strong>{formatCentsToBRL(completedSale.changeCents)}</strong>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={!completedSale}
              onClick={() => {
                if (!completedSale) {
                  return
                }

                window.open(`/api/sales/${completedSale.id}/receipt`, "_blank", "noopener,noreferrer")
              }}
            >
              Imprimir comprovante
            </Button>
            <Button type="button" onClick={startNewSale}>
              Nova venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
