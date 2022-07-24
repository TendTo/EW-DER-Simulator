import { BigNumber, Wallet } from "ethers";
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
  }

  private async registerAgreement() {
    if (this.running) return;
    try {
      if ((await this.wallet.getBalance()).lt(BigNumber.from(1000)))
        this.logger.warn(`IoT ${this.address} - Low Balance`);
      const tx = await this.contract.registerAgreement(this.agreement.struct);
      const receipt = await tx.wait();
      this.running = true;
      this.logger.log(`IoT ${this.address} - Agreement registered`);
      return receipt;
    } catch (e) {
      this.logger.error(`IoT ${this.address} - Error registering agreement`);
      this.logger.error(`IoT ${this.address} - ${e}`);
    }
  }

  public async startProducing() {
    this.logger.debug(`IoT ${this.address} - Start producing`);
    this.registerAgreement();
  }

  public async onTick(season: Season, day: number, hour: number) {
    if (!this.running || this.wait()) return;
    let value = this.produce(season, day, hour);

    this.aggregator.onIoTReading(this.address, value);
    this.logger.debug(`IoT ${this.address} - Produced ${value}`);
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
