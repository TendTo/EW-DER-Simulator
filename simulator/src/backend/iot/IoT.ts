import { BigNumber, providers, Wallet } from "ethers";
import { AggregatorContract } from "../../typechain-types";
import Agreement from "../Agreement";
import Aggregator from "../Aggregator";
import IIoT from "./IIoT";
import { getLogger, Logger } from "log4js";
import Clock from "../clock";
import { PersonalEvent, FlexibilityEvent } from "./events";
import { NodeErrors } from "../constants";
import IPCHandler from "../IPCHandler";
import type {
  EndRequestFlexibilityEvent,
  RequestFlexibilityEvent,
} from "src/typechain-types/AggregatorContract";

/**
 * IoT device that represents a prosumer.
 * Each IoT receives a key pair and an address, so it is able to interact with the smart contract.
 * The readings it produces are instead sent directly to the aggregator.
 */
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
    this.wallet = new Wallet(sk, new providers.JsonRpcProvider(aggregator.derRpcUrl));
    this.agreement = this.createAgreement();
    this.contract = aggregator.contract.connect(this.wallet);
    this.aggregator.clock.addFunction(this.onTick);
  }
  /**
   * Register the agreement with the smart contract using the {@link AggregatorContract.registerAgreement} function.
   */
  private async registerAgreement() {
    if (this.running) return;
    // Register the new agreement
    this.contract
      .registerAgreement(this.agreement.struct)
      .then(() => this.logger.log(`${this.address} - Agreement Sent`))
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
  /**
   * When a new agreement has been registered or cancelled, the aggregator will receive the event and change the state of the IoT accordingly.
   * @param registered whether the agreement has been registered and the {@link Aggregator.onRegisterAgreement} function has been called.
   */
  public agreementStatus(registered: boolean) {
    this.running = registered;
  }
  /**
   * Start the simulation by registering all the listeners to the smart contract's events
   * and registering a new agreement with the smart contract.
   */
  public async startProducing() {
    this.logger.debug(`${this.address} - Start producing`);
    this.listenToEvents();
    this.registerAgreement();
  }
  /**
   * Called by the {@link Clock} when a new tick has been reached.
   * Calculate the value to send to the {@link Aggregator} by evaluating all the functions:
   * - {@link IoT.produce}
   * - {@link IoT.applyFlexibilityEvent} (if a flexibility event is active)
   * - {@link IoT.applyEvents} (if any events are active)
   * Finally, send the value to the {@link Aggregator}.
   * @param clock clock that is calling the function
   * @param timestamp current timestamp as provided by the clock
   */
  onTick = async (clock: Clock, timestamp: number) => {
    if (!this.running || this.skipTick()) return;
    // Calculate the possibility to add an event that will be applied
    // and alter the value for a certain duration
    this.rollForEvents(timestamp);
    // Produce a value and then apply all the possible transformations through events
    let value = this.produce(timestamp);
    if (this.shouldApplyFlexibility(timestamp))
      value = this.applyFlexibilityEvent(value, timestamp);
    value = this.applyEvents(value, timestamp);
    // Send the value to the aggregator
    this.aggregator.onIoTReading(this, value);
    this.logger.debug(`${this.address} - Produced ${value}`);
  };
  /**
   * Stop the IoT from being active and producing readings at each tick.
   * @param cancelAgreement whether to cancel the agreement when stopping the production
   */
  public stopProducing(cancelAgreement: boolean) {
    this.running = false;
    this.aggregator.clock.removeFunction(this.onTick);
    if (cancelAgreement) this.contract.cancelAgreement();
    this.contract.removeAllListeners();
    this.logger.debug(`${this.address} - Stopped`);
  }
  /**
   * Called by a EndRequestFlexibility event from the smart contract.
   * Call the {@link AggregatorContract.provideFlexibilityFair} function to check if the flexibility values
   * provided by the aggregator and the one provided by the IoT are equal, and if so, the reward the IoT and emit
   * the corresponding event.
   * @param start start timestamp of the flexibility event
   * @param stop stop timestamp of the flexibility event
   * @param _ grid flexibility requested with the flexibility event
   * @param event blockchain info about the event
   */
  protected confirmProvidedFlexibility(
    start: BigNumber,
    stop: BigNumber,
    _: BigNumber,
    event: EndRequestFlexibilityEvent
  ) {
    this.logger.log(
      `${this.address} -
      Flexibility event ended - Start: ${start.toString()}
      Local Flexibility event - Start: ${this.flexibilityEvent ? this.flexibilityEvent.start : 0}
      BlockNumber: ${event.blockNumber}`
    );
    if (this.flexibilityEvent && this.flexibilityEvent.start === start.toNumber()) {
      this.logger.log(`${this.address} - Sending 'provideFlexibilityFair'`);
      this.contract
        .provideFlexibilityFair(this.flexibilityEvent.start, this.flexibilityEvent.flexibility)
        .then(() => this.logger.log(`${this.address} - Flexibility provided`))
        .catch((e) => this.logger.error(`${this.address} - Error providing flexibility`, e));
      this.flexibilityEvent = null;
    }
  }
  /**
   * Called by a RequestFlexibility event from the smart contract.
   * Create a new {@link FlexibilityEvent} that will be applied to the value produced by the IoT for its duration
   * @param start start timestamp of the flexibility event
   * @param stop stop timestamp of the flexibility event
   * @param flexibility grid flexibility requested with the flexibility event
   * @param event blockchain info about the event
   */
  protected provideFlexibility(
    start: BigNumber,
    stop: BigNumber,
    flexibility: BigNumber,
    event: RequestFlexibilityEvent
  ) {
    if (event.blockNumber < this.aggregator.blockNumber) return;
    const baseline = this.aggregator.baseline;
    // Calculate the flexibility this IoT should provide, so that it is proportional to its contribution to the baseline
    const derFlexibility = flexibility
      .sub(baseline)
      .mul(this.agreement.value)
      .div(baseline)
      .toNumber();
    const value = derFlexibility + this.agreement.value;

    this.logger.log(
      `${this.wallet.address} - Flexibility event: from ${start} to ${stop} with value ${value} - BlockNumber: ${event.blockNumber}`
    );
    // Create a new flexibility event that will be applied to the value produced by the IoT for its duration
    this.flexibilityEvent = new FlexibilityEvent(
      start.toNumber(),
      stop.toNumber(),
      value,
      this.aggregator.clock.timestamp
    );
  }
  /**
   * Listen the the smart contract's events and register the corresponding functions.
   */
  private listenToEvents() {
    this.logger.debug(`${this.address} - Listening to events`);
    this.contract.removeAllListeners();
    this.contract.on(
      this.contract.filters.RequestFlexibility(),
      this.provideFlexibility.bind(this)
    );
    this.contract.on(
      this.contract.filters.EndRequestFlexibility(),
      this.confirmProvidedFlexibility.bind(this)
    );
  }
  /**
   * Check if the flexibility event should be applied for the current tick
   * @param timestamp current timestamp as provided by the {@link Clock}
   * @returns whether the flexibility event should be applied for the current tick
   */
  protected shouldApplyFlexibility(timestamp: number) {
    if (!this.flexibilityEvent || this.flexibilityEvent.hasEnded(timestamp)) return false;
    if (this.flexibilityEvent.hasStarted(timestamp)) return true;
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
