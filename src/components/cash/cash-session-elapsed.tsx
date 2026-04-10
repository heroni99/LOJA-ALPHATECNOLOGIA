"use client"

import { useEffect, useState } from "react"

import { formatElapsedDuration } from "@/lib/cash"

type CashSessionElapsedProps = {
  openedAt: string
}

export function CashSessionElapsed({ openedAt }: CashSessionElapsedProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  return formatElapsedDuration(openedAt, now)
}
