export interface FormattedTransactionData {
  type: string,
  dex: string,
  tx: string,
  poolReserves: any,
  tokenPrice: number
}

export interface TokenData {
  mint: string,
  dex: string
}

export interface StreamingData {
  dex: string,
  type: string,
  tx: string,
  poolReserves: {
    token0: string,
    token1: string,
    reserveToken0: number,
    reserveToken1: number
  },
  tokenPrice: number,
  createdAt: Date
}