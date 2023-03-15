import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import { concat } from "@graphprotocol/graph-ts/helper-functions";
import { Swap as SwapV1 } from "../generated/Pair/Pair";
import { Swap as SwapV2 } from "../generated/LBPair/LBPair";
import { Swap as SwapV21 } from "../generated/LBPairV21/LBPairV21";
import { Candle, LBPair, LBPairV21 } from "../generated/schema";
import { loadToken, loadV1Pair } from "./entities";
import { getTokenYPriceOfBin, getAmountTraded } from "./utils/pricing";
import { BIG_INT_ZERO, BIG_DECIMAL_ONE, candlestickPeriods } from "./constants";

export function handleSwapV21(event: SwapV21): void {
  const lbPair = LBPairV21.load(event.address.toHexString());
  if (!lbPair) {
    return;
  }

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  // init token0/token1 to match with V1Pair's tokens order
  const isSorted = tokenX.id.toLowerCase() < tokenY.id.toLowerCase(); // if true, order of tokens matches V1Pair
  const token0 = isSorted ? tokenX : tokenY;
  const token1 = isSorted ? tokenY : tokenX;

  // price in tokenY
  const priceY = getTokenYPriceOfBin(
    BigInt.fromString(event.params.id.toString()),
    lbPair.binStep,
    tokenX,
    tokenY
  );

  // price in tokenX
  const priceX = BIG_DECIMAL_ONE.div(priceY);

  // price in token0
  const price = isSorted ? priceX : priceY;

  const tokens = concat(
    Address.fromString(token0.id),
    Address.fromString(token1.id)
  );
  const timestamp = event.block.timestamp.toI32();

  for (let i = 0; i < candlestickPeriods.length; i++) {
    const timeId = timestamp / candlestickPeriods[i];
    const candleId = concat(
      concat(Bytes.fromI32(timeId), Bytes.fromI32(candlestickPeriods[i])),
      tokens
    ).toHex();

    let candle = Candle.load(candleId);
    if (candle === null) {
      candle = new Candle(candleId);
      candle.time = timestamp - (timestamp % candlestickPeriods[i]); // Round to the nearest time period
      candle.period = candlestickPeriods[i];
      candle.token0 = Address.fromString(token0.id);
      candle.token1 = Address.fromString(token1.id);
      candle.token0TotalAmount = BIG_INT_ZERO;
      candle.token1TotalAmount = BIG_INT_ZERO;
      candle.high = price;
      candle.open = price;
      candle.close = price;
      candle.low = price;
    } else {
      if (price < candle.low) {
        candle.low = price;
      }
      if (price > candle.high) {
        candle.high = price;
      }
    }

    // amountsIn is [amountX, amountY] packed into byte32
    const amountInX = decodeX(event.params.amountsIn)
    const amountInY = decodeY(event.params.amountsIn)
    const amountOutX = decodeX(event.params.amountsOut)
    const amountOutY = decodeY(event.params.amountsOut)
    const amountXTraded = amountInX.plus(amountOutX)
    const amountYTraded = amountInY.plus(amountOutY)
    log.info("[swapV21] amountIn: [X: {}, Y: {}], amountOut: [X: {}, Y: {}]", [amountInX.toString(), amountOutX.toString(), amountInY.toString(), amountOutY.toString()])
    
    const amount0Traded = isSorted ? amountXTraded : amountYTraded;
    const amount1Traded = isSorted ? amountYTraded : amountXTraded;

    candle.close = price;
    candle.lastBlock = event.block.timestamp.toI32();
    candle.token0TotalAmount = candle.token0TotalAmount.plus(amount0Traded);
    candle.token1TotalAmount = candle.token1TotalAmount.plus(amount1Traded);
    candle.save();
  }
}

