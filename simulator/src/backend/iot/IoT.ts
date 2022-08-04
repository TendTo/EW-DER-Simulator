import { BigNumber, Wallet } from "ethers";
import { AggregatorContract } from "../../typechain-types";
import Agreement from "../Agreement";
import Aggregator from "../Aggregator";
import IIoT from "./IIoT";
import { getLogger, Logger } from "log4js";
import Clock from "../clock";
import { PersonalEvent } from "./events";
import IPCHandler from "../IPCHandler";
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
    this.wallet = new Wallet(sk, this.aggregator.derProvider);
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
      // const tx = await this.contract.registerAgreement(this.agreement.struct);
      // const receipt = await tx.wait();
      this.running = true;
      this.logger.log(`IoT ${this.address} - Agreement registered`);
      // return receipt;
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
    this.logger.debug(`IoT ${this.address} - Produced ${value}`);
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

  // TODO: Should not be public -> private
  public provideFlexibility(
    start: BigNumber,
    stop: BigNumber,
    flexibility: BigNumber
    // event: RequestFlexibilityEvent
  ) {
    // TODO: get the list's length from the contract
    // const value = Math.floor(flexibility.div(await this.contract.prosumerListLength()).toNumber());
    const derFlexibility = flexibility
      .mul(this.agreement.value)
      .div(this.aggregator.baseline)
      .toNumber();
    const value = derFlexibility + this.agreement.value;

    this.logger.log(
      `IoT ${this.wallet.address} - Flexibility event: from ${start} to ${stop} with value ${value} `
      // - BlockNumber: ${event.blockNumber}
    );
    this.flexibilityEvent = new FlexibilityEvent(
      start.toNumber(),
      stop.toNumber(),
      value,
      this.aggregator.clock.timestamp
    );
  }

  protected shouldApplyFlexibility(timestamp: number) {
    if (!this.flexibilityEvent || this.flexibilityEvent.hasEnded(timestamp)) return false;
    if (this.flexibilityEvent.shouldProvideFlexibility(timestamp)) {
      // this.contract
      //   .provideFlexibilityFair(this.flexibilityEvent.start, this.flexibilityEvent.flexibility)
      //   .then(() => (this.flexibilityEvent.isActive = true))
      //   .catch((e) => this.logger.error(`IoT ${this.address} - Error providing flexibility`, e));
      this.flexibilityEvent.provideMessageSent = true;
      this.flexibilityEvent.isActive = true;
      this.aggregator.tracker.addIoT(
        this.address,
        this.flexibilityEvent.flexibility,
        this.agreement.value
      );
    }
    this.logger.log(
      `IoT ${this.address} - Current timestamp: ${timestamp} - Flexibility starts at ${this.flexibilityEvent.start}`
    );
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

  get value() {
    return this.running ? this.agreement.value : 0;
  }
}

export default IoT;
