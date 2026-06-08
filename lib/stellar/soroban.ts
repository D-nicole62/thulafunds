import {
  Address,
  Contract,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
  BASE_FEE,
} from "@stellar/stellar-sdk"
import { getSorobanRpcUrl, getStellarNetwork, stroopsToUsd, usdToStroops } from "@/lib/stellar/config"

export type SignTransactionFn = (xdr: string) => Promise<string>

function getRpcServer(): rpc.Server {
  return new rpc.Server(getSorobanRpcUrl(), { allowHttp: true })
}

function getNetwork() {
  return getStellarNetwork()
}

/** Read live escrow balance from Soroban — source of truth for progress bars */
export async function getCrowdfundBalance(contractId: string): Promise<number> {
  const server = getRpcServer()
  const network = getNetwork()
  const contract = new Contract(contractId)

  const sourceKey = Address.fromString(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  )
  const account = new xdr.Account(sourceKey.toString(), "0")

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(contract.call("balance"))
    .setTimeout(30)
    .build()

  const sim = await server.simulateTransaction(tx)
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error)
  }

  const result = sim.result?.retval
  if (!result) return 0

  const stroops = scValToNative(result) as bigint
  return stroopsToUsd(stroops)
}

export async function getCrowdfundGoal(contractId: string): Promise<number> {
  const server = getRpcServer()
  const network = getNetwork()
  const contract = new Contract(contractId)

  const sourceKey = Address.fromString(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  )
  const account = new xdr.Account(sourceKey.toString(), "0")

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(contract.call("get_goal"))
    .setTimeout(30)
    .build()

  const sim = await server.simulateTransaction(tx)
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error)
  }

  const stroops = scValToNative(sim.result!.retval) as bigint
  return stroopsToUsd(stroops)
}

/** Invoke crowdfund.deposit(donor, amount) — donor signs via Freighter */
export async function invokeDeposit(
  contractId: string,
  donorAddress: string,
  amountUsd: number,
  signTransaction: SignTransactionFn,
): Promise<string> {
  const server = getRpcServer()
  const network = getNetwork()
  const contract = new Contract(contractId)
  const donor = Address.fromString(donorAddress)
  const stroops = usdToStroops(amountUsd)

  const sourceAccount = await server.getAccount(donorAddress)

  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "deposit",
        nativeToScVal(donor, { type: "address" }),
        nativeToScVal(stroops, { type: "i128" }),
      ),
    )
    .setTimeout(180)
    .build()

  tx = await server.prepareTransaction(tx) as typeof tx

  const signedXdr = await signTransaction(tx.toXDR())
  const signedTx = TransactionBuilder.fromXDR(signedXdr, network.networkPassphrase)
  const result = await server.sendTransaction(signedTx)

  if (result.status === "ERROR") {
    throw new Error(result.errorResult?.toXDR("base64") || "Transaction failed")
  }

  const hash = result.hash
  let getResponse = await server.getTransaction(hash)
  while (getResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise((r) => setTimeout(r, 1000))
    getResponse = await server.getTransaction(hash)
  }

  if (getResponse.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error("Deposit transaction failed on-chain")
  }

  return hash
}

/** Organizer withdraws escrow when goal is met */
export async function invokeWithdraw(
  contractId: string,
  organizerAddress: string,
  signTransaction: SignTransactionFn,
): Promise<string> {
  const server = getRpcServer()
  const network = getNetwork()
  const contract = new Contract(contractId)

  const sourceAccount = await server.getAccount(organizerAddress)

  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(contract.call("withdraw"))
    .setTimeout(180)
    .build()

  tx = await server.prepareTransaction(tx) as typeof tx
  const signedXdr = await signTransaction(tx.toXDR())
  const signedTx = TransactionBuilder.fromXDR(signedXdr, network.networkPassphrase)
  const result = await server.sendTransaction(signedTx)

  if (result.status === "ERROR") {
    throw new Error("Withdraw transaction failed")
  }

  return result.hash
}

