import { Agreement } from "..";
import Aggregator from "../Aggregator";
import { EnergySource } from "../constants";
import { generatePoisson } from "../utils";
import { MeteoEvent, PersonalEvent } from "./events";
import IoT from "./IoT";

export default class SolarIoT extends IoT {
  private static meteoEvent: MeteoEvent;

  public constructor(aggregator: Aggregator, sk: string) {
    super(aggregator, sk);
    this.logger.debug(`${this.wallet.address} - Created SolarIoT`);
  }

  /**
   * Simulate the production of energy of a solar panel in the given timestamp
   * @param timestamp time in seconds since the epoch
   * @returns energy produced in watt
   */
  protected produce(timestamp: number): number {
    return this.agreement.value;
    return (
      this.agreement.value * 0.1 * Math.sin((Math.PI * (timestamp - 21600)) / 43200) +
      this.agreement.value
    );
  }

  protected skipTick(): boolean {
    return false;
  }

  protected createAgreement(): Agreement {
    const value = Math.floor(generatePoisson(2) * (this.maxValue - this.minValue) + this.minValue);
    const flexibility = Math.floor(value * 0.25);
    const valueCost = Math.floor(Math.random() * this.maxCost + this.minCost);
    const flexibilityCost = Math.floor(valueCost * 1.1);
    return new Agreement(value, flexibility, valueCost, flexibilityCost, EnergySource.Solar);
  }

  protected applyFlexibilityEvent(value: number, timestamp: number): number {
    const flexibilityValue = this.flexibilityEvent.flexibility;
    const newValue = flexibilityValue;
    // flexibilityValue * 0.1 * Math.sin((Math.PI * (timestamp - 21600)) / 43200) + flexibilityValue;

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
    if (SolarIoT.meteoEvent) {
      const newValue = value + SolarIoT.meteoEvent.intensity;
      this.logger.debug(`${this.wallet.address} - Solar event: ${value} -> ${newValue}`);
      if (SolarIoT.meteoEvent.hasEnded(timestamp)) SolarIoT.meteoEvent = null;
      return newValue;
    }
    return value;
  }

  protected rollForEvents(timestamp: number): void {
    if (!this.personalEvent) {
      this.personalEvent = PersonalEvent.rollForEvent(timestamp);
      if (this.personalEvent) this.logger.log(`${this.wallet.address} - New Personal event`);
    }
    if (!SolarIoT.meteoEvent) {
      SolarIoT.meteoEvent = MeteoEvent.rollForEvent(timestamp);
      if (SolarIoT.meteoEvent) this.logger.log(`${this.wallet.address} - New SolarIoT event`);
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
