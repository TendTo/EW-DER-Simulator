import { Agreement } from "..";
import Aggregator from "../Aggregator";
import { EnergySource, Season } from "../constants";
import { generatePoisson } from "../utils";
import { MeteoEvent, PersonalEvent } from "./events";
import IoT from "./IoT";

export default class SolarIoT extends IoT {
  private static meteoEvent: MeteoEvent;

  public constructor(aggregator: Aggregator, sk: string) {
    super(aggregator, sk);
    this.logger.debug(`IoT ${this.wallet.address} - Created SolarIoT`);
  }

  protected provideFlexibility(event: any): void {
    throw new Error("Method not implemented.");
  }

  /**
   * Simulate the production of energy of a solar panel in the given timestamp
   * @param timestamp time in seconds since the epoch
   * @returns energy produced in watt
   */
  protected produce(timestamp: number): number {
    return (
      this.agreement.value * 0.1 * Math.sin((Math.PI * (timestamp - 21600)) / 43200) +
      this.agreement.value
    );
  }

  protected skipTick(): boolean {
    return false;
  }

  protected createAgreement(): Agreement {
    const value = Math.floor(generatePoisson(2) * this.maxValue);
    const flexibility = Math.floor(value * 0.25);
    const valueCost = Math.floor(Math.random() * this.maxCost + this.minCost);
    const flexibilityCost = Math.floor(valueCost * 1.1);
    return new Agreement(value, flexibility, valueCost, flexibilityCost, EnergySource.Solar);
  }

  protected applyEvents(value: number, timestamp: number): number {
    if (this.personalEvent) {
      const newValue = value + this.personalEvent.intensity;
      this.logger.log(`IoT ${this.wallet.address} - Personal event: ${value} -> ${newValue}`);
      if (this.personalEvent.hasEnded(timestamp)) this.personalEvent = null;
      return newValue;
    }
    if (SolarIoT.meteoEvent) {
      const newValue = value + SolarIoT.meteoEvent.intensity;
      this.logger.log(`IoT ${this.wallet.address} - Solar event: ${value} -> ${newValue}`);
      if (SolarIoT.meteoEvent.hasEnded(timestamp)) SolarIoT.meteoEvent = null;
      return newValue;
    }
    return value;
  }

  protected rollForEvents(timestamp: number): void {
    if (!this.personalEvent) this.personalEvent = PersonalEvent.rollForEvent(timestamp);
    if (!SolarIoT.meteoEvent) SolarIoT.meteoEvent = MeteoEvent.rollForEvent(timestamp);
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
