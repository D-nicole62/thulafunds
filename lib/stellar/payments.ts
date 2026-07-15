import {
  Asset,
  BASE_FEE,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk"
import {
  getStellarNetwork,
  USDC_ASSET_CODE,
  USDC_ISSUER,
} from "@/lib/stellar/config"
import { getHorizonServer } from "@/lib/stellar/server"
import { isValidStellarAddress, normalizeStellarAddress } from "@/lib/stellar/validation"

/** Build, sign, and submit a direct USDC payment on Stellar L1 (no Soroban escrow). */
export async function sendDirectUsdcPayment(
  sourceAddress: string,
  destinationAddress: string,
  amount: number,
  signTransaction: (xdr: string) => Promise<string>,
): Promise<string> {
  const destination = normalizeStellarAddress(destinationAddress)
  if (!isValidStellarAddress(destination)) {
    throw new Error("Invalid recipient wallet address")
  }
  if (!amount || amount < 0.01) {
    throw new Error("Minimum donation is $0.01")
  }

  const network = getStellarNetwork()
  const server = getHorizonServer()
  const source = await server.loadAccount(sourceAddress)
  const asset = new Asset(USDC_ASSET_CODE, USDC_ISSUER)

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset,
        amount: amount.toFixed(7),
      }),
    )
    .setTimeout(180)
    .build()

  const signedXdr = await signTransaction(tx.toXDR())
  const signedTx = TransactionBuilder.fromXDR(signedXdr, network.networkPassphrase)
  const result = await server.submitTransaction(signedTx)
  return result.hash
}
