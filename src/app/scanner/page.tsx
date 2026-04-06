import { ScannerPage } from "@/components/scanner/scanner-page"

type ScannerRoutePageProps = {
  searchParams?: {
    code?: string
  }
}

export default function ScannerRoutePage({
  searchParams,
}: ScannerRoutePageProps) {
  return <ScannerPage initialCode={searchParams?.code} />
}
