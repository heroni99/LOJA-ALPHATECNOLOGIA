"use client"

import { useEffect, useId, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Camera, Save } from "lucide-react"
import { Controller, type Control, useForm } from "react-hook-form"

import { FormPage } from "@/components/shared/form-page"
import { FormSection } from "@/components/shared/form-section"
import { ImageUpload } from "@/components/shared/image-upload"
import { LoadingButton } from "@/components/shared/loading-button"
import { MoneyInput } from "@/components/shared/money-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import {
  type ProductFormOption,
  type ProductStockBalance,
  type ProductFormValues,
  defaultProductFormValues,
  formatQuantity,
  getProductInitialStock,
  productFormSchema,
  toProductMutationInput,
} from "@/lib/products"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type ProductFormProps = {
  mode: "create" | "edit"
  categories: ProductFormOption[]
  suppliers: ProductFormOption[]
  initialValues?: ProductFormValues
  productId?: string
  internalCode?: string
  currentImageUrl?: string | null
  stockBalances?: ProductStockBalance[]
}

type ToggleFieldProps = {
  control: Control<ProductFormValues>
  name: "is_service" | "has_serial_control" | "needs_price_review" | "active"
  label: string
  description: string
}

type ProductSelectFieldProps = {
  control: Control<ProductFormValues>
  name: "category_id" | "supplier_id"
  label: string
  placeholder: string
  options: ProductFormOption[]
  requiredMessage?: string
  emptyOptionLabel?: string
}

const NO_SUPPLIER_VALUE = "__none__"

function ProductSelectField({
  control,
  name,
  label,
  placeholder,
  options,
  requiredMessage,
  emptyOptionLabel,
}: ProductSelectFieldProps) {
  const selectId = useId()
  const hasEmptyOption = Boolean(emptyOptionLabel)

  return (
    <Controller
      name={name}
      control={control}
      rules={requiredMessage ? { required: requiredMessage } : undefined}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <Label
            htmlFor={selectId}
            className={cn(fieldState.error ? "text-destructive" : undefined)}
          >
            {label}
          </Label>
          <Select
            value={
              field.value && field.value.length > 0
                ? field.value
                : hasEmptyOption
                  ? NO_SUPPLIER_VALUE
                  : undefined
            }
            onValueChange={(value) => {
              field.onChange(
                hasEmptyOption && value === NO_SUPPLIER_VALUE ? "" : value
              )
              field.onBlur()
            }}
          >
            <SelectTrigger
              id={selectId}
              className="w-full"
              aria-invalid={fieldState.invalid}
              onBlur={field.onBlur}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {hasEmptyOption ? (
                <SelectItem value={NO_SUPPLIER_VALUE}>{emptyOptionLabel}</SelectItem>
              ) : null}
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.error ? (
            <p className="text-sm font-medium text-destructive">
              {fieldState.error.message}
            </p>
          ) : null}
        </div>
      )}
    />
  )
}

function ToggleField({
  control,
  name,
  label,
  description,
}: ToggleFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-start justify-between gap-4 rounded-3xl border border-border/70 bg-background/70 p-4">
          <div className="space-y-1">
            <FormLabel>{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
          </div>
          <FormControl>
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={[
                "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
                field.value
                  ? "border-primary bg-primary"
                  : "border-border bg-muted",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block size-5 rounded-full bg-white transition-transform",
                  field.value ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </FormControl>
        </FormItem>
      )}
    />
  )
}

function ProductImagePlaceholder() {
  return (
    <div className="grid w-full max-w-[200px] gap-3">
      <div className="flex aspect-square w-full max-w-[200px] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border/70 bg-muted/20 p-4 text-center">
        <div className="rounded-full bg-background p-2 text-primary shadow-sm shadow-black/5">
          <Camera className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Adicionar foto</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Salve o produto primeiro para enviar a imagem.
          </p>
        </div>
      </div>
    </div>
  )
}

