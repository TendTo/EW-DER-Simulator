import { Agreement } from "..";
import Aggregator from "../Aggregator";
import { EnergySource } from "../constants";
import { generatePoisson } from "../utils";
import { MeteoEvent, PersonalEvent } from "./events";
import IoT from "./IoT";

export default class WindIoT extends IoT {
  static meteoEvent: MeteoEvent;
  public constructor(aggregator: Aggregator, sk: string) {
    super(aggregator, sk);
    this.logger.debug(`${this.wallet.address} - Created WindIoT`);
  }

  /**
   * Simulate the production of energy of a solar panel in the given timestamp
   * @param timestamp time in seconds since the epoch
   * @returns energy produced in watt
   */
  protected produce(timestamp: number): number {
    return this.agreement.value;
    return Math.random() * this.agreement.value + this.agreement.value / 2;
  }

  protected skipTick(): boolean {
    return false;
  }

  protected createAgreement(): Agreement {
    const value = Math.floor(generatePoisson(2) * (this.maxValue - this.minValue)) + this.minValue;
    const flexibility = Math.floor(value * 0.25);
    const valueCost = Math.floor(Math.random() * this.maxCost + this.minCost);
    const flexibilityCost = Math.floor(valueCost * 1.1);
    return new Agreement(value, flexibility, valueCost, flexibilityCost, EnergySource.Wind);
  }

  protected applyFlexibilityEvent(value: number, timestamp: number): number {
    const flexibilityEnergy = this.flexibilityEvent.flexibility;
    const newValue = flexibilityEnergy;
    //  Math.random() * averageEnergy + averageEnergy / 2;

    this.logger.debug(`${this.wallet.address} - Flexibility: ${value} -> ${newValue}`);
    return newValue;
  }

  protected applyEvents(value: number, timestamp: number): number {
    if (this.personalEvent) {
      const newValue = value + this.personalEvent.intensity;
      this.logger.debug(`${this.wallet.address} - Personal event: ${value} -> ${newValue}`);
      if (this.personalEvent.hasEnded(timestamp)) this.personalEvent = null;
      return newValue;
    }
    if (WindIoT.meteoEvent) {
      const newValue = value + WindIoT.meteoEvent.intensity;
      this.logger.debug(`${this.wallet.address} - Wind event: ${value} -> ${newValue}`);
      if (WindIoT.meteoEvent.hasEnded(timestamp)) WindIoT.meteoEvent = null;
      return newValue;
    }
    return value;
  }

  protected rollForEvents(timestamp: number): void {
    if (!this.personalEvent) {
      this.personalEvent = PersonalEvent.rollForEvent(timestamp);
      if (this.personalEvent) this.logger.log(`${this.wallet.address} - New Personal event`);
    }
    if (!WindIoT.meteoEvent) {
      WindIoT.meteoEvent = MeteoEvent.rollForEvent(timestamp);
      if (WindIoT.meteoEvent) this.logger.log(`${this.wallet.address} - New WindIoT event`);
    }
  }

  protected get minValue(): number {
    return 10;
  }
  protected get maxValue(): number {
    return 100;
  }
  protected get minCost(): number {
    return 0.1;
  }
  protected get maxCost(): number {
    return 5;
  }
}
