export function cleanCep(cep: string | null | undefined) {
  return (cep ?? "").replace(/\D/g, "").slice(0, 8)
}

export function formatCep(cep: string | null | undefined) {
  const cleaned = cleanCep(cep)

  if (cleaned.length <= 5) {
    return cleaned
  }

  return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`
}

export async function fetchCep(cep: string) {
  const cleaned = cep.replace(/\D/g, "")

  if (cleaned.length !== 8) {
    return null
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
    const data = await res.json()

    if (data.erro) {
      return null
    }

    return {
      address: data.logradouro,
      city: data.localidade,
      state: data.uf,
      neighborhood: data.bairro,
    }
  } catch {
    return null
  }
}
