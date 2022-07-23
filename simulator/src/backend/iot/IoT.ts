import { Wallet } from "ethers";
import { AggregatorContract } from "../../typechain-types";
import Agreement from "../Agreement";
import Aggregator from "../Aggregator";
import { Season } from "../constants";
import IIoT from "./IIoT";
import ITickable from "../ITickable";
import { getLogger, Logger } from "log4js";

abstract class IoT implements IIoT, ITickable {
  protected agreement: Agreement;
  protected contract: AggregatorContract;
  protected wallet: Wallet;
  protected running: boolean;
  protected readonly logger: Logger;

  protected constructor(protected aggregator: Aggregator, sk: string) {
    this.logger = getLogger("iot");
    this.running = false;
    this.wallet = new Wallet(sk, this.aggregator.provider);
    this.agreement = this.createAgreement();
    this.contract = aggregator.contract.connect(this.wallet);
    this.logger.debug(`IoT ${this.wallet.address} - Created`);
  }

  public registerAgreement() {
    return this.contract.registerAgreement(this.agreement.struct);
  }

  public async startProducing() {
    this.logger.debug(`IoT ${this.address} - Start producing`);
    this.running = true;
  }

  public async onTick(season: Season, day: number, hour: number) {
    if (!this.running || this.wait()) return;
    this.logger.debug(`IoT ${this.address} - Producing...`);
    const value = this.produce(season, day, hour);
    this.aggregator.onIoTReading(this.address, value);
  }

  public stopProducing() {
    this.running = false;
    this.logger.debug(`IoT ${this.address} - Stopped`);
  }

  public listenToEvents() {
    const filter = this.contract.filters.RequestFlexibility();
    this.contract.on(filter, this.provideFlexibility.bind(this));
  }

  protected abstract provideFlexibility(event: any): void;
  protected abstract produce(season: Season, day: number, hour: number): number;
  protected abstract wait(): boolean;
  protected abstract createAgreement(): Agreement;

  protected abstract get maxValue(): number;
  protected abstract get minCost(): number;
  protected abstract get maxCost(): number;

  get address() {
    return this.wallet.address;
  }
}

export default IoT;

/**
 * Check if the difference between two values is below a certain percentage
 * @param value1 first value
 * @param value2 second value
 * @param percentage the percentage of difference
 * @returns true if the difference is below the percentage
 */
function checkErrorMargin(value1: number, value2: number, margin: number) {
  return Math.abs(value1 - value2) / value1 < margin;
}
