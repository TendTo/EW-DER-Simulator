import { IAggregatorContract } from "../typechain-types";
import { EnergySource } from "./constants";

/**
 * Agreement between the aggregator and the IoT device that represents a prosumer.
 * It determines the energy source that the prosumer is willing to use, the baseline and the flexibility
 * the prosumer in able to provide.
 */
export default class Agreement {
  constructor(
    public readonly value: number,
    public readonly flexibility: number,
    public readonly valuePrice: number,
    public readonly flexibilityPrice: number,
    public readonly energySource: EnergySource
  ) {}

  get struct(): IAggregatorContract.AgreementStruct {
    return {
      value: this.value,
      valuePrice: this.valuePrice,
      flexibility: this.flexibility,
      flexibilityPrice: this.flexibilityPrice,
      energySource: this.energySource,
    };
  }
}
