import { AgreementLogRow } from "src/frontend/types";
import {
  CancelAgreementEvent,
  RegisterAgreementEvent,
  ReviseAgreementEvent,
} from "src/typechain-types/AggregatorContract";
import { IAggregatorContract } from "../typechain-types";

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
export function parseAgreementLog(
  {
    flexibility,
    flexibilityPrice,
    energySource,
    valuePrice,
    value,
  }: IAggregatorContract.AgreementStructOutput,
  event: CancelAgreementEvent | RegisterAgreementEvent | ReviseAgreementEvent
): Omit<AgreementLogRow, "address" | "className"> {
  return {
    flexibility: flexibility.toString(),
    flexibilityPrice: flexibilityPrice.toString(),
    energySource: energySource,
    valuePrice: valuePrice.toString(),
    value: value.toString(),
    blockNumber: event.blockNumber,
  };
}

/**
 * Check if the difference between two numbers is less than a given threshold (in %)
 * @param value1 first value to compare
 * @param value2 second value to compare
 * @param percentage allowed difference between the two values in percent
 * @returns whether the two values are close enough
 */
export function inErrorMargin(value1: number, value2: number, percentage: number): boolean {
  return (Math.abs(value1 - value2) * 100) / value1 <= percentage;
}

/**
 * Execute a promise that takes in input an array by splitting it into chunks of a given size
 * and executing the promise for each chunk sequentially.
 * @param callback promise that takes in input an array of values
 * @param array input array
 * @param chunkSize the size of the chunks to split the array into
 * @returns result of the last callback called on the last chunk
 */
export function arrayPromiseSplitter<A, R>(
  callback: (arr: A[]) => Promise<R>,
  array: A[],
  chunkSize: number = 100000
): Promise<R> {
  // Split the array in subarray of 300 elements and send the chunks to the callback sequentially
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  // Call all the callback functions sequentially
  return chunks.reduce(async (promise, chunk) => {
    try {
      const tx = await promise;
      if (tx && "wait" in tx) await tx.wait();
    } catch (e) {
      console.error(e);
    }
    return callback(chunk);
  }, Promise.resolve());
}
