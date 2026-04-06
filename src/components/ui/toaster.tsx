"use client"

import { Toaster as Sonner } from "sonner"

export function Toaster() {
  return (
    <Sonner
      closeButton
      position="top-right"
      richColors
      theme="light"
      toastOptions={{
        classNames: {
          toast: "font-sans",
          title: "font-medium",
          description: "text-sm",
        },
      }}
    />
  )
}
