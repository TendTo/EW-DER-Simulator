import { Agreement } from "..";
import Aggregator from "../Aggregator";
import { EnergySource, Season } from "../constants";
import { generatePoisson } from "../utils";
import IoT from "./IoT";

export default class SolarIoT extends IoT {
  public constructor(aggregator: Aggregator, sk: string) {
    super(aggregator, sk);
    this.logger.debug(`IoT ${this.wallet.address} - Created SolarIoT`);
  }

  protected provideFlexibility(event: any): void {
    throw new Error("Method not implemented.");
  }

  /**
   * Simulate the production of energy of a solar panel in the given season,
   * day and hour with a sinusoidal function
   * @param season season of the year
   * @param _ day of the season
   * @param hour hour of the day
   * @returns energy produced in watt
   */
  protected produce(season: Season, _: number, hour: number): number {
    return (
      this.agreement.value * 0.01 * Math.sin(2 * Math.PI * (hour / 24) - Math.PI / 2) +
      this.agreement.value
    );
  }

  protected wait(): boolean {
    return false;
  }

  protected createAgreement(): Agreement {
    const value = Math.floor(generatePoisson(2) * this.maxValue);
    const flexibility = Math.floor(value * 0.25);
    const valueCost = Math.floor(Math.random() * this.maxCost + this.minCost);
    const flexibilityCost = Math.floor(valueCost * 1.1);
    return new Agreement(value, flexibility, valueCost, flexibilityCost, EnergySource.Solar);
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
