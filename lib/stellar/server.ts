import { Horizon } from "@stellar/stellar-sdk"
import { getStellarNetwork, USDC_ASSET_CODE, USDC_ISSUER } from "@/lib/stellar/config"
import { isValidStellarAddress } from "@/lib/stellar/validation"

export function getHorizonServer(): Horizon.Server {
  const network = getStellarNetwork()
  return new Horizon.Server(network.horizonUrl)
}

export async function getWalletInfo(address: string) {
  if (!isValidStellarAddress(address)) {
    return null
  }

  try {
    const server = getHorizonServer()
    const account = await server.loadAccount(address)

    const usdcBalance = account.balances.find(
      (balance) =>
        balance.asset_type !== "native" &&
        "asset_code" in balance &&
        balance.asset_code === USDC_ASSET_CODE &&
        balance.asset_issuer === USDC_ISSUER,
    )

    return {
      address,
      balance: usdcBalance && "balance" in usdcBalance ? usdcBalance.balance : "0",
      network: getStellarNetwork().name,
    }
  } catch (error) {
    console.error("Failed to fetch Stellar wallet info:", error)
    return null
  }
}

export async function verifyTransactionOnHorizon(
  txHash: string,
  expectedRecipient?: string,
  expectedAmount?: number,
): Promise<{ verified: boolean; error?: string }> {
  try {
    const server = getHorizonServer()
    const transaction = await server.transactions().transaction(txHash).call()

    if (!transaction.successful) {
      return { verified: false, error: "Transaction was not successful" }
    }

    if (expectedRecipient || expectedAmount !== undefined) {
      const operations = await server
        .operations()
        .forTransaction(txHash)
        .call()

      const payment = operations.records.find(
        (op) => op.type === "payment" && "asset_code" in op && op.asset_code === USDC_ASSET_CODE,
      )

      if (!payment || payment.type !== "payment") {
        return { verified: false, error: "No USDC payment found in transaction" }
      }

      if (expectedRecipient && "to" in payment && payment.to !== expectedRecipient) {
        return { verified: false, error: "Payment recipient mismatch" }
      }

      if (expectedAmount !== undefined && "amount" in payment) {
        const paidAmount = parseFloat(payment.amount as string)
        if (Math.abs(paidAmount - expectedAmount) > 0.0000001) {
          return { verified: false, error: "Payment amount mismatch" }
        }
      }
    }

    return { verified: true }
  } catch (error) {
    console.error("Horizon transaction verification failed:", error)
    return { verified: false, error: "Transaction not found on Stellar network" }
  }
}