export function handleSwapV2(event: SwapV2): void {
  const lbPair = LBPair.load(event.address.toHexString());
  if (!lbPair) {
    return;
  }

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  // init token0/token1 to match with V1Pair's tokens order
  const isSorted = tokenX.id.toLowerCase() < tokenY.id.toLowerCase(); // if true, order of tokens matches V1Pair
  const token0 = isSorted ? tokenX : tokenY;
  const token1 = isSorted ? tokenY : tokenX;

  // price in tokenY
  const priceY = getTokenYPriceOfBin(
    event.params.id,
    lbPair.binStep,
    tokenX,
    tokenY
  );

  // price in tokenX
  const priceX = BIG_DECIMAL_ONE.div(priceY);

  // price in token0
  const price = isSorted ? priceX : priceY;

  const tokens = concat(
    Address.fromString(token0.id),
    Address.fromString(token1.id)
  );
  const timestamp = event.block.timestamp.toI32();

  for (let i = 0; i < candlestickPeriods.length; i++) {
    const timeId = timestamp / candlestickPeriods[i];
    const candleId = concat(
      concat(Bytes.fromI32(timeId), Bytes.fromI32(candlestickPeriods[i])),
      tokens
    ).toHex();

    let candle = Candle.load(candleId);
    if (candle === null) {
      candle = new Candle(candleId);
      candle.time = timestamp - (timestamp % candlestickPeriods[i]); // Round to the nearest time period
      candle.period = candlestickPeriods[i];
      candle.token0 = Address.fromString(token0.id);
      candle.token1 = Address.fromString(token1.id);
      candle.token0TotalAmount = BIG_INT_ZERO;
      candle.token1TotalAmount = BIG_INT_ZERO;
      candle.high = price;
      candle.open = price;
      candle.close = price;
      candle.low = price;
    } else {
      if (price < candle.low) {
        candle.low = price;
      }
      if (price > candle.high) {
        candle.high = price;
      }
    }

    const amountXTraded = event.params.swapForY
      ? getAmountTraded(event.params.amountIn, BIG_INT_ZERO, tokenX.decimals)
      : getAmountTraded(BIG_INT_ZERO, event.params.amountOut, tokenX.decimals);
    const amountYTraded = event.params.swapForY
      ? getAmountTraded(BIG_INT_ZERO, event.params.amountOut, tokenY.decimals)
      : getAmountTraded(event.params.amountIn, BIG_INT_ZERO, tokenY.decimals);

    const amount0Traded = isSorted ? amountXTraded : amountYTraded;
    const amount1Traded = isSorted ? amountYTraded : amountXTraded;

    candle.close = price;
    candle.lastBlock = event.block.timestamp.toI32();
    candle.token0TotalAmount = candle.token0TotalAmount.plus(amount0Traded);
    candle.token1TotalAmount = candle.token1TotalAmount.plus(amount1Traded);
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

  const amount0Traded: BigInt = getAmountTraded(
    event.params.amount0In,
    event.params.amount0Out,
    token0.decimals
  );
  const amount1Traded: BigInt = getAmountTraded(
    event.params.amount1In,
    event.params.amount1Out,
    token1.decimals
  );

  if (amount0Traded.isZero() || amount1Traded.isZero()) {
    return;
  }

  const price = amount0Traded.divDecimal(amount1Traded.toBigDecimal());
  const tokens = concat(
    Address.fromString(token0.id),
    Address.fromString(token1.id)
  );
  const timestamp = event.block.timestamp.toI32();

  for (let i = 0; i < candlestickPeriods.length; i++) {
    const timeId = timestamp / candlestickPeriods[i];
    const candleId = concat(
      concat(Bytes.fromI32(timeId), Bytes.fromI32(candlestickPeriods[i])),
      tokens
    ).toHex();

    let candle = Candle.load(candleId);
    if (candle === null) {
      candle = new Candle(candleId);
      candle.time = timestamp - (timestamp % candlestickPeriods[i]); // Round to the nearest time period
      candle.period = candlestickPeriods[i];
      candle.token0 = Address.fromString(token0.id);
      candle.token1 = Address.fromString(token1.id);
      candle.token0TotalAmount = BIG_INT_ZERO;
      candle.token1TotalAmount = BIG_INT_ZERO;
      candle.high = price;
      candle.open = price;
      candle.close = price;
      candle.low = price;
    } else {
      if (price < candle.low) {
        candle.low = price;
      }
      if (price > candle.high) {
        candle.high = price;
      }
    }

    candle.close = price;
    candle.lastBlock = event.block.timestamp.toI32();
    candle.token0TotalAmount = candle.token0TotalAmount.plus(amount0Traded);
    candle.token1TotalAmount = candle.token1TotalAmount.plus(amount1Traded);
    candle.save();
  }
}


// amountsIn is [amountX, amountY] packed into byte32
// amountX: amounts[0...7], amountY: amounts[8...15]
function decodeX(packedAmounts: Bytes): BigInt {
  const s = packedAmounts.toHexString()
  return BigInt.fromString(s.substr(0,32))
}

function decodeY(packedAmounts: Bytes): BigInt {
  const s = packedAmounts.toHexString()
  return BigInt.fromString(s.substr(32,32))
}