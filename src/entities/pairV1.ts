import { Address, log } from "@graphprotocol/graph-ts";
import { Pair as PairV1 } from "../../generated/schema";
import { Pair as PairContract } from "../../generated/Pair/Pair";
import { loadToken } from "./token";

export function loadV1Pair(address: Address): PairV1 | null {
  let v1Pair = PairV1.load(address.toHexString());

  if (!v1Pair) {
    const pair = PairContract.bind(address);

    // get token0
    const token0Result = pair.try_token0();
    if (token0Result.reverted) {
      log.info("[loadV1Pair] try_token0 reverted", []);
      return null;
    }

    // get token1
    const token1Result = pair.try_token1();
    if (token1Result.reverted) {
      log.info("[loadV1Pair] try_token1 reverted", []);
      return null;
    }

    // create Tokens
    const token0 = loadToken(token0Result.value);
    const token1 = loadToken(token1Result.value);

    // create PairV1
    v1Pair = new PairV1(address.toHexString());
    v1Pair.token0 = token0.id;
    v1Pair.token1 = token1.id;
    v1Pair.save();
  }

  return v1Pair as PairV1;
}
