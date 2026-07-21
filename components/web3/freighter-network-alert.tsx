"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { getFreighterNetworkSwitchSteps } from "@/lib/stellar/freighter-network"

interface FreighterNetworkAlertProps {
  appNetworkName: string
  freighterNetworkName: string
}

export function FreighterNetworkAlert({
  appNetworkName,
  freighterNetworkName,
}: FreighterNetworkAlertProps) {
  const steps = getFreighterNetworkSwitchSteps(appNetworkName)

  return (
    <Alert variant="destructive" className="border-amber-300 bg-amber-50 text-amber-950">
      <AlertTriangle className="h-4 w-4 text-amber-700" />
      <AlertTitle className="text-amber-950">Freighter network mismatch</AlertTitle>
      <AlertDescription className="space-y-2 text-amber-900">
        <p>
          Freighter is on <strong>{freighterNetworkName}</strong> but this app uses{" "}
          <strong>{appNetworkName}</strong>. Signing will fail until they match.
        </p>
        <ol className="list-decimal list-inside text-sm space-y-1">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </AlertDescription>
    </Alert>
  )
}
