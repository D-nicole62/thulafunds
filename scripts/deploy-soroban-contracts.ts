/**
 * Deploy Thula Funds Soroban contracts to Stellar testnet.
 *
 * Usage:
 *   pnpm contracts:deploy
 *
 * Optional env:
 *   STELLAR_DEPLOY_SECRET_KEY — existing funded testnet account (S...)
 *   If omitted, a new keypair is generated and funded via friendbot.
 */
import "dotenv/config"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  Operation,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk"

const ROOT = path.join(__dirname, "..")
const WASM_DIR = path.join(ROOT, "contracts", "target", "wasm32v1-none", "release")
const ENV_PATH = path.join(ROOT, ".env")

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org"

function wasmPath(name: string): string {
  return path.join(WASM_DIR, `${name}.wasm`)
}

function sha256(data: Buffer): Buffer {
  return crypto.createHash("sha256").update(data).digest()
}

async function fundTestnetAccount(publicKey: string): Promise<void> {
  const res = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Friendbot failed (${res.status}): ${body}`)
  }
}

async function waitForTx(
  server: rpc.Server,
  hash: string,
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  let response = await server.getTransaction(hash)
  while (response.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise((r) => setTimeout(r, 1000))
    response = await server.getTransaction(hash)
  }
  if (response.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Transaction ${hash} failed on-chain`)
  }
  return response
}

async function submitOperation(
  server: rpc.Server,
  keypair: Keypair,
  operation: xdr.Operation,
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  const account = await server.getAccount(keypair.publicKey())
  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(180)
    .build()

  tx = (await server.prepareTransaction(tx)) as typeof tx
  tx.sign(keypair)

  const sent = await server.sendTransaction(tx)
  if (sent.status === "ERROR") {
    throw new Error(`Submit failed: ${sent.errorResult?.toXDR("base64") || "unknown"}`)
  }
  return waitForTx(server, sent.hash)
}

async function uploadWasm(
  server: rpc.Server,
  keypair: Keypair,
  filePath: string,
): Promise<Buffer> {
  const wasm = fs.readFileSync(filePath)
  const localHash = sha256(wasm)
  console.log(`  Uploading ${path.basename(filePath)} (${wasm.length} bytes)`)

  const response = await submitOperation(
    server,
    keypair,
    Operation.uploadContractWasm({ wasm }),
  )

  if (!response.returnValue) {
    console.log("  Using local SHA-256 hash (no return value from upload)")
    return localHash
  }

  const returned = scValToNative(response.returnValue)
  const hash = Buffer.from(returned as Uint8Array)
  if (!hash.equals(localHash)) {
    console.warn("  Warning: ledger wasm hash differs from local SHA-256")
  }
  return hash
}

async function deployWasmContract(
  server: rpc.Server,
  keypair: Keypair,
  filePath: string,
  label: string,
): Promise<string> {
  const wasmHash = await uploadWasm(server, keypair, filePath)
  const salt = crypto.randomBytes(32)
  console.log(`  Deploying ${label} contract...`)

  const response = await submitOperation(
    server,
    keypair,
    Operation.createCustomContract({
      address: Address.fromString(keypair.publicKey()),
      wasmHash,
      salt,
      constructorArgs: [],
    }),
  )

  if (!response.returnValue) {
    throw new Error(`No contract address returned for ${label}`)
  }

  const contractId = Address.fromScVal(response.returnValue).toString()
  console.log(`  ${label} deployed: ${contractId}`)
  return contractId
}

async function invokeInitializeFactory(
  server: rpc.Server,
  keypair: Keypair,
  factoryId: string,
  wasmHash: Buffer,
): Promise<void> {
  console.log("  Initializing campaign factory...")
  const admin = Address.fromString(keypair.publicKey())
  const contract = new Contract(factoryId)

  await submitOperation(
    server,
    keypair,
    contract.call(
      "initialize",
      nativeToScVal(admin, { type: "address" }),
      xdr.ScVal.scvBytes(wasmHash),
    ),
  )
  console.log("  Factory initialized")
}

function updateEnvFile(updates: Record<string, string>): void {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(".env file not found")
  }

  let content = fs.readFileSync(ENV_PATH, "utf8")
  for (const [key, value] of Object.entries(updates)) {
    const pattern = new RegExp(`^${key}=.*$`, "m")
    if (pattern.test(content)) {
      content = content.replace(pattern, `${key}=${value}`)
    } else {
      content += `\n${key}=${value}`
    }
  }
  fs.writeFileSync(ENV_PATH, content)
}

async function getDeployerKeypair(): Promise<Keypair> {
  const secret = process.env.STELLAR_DEPLOY_SECRET_KEY?.trim()
  if (secret) {
    return Keypair.fromSecret(secret)
  }
  const kp = Keypair.random()
  console.log(`\nGenerated deployer: ${kp.publicKey()}`)
  console.log(`Save this secret in .env as STELLAR_DEPLOY_SECRET_KEY=${kp.secret()}\n`)
  return kp
}

async function main() {
  console.log("\nThula Funds — Soroban Contract Deploy (testnet)\n")

  for (const name of ["crowdfund", "campaign_factory", "milestone"]) {
    const file = wasmPath(name)
    if (!fs.existsSync(file)) {
      throw new Error(
        `Missing ${file}. Run: pnpm contracts:build`,
      )
    }
  }

  const server = new rpc.Server(RPC_URL, { allowHttp: true })
  const keypair = await getDeployerKeypair()
  const publicKey = keypair.publicKey()

  try {
    await server.getAccount(publicKey)
    console.log(`Using funded account: ${publicKey}`)
  } catch {
    console.log(`Funding ${publicKey} via friendbot...`)
    await fundTestnetAccount(publicKey)
    await new Promise((r) => setTimeout(r, 3000))
  }

  console.log("\n1/4 Install crowdfund WASM")
  const crowdfundHash = await uploadWasm(server, keypair, wasmPath("crowdfund"))

  console.log("\n2/4 Deploy campaign factory")
  const factoryId = await deployWasmContract(
    server,
    keypair,
    wasmPath("campaign_factory"),
    "CampaignFactory",
  )

  console.log("\n3/4 Initialize factory")
  await invokeInitializeFactory(server, keypair, factoryId, crowdfundHash)

  console.log("\n4/4 Deploy milestone contract")
  const milestoneId = await deployWasmContract(
    server,
    keypair,
    wasmPath("milestone"),
    "Milestone",
  )

  const envUpdates: Record<string, string> = {
    NEXT_PUBLIC_CAMPAIGN_FACTORY_ID: factoryId,
    NEXT_PUBLIC_MILESTONE_CONTRACT_ID: milestoneId,
  }

  if (!process.env.STELLAR_DEPLOY_SECRET_KEY?.trim()) {
    envUpdates.STELLAR_DEPLOY_SECRET_KEY = keypair.secret()
  }

  updateEnvFile(envUpdates)

  console.log("\nDeployment complete!\n")
  console.log(`  Factory:   ${factoryId}`)
  console.log(`  Milestone: ${milestoneId}`)
  console.log(`  Crowdfund WASM hash: ${crowdfundHash.toString("hex")}`)
  console.log("\n.env updated with contract IDs. Restart dev server: pnpm dev\n")
}

main().catch((err) => {
  console.error("\nDeploy failed:", err instanceof Error ? err.message : err)
  process.exit(1)
})
