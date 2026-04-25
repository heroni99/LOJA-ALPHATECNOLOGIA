"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { type Control, useForm, useWatch } from "react-hook-form"

import { FormPage } from "@/components/shared/form-page"
import { FormSection } from "@/components/shared/form-section"
import { LoadingButton } from "@/components/shared/loading-button"
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
import { Textarea } from "@/components/ui/textarea"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import { cleanCep, fetchCep, formatCep } from "@/lib/cep"
import { toast } from "@/lib/toast"
import {
  defaultSupplierFormValues,
  supplierFormSchema,
  type SupplierFormValues,
  toSupplierMutationInput,
} from "@/lib/suppliers"

type SupplierFormProps = {
  mode: "create" | "edit"
  initialValues?: SupplierFormValues
  supplierId?: string
}

function isBlankValue(value: string | undefined) {
  return (value ?? "").trim().length === 0
}

function ToggleField({
  control,
  name,
  label,
  description,
}: {
  control: Control<SupplierFormValues>
  name: "active"
  label: string
  description: string
}) {
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

export function SupplierForm({
  mode,
  initialValues = defaultSupplierFormValues,
  supplierId,
}: SupplierFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isCepLoading, setIsCepLoading] = useState(false)
  const hasInitializedCepRef = useRef(false)
  const lastFetchedCepRef = useRef<string | null>(null)
  const cepRequestIdRef = useRef(0)
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: initialValues,
  })
  const zipCode = useWatch({
    control: form.control,
    name: "zip_code",
  }) ?? ""

  useEffect(() => {
    const cleanedCep = cleanCep(zipCode)

    if (!hasInitializedCepRef.current) {
      hasInitializedCepRef.current = true
      lastFetchedCepRef.current = cleanedCep.length === 8 ? cleanedCep : null
      return
    }

    if (cleanedCep.length !== 8) {
      cepRequestIdRef.current += 1
      lastFetchedCepRef.current = null
      setIsCepLoading(false)
      return
    }

    if (cleanedCep === lastFetchedCepRef.current) {
      return
    }

    let isActive = true
    const requestId = cepRequestIdRef.current + 1

    cepRequestIdRef.current = requestId
    setIsCepLoading(true)

    void (async () => {
      const cepData = await fetchCep(cleanedCep)

      if (!isActive || cepRequestIdRef.current !== requestId) {
        return
      }

      setIsCepLoading(false)
      lastFetchedCepRef.current = cleanedCep

      if (!cepData) {
        toast.error("CEP não encontrado")
        return
      }

      if (isBlankValue(form.getValues("address")) && cepData.address) {
        form.setValue("address", cepData.address, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
      }

      if (isBlankValue(form.getValues("city")) && cepData.city) {
        form.setValue("city", cepData.city, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
      }

      if (isBlankValue(form.getValues("state")) && cepData.state) {
        form.setValue("state", cepData.state, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
      }
    })()

    return () => {
      isActive = false
    }
  }, [form, zipCode])

  async function handleSubmit(values: SupplierFormValues) {
    try {
      setIsSaving(true)

      const payload = toSupplierMutationInput(values)
      const response = await fetch(
        mode === "create" ? "/api/suppliers" : `/api/suppliers/${supplierId}`,
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
          responseData?.error ?? "Não foi possível salvar o fornecedor."
        )
      }

      toast.success(
        mode === "create"
          ? "Fornecedor criado com sucesso."
          : "Fornecedor atualizado com sucesso."
      )

      router.push(`/suppliers/${responseData.data.id}`)
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
      title={mode === "create" ? "Novo fornecedor" : "Editar fornecedor"}
      description={
        mode === "create"
          ? "Cadastre dados fiscais, contato, endereço e observações do parceiro comercial."
          : "Atualize o cadastro do fornecedor preservando produtos, pedidos e contas vinculadas."
      }
      backHref={mode === "create" ? "/suppliers" : `/suppliers/${supplierId}`}
      breadcrumbs={[
        { label: "Fornecedores", href: "/suppliers" },
        { label: mode === "create" ? "Novo fornecedor" : "Editar fornecedor" },
      ]}
      footer={
        <>
          <Button variant="outline" asChild>
            <Link href="/suppliers">Cancelar</Link>
          </Button>
          <LoadingButton
            type="submit"
            form="supplier-form"
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
          id="supplier-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-6"
        >
          <fieldset disabled={isSaving} className="grid gap-6">
            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <FormSection title="Dados">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: PMCELL São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trade_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Razão social</FormLabel>
                      <FormControl>
                        <Input placeholder="Razão social da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0001-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input placeholder="contato@fornecedor.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do contato comercial" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>
            </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <FormSection title="Endereço">
                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            placeholder="00000-000"
                            autoComplete="postal-code"
                            inputMode="numeric"
                            maxLength={9}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(formatCep(event.target.value))}
                            className={isCepLoading ? "pr-10" : undefined}
                          />
                        </FormControl>
                        {isCepLoading ? (
                          <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                        ) : null}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, número, complemento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="SP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>
            </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardContent className="pt-6">
              <FormSection title="Outros">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Prazos, condições comerciais e observações internas."
                          className="min-h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2">
                  <ToggleField
                    control={form.control}
                    name="active"
                    label="Fornecedor ativo"
                    description="Fornecedores inativos saem dos fluxos operacionais, mas o histórico comercial permanece."
                  />
                </div>
              </FormSection>
            </CardContent>
            </Card>
          </fieldset>
        </form>
      </Form>
    </FormPage>
  )
}
