import { AgreementStructFrontend } from "src/module";
import { IAggregatorContract } from "src/typechain-types";

/**
 * Generate a random number with a Poisson distribution.
 * @param lambda constant for the Poisson distribution
 * @returns new random number with a Poisson distribution
 */
export function generatePoisson(lambda: number): number {
  let x = 0;
  let p = Math.exp(-lambda);
  let s = p;
  let u = Math.random();
  while (u > s) {
    x++;
    p *= lambda / x;
    s += p;
  }
  return x;
}

/**
 * Wait for a given number of milliseconds.
 * @param ms time in milliseconds
 * @returns a promise that resolves after the given time
 */
export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Parse the agreement struct received from the smart contract
 * in a serializable javascript object
 * @param param0 struct received from the smart contract
 * @returns parsed object
 */
export function parseAgreementLog({
  flexibility,
  flexibilityPrice,
  energySource,
  valuePrice,
  value,
}: IAggregatorContract.AgreementStructOutput): AgreementStructFrontend {
  return {
    flexibility: flexibility.toString(),
    flexibilityPrice: flexibilityPrice.toString(),
    energySource: energySource.toString(),
    valuePrice: valuePrice.toString(),
    value: value.toString(),
  };
}
