import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { Token } from "../../generated/schema";

/**
 * Returns the price of the bin given its id and bin step
 * (1 + binStep / 10_000) ** (id - 8388608)
 *
 * @param { BigInt } binId
 * @param { BigInt } binStep
 * @param { Token } tokenX
 * @param { Token } tokenY
 */
export function getTokenYPriceOfBin(
  binId: BigInt,
  binStep: BigInt,
  tokenX: Token,
  tokenY: Token
): BigDecimal {
  const BASIS_POINT_MAX = new BigDecimal(BigInt.fromI32(10_000));
  const BIN_STEP = new BigDecimal(binStep);
  const REAL_SHIFT = 8388608;
  const BIG_DECIMAL_ONE = BigDecimal.fromString("1");

  // compute bpVal = (1 + binStep / 10_000)
  const bpVal = BIG_DECIMAL_ONE.plus(BIN_STEP.div(BASIS_POINT_MAX));

  // compute bpVal ** (id - 8388608)
  const loop = binId.toI32() - REAL_SHIFT;
  const isPositive = loop > 0;

  let result = BIG_DECIMAL_ONE;

  for (let i = 0; i < Math.abs(loop); i++) {
    if (isPositive) {
      result = result.times(bpVal);
    } else {
      result = result.div(bpVal);
    }
  }

  // get price in terms of tokenY
  const tokenYDecimals = BigDecimal.fromString(`1e${tokenY.decimals.toI32()}`);
  const tokenXDecimals = BigDecimal.fromString(`1e${tokenX.decimals.toI32()}`);

  return result.times(tokenXDecimals).div(tokenYDecimals);
}

/**
 * Returns the total amount traded in 18 decimals precision
 *
 * @param { BigInt } amountIn
 * @param { BigInt } amountOut
 * @param { BigInt } decimals
 * @returns { BigInt }
 */
export function getAmountTraded(
  amountIn: BigInt,
  amountOut: BigInt,
  tokenDecimals: BigInt
): BigInt {
  const exponent = BigInt.fromI32(18).minus(tokenDecimals);
  if (exponent >= BigInt.fromI32(0)) {
    const multiplier = BigInt.fromString(
      BigDecimal.fromString("1e" + exponent.toString()).toString()
    );
    return amountIn
      .minus(amountOut)
      .abs()
      .times(multiplier);
  } else {
    const divider = BigInt.fromString(
      BigDecimal.fromString(
        "1e" + exponent.times(BigInt.fromI32(-1)).toString()
      ).toString()
    );
    return amountIn
      .minus(amountOut)
      .abs()
      .div(divider);
  }
}
