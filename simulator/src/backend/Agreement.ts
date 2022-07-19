import { IAggregatorContract } from "../typechain-types";
import { EnergySource } from "./constants";

class Agreement {
  public readonly value: number;
  public readonly flexibility: number;
  public readonly valuePrice: number;
  public readonly flexibilityPrice: number;
  public readonly energySource: EnergySource;

  constructor() {
    this.value = Math.random() * 100;
    this.flexibility = this.value * Math.random();
    this.valuePrice = Math.random() * 100;
    this.flexibilityPrice = Math.random() * 100;
    this.energySource = EnergySource.Battery;
  }

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

export default Agreement;
