import { BigNumber, Wallet } from "ethers";
import { AggregatorContract } from "../../typechain-types";
import Agreement from "../Agreement";
import Aggregator from "../Aggregator";
import IIoT from "./IIoT";
import { getLogger, Logger } from "log4js";
import Clock from "../clock";
import { PersonalEvent } from "./events";
import IPCHandler from "../IPCHandler";

abstract class IoT implements IIoT {
  protected agreement: Agreement;
  protected contract: AggregatorContract;
  protected wallet: Wallet;
  protected running: boolean;
  protected readonly logger: Logger;
  protected personalEvent: PersonalEvent;

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
      IPCHandler.sendToast(`IoT ${this.address} - Error registering agreement`, "error");
      this.logger.error(`IoT ${this.address} - Error registering agreement`);
      this.logger.error(`IoT ${this.address} - ${e}`);
    }
  }

  public async startProducing() {
    this.logger.debug(`IoT ${this.address} - Start producing`);
    this.registerAgreement();
  }

  public async onTick(clock: Clock, timestamp: number) {
    if (!this.running || this.skipTick()) return;

    this.rollForEvents(timestamp);
    let value = this.produce(timestamp);
    value = this.applyEvents(value, timestamp);

    this.aggregator.onIoTReading(this.address, value);
    this.logger.debug(`IoT ${this.address} - Produced ${value} - Time ${clock.ISO}`);
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
  protected abstract produce(timestamp: number): number;
  protected abstract skipTick(): boolean;
  protected abstract createAgreement(): Agreement;
  protected abstract applyEvents(value: number, timestamp: number): number;
  protected abstract rollForEvents(timestamp: number): void;

  protected abstract get maxValue(): number;
  protected abstract get minCost(): number;
  protected abstract get maxCost(): number;

  get address() {
    return this.wallet.address;
  }
}

export default IoT;
