"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { OnchainProvider } from "@/components/providers/onchain-provider"
import { Providers } from "@/components/providers"
import { StellarWalletProvider } from "@/components/providers/stellar-wallet-provider"

interface ClientProvidersProps {
  children: React.ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <StellarWalletProvider>
        <Providers>
          <OnchainProvider>
            {children}
            <Toaster />
          </OnchainProvider>
        </Providers>
      </StellarWalletProvider>
    </ThemeProvider>
  )
}