export function ProductForm({
  mode,
  categories,
  suppliers,
  initialValues = defaultProductFormValues,
  productId,
  internalCode,
  currentImageUrl,
  stockBalances = [],
}: ProductFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [productImageUrl, setProductImageUrl] = useState(currentImageUrl ?? null)
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialValues,
  })
  const isService = form.watch("is_service")

  useEffect(() => {
    if (isService) {
      form.setValue("stock_min", "0", {
        shouldDirty: true,
        shouldValidate: true,
      })

      if (mode === "create") {
        form.setValue("initial_stock", "0", {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    }
  }, [form, isService, mode])

  async function handleSubmit(values: ProductFormValues) {
    try {
      setIsSaving(true)

      const payload =
        mode === "create"
          ? {
              ...toProductMutationInput(values),
              initial_stock: getProductInitialStock(values),
            }
          : toProductMutationInput(values)
      const response = await fetch(
        mode === "create" ? "/api/products" : `/api/products/${productId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível salvar o produto."
        )
      }

      toast.success(
        mode === "create"
          ? "Produto criado com sucesso!"
          : "Produto atualizado com sucesso!"
      )

      if (responseData?.warning) {
        toast.warning(responseData.warning)
      }

      router.push(`/products/${responseData.data.id}`)
      router.refresh()
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormPage
      title={mode === "create" ? "Novo produto" : "Editar produto"}
      description={
        mode === "create"
          ? "Cadastre identificação, preços, dados fiscais e regras operacionais do item."
          : "Atualize o cadastro mantendo o código interno gerado automaticamente."
      }
      backHref={mode === "create" ? "/products" : `/products/${productId}`}
      breadcrumbs={[
        { label: "Produtos", href: "/products" },
        { label: mode === "create" ? "Novo produto" : "Editar produto" },
      ]}
      titleSlot={
        internalCode ? (
          <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
            {internalCode}
          </span>
        ) : null
      }
      footer={
        <>
          <Button variant="outline" asChild>
            <Link href="/products">Cancelar</Link>
          </Button>
          <LoadingButton
            type="submit"
            form="product-form"
            isLoading={isSaving}
            loadingLabel="Salvando..."
          >
            <Save />
            Salvar
          </LoadingButton>
        </>
      }
    >
      <Form {...form}>
        <form
          id="product-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-6"
        >
          <fieldset disabled={isSaving} className="grid gap-6">
            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start">
                <div className="flex justify-center lg:justify-start">
                  {productId ? (
                    <ImageUpload
                      variant="compact"
                      productId={productId}
                      currentUrl={productImageUrl ?? undefined}
                      onUpload={(url) => {
                        setProductImageUrl(url)
                        router.refresh()
                      }}
                      description="Foto principal exibida na listagem e na busca rápida."
                    />
                  ) : (
                    <ProductImagePlaceholder />
                  )}
                </div>

                <FormSection title="Identificação">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: iPhone 15 128GB" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <ProductSelectField
                    control={form.control}
                    name="category_id"
                    label="Categoria *"
                    placeholder="Selecionar categoria"
                    options={categories}
                    requiredMessage="Selecione uma categoria"
                  />
                  <ProductSelectField
                    control={form.control}
                    name="supplier_id"
                    label="Fornecedor"
                    placeholder="Selecionar fornecedor"
                    options={suppliers}
                    emptyOptionLabel="Sem fornecedor"
                  />
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: Apple" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: A55 5G" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supplier_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código do fornecedor</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: SKU-APPLE-15" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detalhes técnicos, variação, observações do catálogo..."
                            className="min-h-28"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FormSection>
              </div>
            </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <FormSection title="Preços">
                <FormField
                  control={form.control}
                  name="cost_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo *</FormLabel>
                      <FormControl>
                        <MoneyInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormDescription>
                        Valor exibido em reais e salvo em centavos.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sale_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço de venda *</FormLabel>
                      <FormControl>
                        <MoneyInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormDescription>
                        O banco recebe o valor convertido para centavos.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque mínimo</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          placeholder="0"
                          disabled={isService}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {isService
                          ? "Serviços não controlam estoque físico."
                          : "Saldo abaixo desse valor ficará em destaque."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {mode === "create" && !isService ? (
                  <FormField
                    control={form.control}
                    name="initial_stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque inicial</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            inputMode="decimal"
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Quantidade inicial em estoque.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </FormSection>
            </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <FormSection title="Fiscal">
                <FormField
                  control={form.control}
                  name="ncm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NCM</FormLabel>
                      <FormControl>
                        <Input placeholder="85171231" inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEST</FormLabel>
                      <FormControl>
                        <Input placeholder="21.064.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cfop_default"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CFOP padrão</FormLabel>
                      <FormControl>
                        <Input placeholder="5102" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="origin_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de origem</FormLabel>
                      <FormControl>
                        <Input placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax_category"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Categoria tributária</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Substituição tributária" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>
            </CardContent>
            </Card>

            {mode === "edit" ? (
              <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
              <CardContent className="pt-6">
                <FormSection title="Estoque" columns={1}>
                  <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Para ajustar o estoque, use a página de detalhes do produto.
                    </p>
                    {productId ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/products/${productId}`}>Ir para detalhes</Link>
                      </Button>
                    ) : null}
                  </div>

                  {isService ? (
                    <p className="text-sm text-muted-foreground">
                      Serviços não controlam estoque físico por local.
                    </p>
                  ) : stockBalances.length > 0 ? (
                    <div className="rounded-3xl border border-border/70">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Local</TableHead>
                            <TableHead className="text-right">Quantidade atual</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockBalances.map((balance) => (
                            <TableRow key={balance.id}>
                              <TableCell>
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
                              </TableCell>
                              <TableCell className="text-right font-semibold text-foreground">
                                {formatQuantity(balance.quantity)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum saldo registrado para este produto.
                    </p>
                  )}
                </FormSection>
              </CardContent>
              </Card>
            ) : null}

            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <FormSection title="Configurações">
                <ToggleField
                  control={form.control}
                  name="is_service"
                  label="É um serviço"
                  description="Serviços não controlam estoque físico."
                />
                <ToggleField
                  control={form.control}
                  name="has_serial_control"
                  label="Controle por IMEI/Serial"
                  description="Ative quando cada unidade exigir rastreabilidade individual."
                />
                <ToggleField
                  control={form.control}
                  name="needs_price_review"
                  label="Preço precisa de revisão"
                  description="Use para destacar itens que exigem ajuste comercial."
                />
                <ToggleField
                  control={form.control}
                  name="active"
                  label="Produto ativo"
                  description="Produtos inativos saem das listas operacionais sem perder histórico."
                />
              </FormSection>
            </CardContent>
            </Card>
          </fieldset>
        </form>
      </Form>
    </FormPage>
  )
}
