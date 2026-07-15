import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { DATABASE_SETUP_STEPS, getDatabaseErrorMessage } from "@/lib/db-errors"

interface DatabaseErrorCardProps {
  title: string
  error: unknown
}

export function DatabaseErrorCard({ title, error }: DatabaseErrorCardProps) {
  const message = getDatabaseErrorMessage(error)
  const isUnreachable = message.includes("Supabase")

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-red-700">{message}</p>
        {isUnreachable && (
          <ol className="text-sm text-red-800 list-decimal list-inside space-y-1 bg-red-100/80 p-3 rounded-md">
            {DATABASE_SETUP_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
