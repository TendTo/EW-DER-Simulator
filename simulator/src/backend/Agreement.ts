import { IAggregatorContract } from "../typechain-types";
import { EnergySource } from "./constants";

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
