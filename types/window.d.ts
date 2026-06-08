interface Window {
  freighter?: {
    isConnected: () => Promise<boolean>
    getPublicKey: () => Promise<string>
  }
}
