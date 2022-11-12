import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import { Swap as SwapV1 } from "../generated/Pair/Pair";
import { Swap as SwapV2 } from "../generated/LBPair/LBPair";
import { Candle, LBPair } from "../generated/schema";
import { loadToken, loadV1Pair } from "./entities";
import { getTokenYPriceOfBin, getAmountTraded } from "./utils/pricing";
import { BIG_DECIMAL_ONE, BIG_DECIMAL_ZERO, candlestickPeriods } from "./constants";

export function handleSwapV2(event: SwapV2): void {
  const lbPair = LBPair.load(event.address.toHexString());
  if (!lbPair) {
    return;
  }

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  const priceY = getTokenYPriceOfBin(
    event.params.id,
    lbPair.binStep,
    tokenX,
    tokenY
  );
  const priceX = BIG_DECIMAL_ONE.div(priceY);

  for (let i = 0; i < candlestickPeriods.length; i++) {
    const timestamp = event.block.timestamp.toI32();
    const periodStart = timestamp - (timestamp % candlestickPeriods[i]);
    const candleId = periodStart
      .toString()
      .concat(candlestickPeriods[i].toString())
      .concat(tokenX.id)
      .concat(tokenY.id);

    let candle = Candle.load(candleId);
    if (!candle) {
      candle = new Candle(candleId);
      candle.time = periodStart;
      candle.period = candlestickPeriods[i];
      candle.tokenX = Address.fromString(tokenX.id);
      candle.tokenY = Address.fromString(tokenY.id);
      candle.tokenXTotalAmount = BIG_DECIMAL_ZERO;
      candle.tokenYTotalAmount = BIG_DECIMAL_ZERO;
      candle.high = priceX;
      candle.open = priceX;
      candle.close = priceX;
      candle.low = priceX;
    }

    const amountXTraded = (event.params.swapForY 
      ? event.params.amountIn 
      : event.params.amountOut)
      .divDecimal(BigDecimal.fromString(tokenX.decimals.toString()))

    const amountYTraded = (event.params.swapForY 
        ? event.params.amountOut
        : event.params.amountIn)
        .divDecimal(BigDecimal.fromString(tokenY.decimals.toString()))

    candle.tokenXTotalAmount = candle.tokenXTotalAmount.plus(amountXTraded);
    candle.tokenYTotalAmount = candle.tokenYTotalAmount.plus(amountYTraded);

    if (priceX.lt(candle.low)) {
      candle.low = priceX;
    }
    if (priceX.gt(candle.high)) {
      candle.high = priceX;
    }
    candle.close = priceX;
    candle.lastBlock = event.block.timestamp.toI32();

    candle.save();
  }
}

export function handleSwapV1(event: SwapV1): void {
  const v1Pair = loadV1Pair(event.address);
  if (!v1Pair) {
    return;
  }

  const token0 = loadToken(Address.fromString(v1Pair.token0));
  const token1 = loadToken(Address.fromString(v1Pair.token1));

  const amount0Traded = getAmountTraded(
    event.params.amount0In,
    event.params.amount0Out,
    token0.decimals
  );
  const amount1Traded = getAmountTraded(
    event.params.amount1In,
    event.params.amount1Out,
    token1.decimals
  );
  const price = amount0Traded.div(amount1Traded);

  for (let i = 0; i < candlestickPeriods.length; i++) {
    const timestamp = event.block.timestamp.toI32();
    const periodStart = timestamp - (timestamp % candlestickPeriods[i]);
    const candleId = periodStart
      .toString()
      .concat(candlestickPeriods[i].toString())
      .concat(token0.id)
      .concat(token1.id);

    let candle = Candle.load(candleId);
    if (!candle) {
      candle = new Candle(candleId);
      candle.time = periodStart;
      candle.period = candlestickPeriods[i];
      candle.tokenX = Address.fromString(token0.id);
      candle.tokenY = Address.fromString(token1.id);
      candle.tokenXTotalAmount = BIG_DECIMAL_ZERO;
      candle.tokenYTotalAmount = BIG_DECIMAL_ZERO;
      candle.high = price;
      candle.open = price;
      candle.close = price;
      candle.low = price;
    }

    candle.tokenXTotalAmount = candle.tokenXTotalAmount.plus(amount0Traded);
    candle.tokenYTotalAmount = candle.tokenYTotalAmount.plus(amount1Traded);

    if (price.lt(candle.low)) {
      candle.low = price;
    }
    if (price.gt(candle.high)) {
      candle.high = price;
    }
    candle.close = price;
    candle.lastBlock = event.block.timestamp.toI32();

    candle.save();
  }
}