/** Donor refund after expired campaign */
export async function invokeRefund(
  contractId: string,
  donorAddress: string,
  signTransaction: SignTransactionFn,
): Promise<string> {
  const server = getRpcServer()
  const network = getNetwork()
  const contract = new Contract(contractId)
  const donor = Address.fromString(donorAddress)

  const sourceAccount = await server.getAccount(donorAddress)

  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(
      contract.call("refund", nativeToScVal(donor, { type: "address" })),
    )
    .setTimeout(180)
    .build()

  tx = await server.prepareTransaction(tx) as typeof tx
  const signedXdr = await signTransaction(tx.toXDR())
  const signedTx = TransactionBuilder.fromXDR(signedXdr, network.networkPassphrase)
  const result = await server.sendTransaction(signedTx)

  if (result.status === "ERROR") {
    throw new Error("Refund transaction failed")
  }

  return result.hash
}

/** Deploy new campaign escrow via factory */
export async function invokeCreateCampaign(
  factoryId: string,
  organizerAddress: string,
  tokenContractId: string,
  goalUsd: number,
  deadlineUnix: number,
  salt: Buffer,
  signTransaction: SignTransactionFn,
): Promise<{ txHash: string; contractAddress: string }> {
  const server = getRpcServer()
  const network = getNetwork()
  const factory = new Contract(factoryId)
  const organizer = Address.fromString(organizerAddress)
  const token = Address.fromString(tokenContractId)
  const stroops = usdToStroops(goalUsd)

  const sourceAccount = await server.getAccount(organizerAddress)

  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(
      factory.call(
        "create_campaign",
        nativeToScVal(organizer, { type: "address" }),
        nativeToScVal(token, { type: "address" }),
        nativeToScVal(stroops, { type: "i128" }),
        nativeToScVal(deadlineUnix, { type: "u64" }),
        xdr.ScVal.scvBytes(salt),
      ),
    )
    .setTimeout(180)
    .build()

  tx = await server.prepareTransaction(tx) as typeof tx
  const signedXdr = await signTransaction(tx.toXDR())
  const signedTx = TransactionBuilder.fromXDR(signedXdr, network.networkPassphrase)
  const result = await server.sendTransaction(signedTx)

  if (result.status === "ERROR") {
    throw new Error("Campaign deployment failed")
  }

  const hash = result.hash
  let getResponse = await server.getTransaction(hash)
  while (getResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise((r) => setTimeout(r, 1000))
    getResponse = await server.getTransaction(hash)
  }

  const contractAddress = extractDeployedContractAddress(getResponse)
  return { txHash: hash, contractAddress }
}

function extractDeployedContractAddress(
  response: rpc.Api.GetSuccessfulTransactionResponse,
): string {
  if (!response.returnValue) {
    throw new Error("No contract address returned from factory")
  }
  const address = scValToNative(response.returnValue) as string
  return address
}

/** Release a milestone tranche */
export async function invokeReleaseMilestone(
  milestoneContractId: string,
  organizerAddress: string,
  milestoneIndex: number,
  signTransaction: SignTransactionFn,
): Promise<string> {
  const server = getRpcServer()
  const network = getNetwork()
  const contract = new Contract(milestoneContractId)

  const sourceAccount = await server.getAccount(organizerAddress)

  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "release_milestone",
        nativeToScVal(milestoneIndex, { type: "u32" }),
      ),
    )
    .setTimeout(180)
    .build()

  tx = await server.prepareTransaction(tx) as typeof tx
  const signedXdr = await signTransaction(tx.toXDR())
  const signedTx = TransactionBuilder.fromXDR(signedXdr, network.networkPassphrase)
  const result = await server.sendTransaction(signedTx)

  if (result.status === "ERROR") {
    throw new Error("Milestone release failed")
  }

  return result.hash
}
