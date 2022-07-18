import { IAggregator } from "../../typechain-types";

class Agreement {
  private value: number;
  private flexibility: number;

  constructor() {
    this.value = Math.random() * 100;
    this.flexibility = this.value * Math.random();
  }

  get struct(): IAggregator.AgreementStruct {
    return { value: this.value, flexibility: this.flexibility };
  }
}

export default Agreement;
