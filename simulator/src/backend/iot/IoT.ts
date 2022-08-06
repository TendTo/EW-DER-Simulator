import { BigNumber, Wallet } from "ethers";
import { AggregatorContract } from "../../typechain-types";
import Agreement from "../Agreement";
import Aggregator from "../Aggregator";
import IIoT from "./IIoT";
import { getLogger, Logger } from "log4js";
import Clock from "../clock";
import { PersonalEvent } from "./events";
import FlexibilityEvent from "./events/FlexibilityEvent";
import { NodeErrors } from "../constants";
import IPCHandler from "../IPCHandler";
import {
  EndRequestFlexibilityEvent,
  RequestFlexibilityEvent,
} from "src/typechain-types/AggregatorContract";

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
    this.contract
      .registerAgreement(this.agreement.struct)
      .then((tx) =>
        tx
          .wait()
          .then(() => {
            this.logger.log(`IoT ${this.address} - Agreement registered`);
          })
          .catch((e) => {
            IPCHandler.sendToast(`IoT ${this.address} - Error registering agreement`, "error");
            this.logger.error(`${this.address} - Registering agreement`, e);
          })
      )
      .catch((e) => {
        if (e.code === NodeErrors.UNPREDICTABLE_GAS_LIMIT) {
          IPCHandler.sendToast(
            `IoT ${this.address} - Unpredictable gas limit at agreement`,
            "warning"
          );
          this.logger.warn(`${this.address} - Registering agreement 2`, e);
        }
        IPCHandler.sendToast(`IoT ${this.address} - Error registering agreement`, "error");
        this.logger.warn(`${this.address} - Registering agreement`, e);
      });
  }

  public agreementStatus(registered: boolean) {
    this.running = registered;
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

    this.aggregator.onIoTReading(this, value);
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
    this.contract.on(
      this.contract.filters.EndRequestFlexibility(),
      (start: BigNumber, stop: BigNumber, _: BigNumber, __: EndRequestFlexibilityEvent) => {
        if (
          this.flexibilityEvent &&
          this.flexibilityEvent.start === start.toNumber() &&
          this.flexibilityEvent.stop === stop.toNumber()
        )
          this.flexibilityEvent.isConfirmed = true;
      }
    );
  }

  private provideFlexibility(
    start: BigNumber,
    stop: BigNumber,
    flexibility: BigNumber,
    event: RequestFlexibilityEvent
  ) {
    if (event.blockNumber < this.aggregator.blockNumber) return;
    // TODO: get the list's length from the contract
    // const value = Math.floor(flexibility.div(await this.contract.prosumerListLength()).toNumber());
    const baseline = this.aggregator.baseline;
    const derFlexibility = flexibility
      .sub(baseline)
      .mul(this.agreement.value)
      .div(baseline)
      .toNumber();
    const value = derFlexibility + this.agreement.value;

    this.logger.log(
      `IoT ${this.wallet.address} - Flexibility event: from ${start} to ${stop} with value ${value} - BlockNumber: ${event.blockNumber}`
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
    if (this.flexibilityEvent.hasStarted(timestamp)) return true;
    if (this.flexibilityEvent.isConfirmed) {
      this.contract
        .provideFlexibilityFair(this.flexibilityEvent.start, this.flexibilityEvent.flexibility)
        .then(() => this.logger.info(`IoT ${this.address} - Flexibility provided`))
        .catch((e) => this.logger.error(`IoT ${this.address} - Error providing flexibility`, e));
      this.flexibilityEvent = null;
    }
    return false;
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
    return this.agreement.value;
  }

  get production() {
    return this.running ? this.agreement.value : 0;
  }

  get expectedFlexibility() {
    return (this.aggregator.gridFlexibility * this.agreement.value) / this.aggregator.baseline;
  }
}

export default IoT;
