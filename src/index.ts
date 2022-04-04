import axios from 'axios'
import JSBI from 'jsbi'
import { CurrencyAmount, Pair, Token, Trade } from './entities'
import { ChainId } from './enums'

// Export JSBI
export { JSBI }

export * from './constants'
export * from './errors'
export * from './entities'
export * from './functions'
export * from './router'
export * from './enums'
export * from './router'
export * from './types'
export * from './utils/MultiRouterMath'
export * from './limitorder'

enum Dexes {
  ARBITRUM = 42161,
  AURORA = 1313161554,
  AVALANCHE = 43114,
  BSC = 56,
  ETHEREUM = 1,
  POLYGON = 137,
}

const { ARBITRUM, AURORA, AVALANCHE, BSC, ETHEREUM, POLYGON } = Dexes

const ChainNameMapper = {
  [AURORA]: 'aurora',
  [ARBITRUM]: 'arbitrum',
  [AVALANCHE]: 'avalanche',
  [BSC]: 'bsc',
  [ETHEREUM]: 'ethereum',
  [POLYGON]: 'polygon',
}

async function main({
  srcToken,
  dstToken,
  srcTokenDecimal,
  dstTokenDecimal,
  chain,
  amount,
}: {
  srcToken: string
  dstToken: string
  srcTokenDecimal: number
  dstTokenDecimal: number
  chain: Dexes
  amount: string
}): Promise<any> {
  const { data } = await axios.post(`https://devapi.arken.finance/rate-compare/get-pairs`, {
    srcToken,
    dstToken,
    chain: convertDexesToChainName(chain),
  })

  if (data.pairDexes === null) {
    return { data: [] }
  }

  console.log('data', data)

  const fee = 1

  data.pairDexes.map(({ dexName, dexUrl, pairs }: any) => {
    const result = comparePrice({
      pairs,
      srcToken,
      dstToken,
      srcTokenDecimal,
      dstTokenDecimal,
      chainId: convertDexesToChainId(chain),
      amount,
      fee,
    })

    if (!result) throw new Error()

    const { outputAmount, decimal } = result

    return {
      dexId: dexName,
      dexUrl,
      outputAmount,
      decimal,
    }
  })

  return null
}

function comparePrice({
  pairs,
  srcToken,
  dstToken,
  srcTokenDecimal,
  dstTokenDecimal,
  chainId,
  amount,
  fee,
}: {
  pairs: any[]
  srcToken: string
  dstToken: string
  srcTokenDecimal: number
  dstTokenDecimal: number
  chainId: ChainId
  amount: string
  fee: number
}): { outputAmount: string; decimal: number } | undefined {
  const tokenInput = new Token(chainId, srcToken, srcTokenDecimal)

  const tokenOutput = new Token(chainId, dstToken, dstTokenDecimal)

  const tokenAmountInput = CurrencyAmount.fromRawAmount(tokenInput, amount)

  const currentPairs = pairs.map(({ token0, token1, reserve0, reserve1, decimal0, decimal1 }) => {
    const tokenInput = new Token(chainId, token0, decimal0)

    const tokenOutput = new Token(chainId, token1, decimal1)

    const tokenAmountInput = CurrencyAmount.fromRawAmount(tokenInput, reserve0)
    const tokenAmountOutput = CurrencyAmount.fromRawAmount(tokenOutput, reserve1)

    return new Pair(tokenAmountInput, tokenAmountOutput)
  })

  const trades = Trade.bestTradeExactIn(currentPairs, tokenAmountInput, tokenOutput, fee)

  if (trades.length === 0) return undefined

  const outputAmount = trades.map(({ outputAmount }) => outputAmount.toExact())

  console.log('outputAmount: outputAmount.toExact(),', outputAmount)

  return {
    outputAmount: trades[0].outputAmount.toExact(),
    decimal: trades[0].outputAmount.currency.decimals,
  }
}

function convertDexesToChainId(chainId: Dexes) {
  switch (chainId) {
    case Dexes.ARBITRUM:
      return ChainId.ARBITRUM
    case Dexes.AVALANCHE:
      return ChainId.AVALANCHE
    case Dexes.AURORA:
      return ChainId.AURORA
    case Dexes.BSC:
      return ChainId.BSC
    case Dexes.ETHEREUM:
      return ChainId.MAINNET
    case Dexes.POLYGON:
      return ChainId.MATIC
  }
}

function convertDexesToChainName(chainId: Dexes) {
  switch (chainId) {
    case Dexes.ARBITRUM:
      return ChainNameMapper[ARBITRUM]
    case Dexes.AVALANCHE:
      return ChainNameMapper[AVALANCHE]
    case Dexes.AURORA:
      return ChainNameMapper[AURORA]
    case Dexes.BSC:
      return ChainNameMapper[BSC]
    case Dexes.ETHEREUM:
      return ChainNameMapper[ETHEREUM]
    case Dexes.POLYGON:
      return ChainNameMapper[POLYGON]
  }
}

main({
  srcToken: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  dstToken: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
  srcTokenDecimal: 18,
  dstTokenDecimal: 18,
  amount: '1000000000000000000',
  chain: 56,
})
