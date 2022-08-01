import { BigNumber, Wallet } from "ethers";
import { AggregatorContract } from "../../typechain-types";
import Agreement from "../Agreement";
import Aggregator from "../Aggregator";
import IIoT from "./IIoT";
import { getLogger, Logger } from "log4js";
import Clock from "../clock";
import { PersonalEvent } from "./events";
import IPCHandler from "../IPCHandler";
import { TypedListener } from "src/typechain-types/common";
import { RequestFlexibilityEvent } from "src/typechain-types/AggregatorContract";
import FlexibilityEvent from "./events/FlexibilityEvent";

abstract class IoT implements IIoT {
  public readonly agreement: Agreement;
  protected contract: AggregatorContract;
  protected wallet: Wallet;
  protected running: boolean;
  protected readonly logger: Logger;
  protected personalEvent: PersonalEvent;
  protected flexibilityEvent: FlexibilityEvent;

  protected constructor(protected aggregator: Aggregator, sk: string) {
    this.logger = getLogger("iot");
    this.running = false;
    this.wallet = new Wallet(sk, this.aggregator.provider);
    this.agreement = this.createAgreement();
    this.contract = aggregator.contract.connect(this.wallet);
    this.aggregator.clock.addFunction(this.onTick);
    this.listenToEvents();
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

  onTick = async (clock: Clock, timestamp: number) => {
    if (!this.running || this.skipTick()) return;

    this.rollForEvents(timestamp);

    let value = this.produce(timestamp);
    if (this.shouldApplyFlexibility(timestamp))
      value = this.applyFlexibilityEvent(value, timestamp);
    value = this.applyEvents(value, timestamp);

    this.aggregator.onIoTReading(this.address, value);
    this.logger.debug(`IoT ${this.address} - Produced ${value} - Time ${clock.ISO}`);
  };

  public stopProducing(sendLog: boolean) {
    this.running = false;
    this.aggregator.clock.removeFunction(this.onTick);
    if (sendLog) this.contract.cancelAgreement();
    this.contract.removeAllListeners();
    this.logger.debug(`IoT ${this.address} - Stopped`);
  }

  public listenToEvents() {
    const filter = this.contract.filters.RequestFlexibility();
    this.contract.on(filter, this.provideFlexibility.bind(this));
  }

  protected provideFlexibility(
    start: BigNumber,
    stop: BigNumber,
    flexibility: BigNumber,
    event: RequestFlexibilityEvent
  ) {
    // TODO: get the list's length from the contract
    // const value = Math.floor(flexibility.div(await this.contract.prosumerListLength()).toNumber());
    const value = Math.floor(flexibility.div(this.aggregator.iotLength).toNumber());
    this.logger.log(
      `IoT ${this.wallet.address} - Flexibility event: from ${start} to ${stop} with value ${value}`
    );
    this.flexibilityEvent = new FlexibilityEvent(
      start.toNumber(),
      stop.toNumber(),
      value,
      this.aggregator.clock.timestamp
    );
  }

  protected shouldApplyFlexibility(timestamp: number) {
    this.logger.warn(`IoT ${this.address} - timestamp: ${timestamp} - ${JSON.stringify(this.flexibilityEvent)}`);
    if (!this.flexibilityEvent || this.flexibilityEvent.hasEnded(timestamp)) return false;
    if (this.flexibilityEvent.shouldProvideFlexibility(timestamp)) {
      this.contract
        .provideFlexibilityFair(this.flexibilityEvent.start, this.flexibilityEvent.gridFlexibility)
        .then(() => (this.flexibilityEvent.isActive = true))
        .catch(e => this.logger.error(`IoT ${this.address} - Error providing flexibility`, e));
      this.flexibilityEvent.provideMessageSent = true;
    }
    if (!this.flexibilityEvent.isActive) return false;
    return true;
  }

  protected abstract produce(timestamp: number): number;
  protected abstract skipTick(): boolean;
  protected abstract createAgreement(): Agreement;
  protected abstract applyFlexibilityEvent(value: number, timestamp: number): number;
  protected abstract applyEvents(value: number, timestamp: number): number;
  protected abstract rollForEvents(timestamp: number): void;

  protected abstract get minValue(): number;
  protected abstract get maxValue(): number;
  protected abstract get minCost(): number;
  protected abstract get maxCost(): number;

  get address() {
    return this.wallet.address;
  }
}

export default IoT;
