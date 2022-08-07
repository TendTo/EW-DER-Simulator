import { BigNumber, providers, utils, Wallet } from "ethers";
import { getLogger, Logger } from "log4js";
import {
  AggregatorContract,
  AggregatorContract__factory,
  IAggregatorContract,
} from "../typechain-types";
import {
  CancelAgreementEvent,
  EndRequestFlexibilityEvent,
  RegisterAgreementEvent,
  RequestFlexibilityEvent,
  ReviseAgreementEvent,
} from "../typechain-types/AggregatorContract";
import {
  BlockchainOptions,
  DerVariationOptions,
  FlexibilityOptions,
  NumberOfDERs,
} from "../module";
import Clock from "./clock";
import { EnergySource, ETHPerIoT, FlexibilityEndOffset, FlexibilityStartOffset } from "./constants";
import { IIoT, IoTFactory } from "./iot";
import IPCHandler from "./IPCHandler";
import ITickable from "./ITickable";
import FairFlexibilityTracker from "./FlexibilityTracker";
import { arrayPromiseSplitter, parseAgreementLog } from "./utils";
import { ChartSetup } from "src/frontend/types";

type RequestFlexibilityCallback = (
  start: BigNumber,
  end: BigNumber,
  gridFlexibility: BigNumber,
  event: RequestFlexibilityEvent
) => void;
type EndRequestFlexibilityCallback = (
  start: BigNumber,
  end: BigNumber,
  gridFlexibility: BigNumber,
  event: EndRequestFlexibilityEvent
) => void;

export default class Aggregator implements ITickable {
  private readonly logger: Logger = getLogger("aggregator");
  public readonly tracker: FairFlexibilityTracker = new FairFlexibilityTracker();
  public readonly contract: AggregatorContract;
  public readonly derRpcUrl: providers.JsonRpcProvider;
  private readonly aggProvider: providers.JsonRpcProvider;
  private readonly tickIntervalsInOneHour = this.clock.tickIntervalsInOneHour;
  private aggregatedValue: number = 0;
  private counter: number = 0;
  private iots: IIoT[] = [];
  private wallet: Wallet;
  private mnemonic: string;
  private numberOfDERs: NumberOfDERs;
  private balance: BigNumber;
  public blockNumber: number;
  #baseline = 0;
  #requestFlexibilityCallbacks: RequestFlexibilityCallback[] = [];
  #endRequestFlexibilityCallbacks: EndRequestFlexibilityCallback[] = [];

  constructor(
    { sk, seed, numberOfDERs, contractAddress, aggRpcUrl, derRpcUrl }: BlockchainOptions,
    public readonly clock: Clock,
    private readonly initialFunds: boolean
  ) {
    this.aggProvider = new providers.JsonRpcProvider(aggRpcUrl);
    this.derRpcUrl = new providers.JsonRpcProvider(derRpcUrl);
    this.wallet = new Wallet(sk, this.aggProvider);
    this.mnemonic = seed;
    this.numberOfDERs = numberOfDERs;
    this.contract = AggregatorContract__factory.connect(contractAddress, this.wallet);
    this.logger.log(`Created`);
  }

  public async requestFlexibility({
    flexibilityValue,
    flexibilityStart = this.clock.timestamp + FlexibilityStartOffset,
    flexibilityStop = this.clock.timestamp + FlexibilityEndOffset,
  }: FlexibilityOptions) {
    const flexibilityBaseline = Math.floor(
      this.#baseline + (this.#baseline * flexibilityValue) / 100
    );
    // Reset the origin of the graph
    this.counter = 0;
    this.logger.log(
      `Request flexibility from ${flexibilityStart} to ${flexibilityStop} of ${flexibilityValue}% - ${
        this.#baseline
      } -> ${flexibilityBaseline}`
    );
    try {
      this.tracker.activate({ flexibilityBaseline, flexibilityStart, flexibilityStop });
      const tx = await this.contract.requestFlexibility(
        flexibilityStart,
        flexibilityStop,
        Math.floor(this.#baseline + (this.#baseline * flexibilityValue) / 100)
      );
      IPCHandler.sendToast("Aggregator - Flexibility request sent", "success");
      this.logger.log("Flexibility request sent");
      await tx.wait();
    } catch (e) {
      this.logger.error("Error requesting flexibility", e);
      IPCHandler.sendToast("Aggregator - Error requesting flexibility", "error");
    }
  }

  private async distributeFounds(iots?: IIoT[]) {
    const totalCost = ETHPerIoT.mul(this.iots.length);
    const strTotalCost = utils.formatEther(totalCost);
    const iotList = iots ?? this.iots;
    IPCHandler.sendToast(`Aggregator - Sending ${strTotalCost} VT to IoTs`, "info");
    this.logger.log(`Sending ${strTotalCost} VT to ${iotList.length} IoTs`);
    try {
      const tx = await arrayPromiseSplitter(
        (addresses: string[]) =>
          this.contract.sendFunds(addresses, {
            value: ETHPerIoT.mul(addresses.length),
            gasLimit: 8000000,
          }),
        iotList.map((iot) => iot.address)
      );
      await tx.wait();
    } catch (e) {
      this.logger.error("Error sending funds", e);
      IPCHandler.sendToast("Aggregator - Error sending funds", "error");
    }
  }

  private async getNetworkInfo() {
    this.logger.log("Getting network info");
    try {
      [this.blockNumber, this.balance] = await Promise.all([
        this.aggProvider.getBlockNumber(),
        this.wallet.getBalance(),
      ]);
      this.logger.log(`Address ${this.wallet.address}`);
      this.logger.log(`Balance ${this.balance}`);
      this.logger.log(`BlockNumber ${this.blockNumber}`);
    } catch (e) {
      this.logger.error("Error getting network info", e);
      IPCHandler.sendToast("Can't connect to the network", "error");
    }
  }

  private async resetContract() {
    this.logger.log("Resetting smart contract");
    try {
      const tx = await this.contract.resetContract();
      await tx.wait();
      this.logger.log("Contract resetted");
    } catch (e) {
      this.logger.warn("Error resetting contract", e);
      IPCHandler.sendToast(
        "Can't reset the contract. The simulation will procede anyway",
        "warning"
      );
    }
  }

  //#region Log listeners
  private onRegisterAgreement(
    prosumer: string,
    agreement: IAggregatorContract.AgreementStructOutput,
    event: RegisterAgreementEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    this.iots.find((iot) => iot.address === prosumer).agreementStatus(true);
    this.updateBaseline();
    IPCHandler.onAgreementEvent({
      ...parseAgreementLog(agreement, event),
      address: prosumer,
      className: "positive-bg",
    });
    this.logger.log(
      `RegisterAgreementEvent ${prosumer} [${agreement}] - Block ${event.blockNumber}`
    );
  }
  private onReviseAgreement(
    prosumer: string,
    _: IAggregatorContract.AgreementStructOutput,
    newAgreement: IAggregatorContract.AgreementStructOutput,
    event: ReviseAgreementEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    this.updateBaseline();
    IPCHandler.onAgreementEvent({
      ...parseAgreementLog(newAgreement, event),
      address: prosumer,
      className: "negative-bg",
    });
    this.logger.log(
      `ReviseAgreementEvent ${prosumer} [${newAgreement}] - Block ${event.blockNumber}`
    );
  }
  private onCancelAgreement(
    prosumer: string,
    agreement: IAggregatorContract.AgreementStructOutput,
    event: CancelAgreementEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    this.iots.find((iot) => iot.address === prosumer).agreementStatus(false);
    this.updateBaseline();
    IPCHandler.onAgreementEvent({
      ...parseAgreementLog(agreement, event),
      address: prosumer,
      className: "negative-bg",
    });
    this.logger.log(`CancelAgreementEvent ${prosumer} [${agreement}]- Block ${event.blockNumber}`);
  }
  private onRequestFlexibility(
    start: BigNumber,
    end: BigNumber,
    gridFlexibility: BigNumber,
    event: RequestFlexibilityEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    for (let i = 0; i < this.#requestFlexibilityCallbacks.length; i++) {
      this.#requestFlexibilityCallbacks[i](start, end, gridFlexibility, event);
    }
  }
  private onEndRequestFlexibility(
    start: BigNumber,
    end: BigNumber,
    gridFlexibility: BigNumber,
    event: RequestFlexibilityEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    for (let i = 0; i < this.#endRequestFlexibilityCallbacks.length; i++) {
      this.#endRequestFlexibilityCallbacks[i](start, end, gridFlexibility, event);
    }
  }

  //#endregion

  private listenContractLogs() {
    this.logger.log(`Setup listeners for contract logs`);

    this.contract.on(this.contract.filters.ReviseAgreement(), this.onReviseAgreement.bind(this));
    this.contract.on(this.contract.filters.CancelAgreement(), this.onCancelAgreement.bind(this));
    this.contract.on(
      this.contract.filters.RegisterAgreement(),
      this.onRegisterAgreement.bind(this)
    );
    this.contract.on(
      this.contract.filters.RequestFlexibility(),
      this.onRequestFlexibility.bind(this)
    );
    this.contract.on(
      this.contract.filters.EndRequestFlexibility(),
      this.onEndRequestFlexibility.bind(this)
    );
  }

  public async setupSimulation() {
    this.logger.log(`Setup production`);
    this.listenContractLogs();
    await this.getNetworkInfo();
    await this.resetContract();
    this.iots = await IoTFactory.createIoTs(this, this.mnemonic, this.numberOfDERs);
    if (this.initialFunds) await this.distributeFounds();
    this.clock.addFunction(this.onTick.bind(this));
  }

  public async startSimulation() {
    this.logger.log(`Start production`);
    for (let i = 0; i < this.iots.length; i++) this.iots[i].startProducing();
    this.clock.start();
  }

  public stopSimulation() {
    this.contract.removeAllListeners();
    this.clock.stop();
    for (let i = 0; i < this.iots.length; i++) this.iots[i].stopProducing(false);
    this.iots = [];
  }

  public onIoTReading(iot: IIoT, value: number) {
    this.aggregatedValue += value;
    if (this.tracker.isActive) this.tracker.parseReading(iot, value, this.clock.timestamp);
  }

  public onTick(clock: Clock, timestamp: number) {
    // The options object makes the graph redraw with the new origin
    let options: ChartSetup = undefined;
    if (this.counter >= this.tickIntervalsInOneHour || this.counter === 0) {
      this.counter = 0;
      options = {
        baseline: this.#baseline,
        currentTimestamp: this.timestamp,
        nPoints: this.tickIntervalsInOneHour,
        flexibilityBaseline: this.tracker.flexibilityBaseline,
        zoom: this.tracker.isActive,
      };
    }
    IPCHandler.onNewAggregatedReading(this.aggregatedValue, clock.timestampString, options);
    this.logger.debug(
      `Aggregated value: ${this.aggregatedValue} - Counter: ${this.counter} - Tick ${timestamp}`
    );
    this.counter++;

    this.aggregatedValue = 0;
    this.checkStopTracker(timestamp);
  }

  public async variateIoTs({ derType, derVariation }: DerVariationOptions) {
    if (derVariation > 0) {
      const newIoTs = await IoTFactory.createIoTs(this, this.mnemonic, { [derType]: derVariation });
      if (this.initialFunds) await this.distributeFounds(newIoTs);
      this.iots = this.iots.concat(newIoTs);
      for (let i = 0; i < newIoTs.length; i++) newIoTs[i].startProducing();
    } else {
      let counter = 0;
      const iotsToRemove = this.iots.filter(
        (iot) => iot.agreement.energySource === EnergySource[derType] && counter++ < -derVariation
      );
      iotsToRemove.forEach((iot) => iot.stopProducing(true));
      this.iots = this.iots.filter((iot) => !iotsToRemove.includes(iot));
    }
  }

  private checkStopTracker(timestamp: number) {
    if (this.tracker.isActive && this.tracker.hasEnded(timestamp)) {
      const result = this.tracker.result;
      const contractResults = this.tracker.contractResults;
      const start = this.tracker.flexibilityStart;
      this.tracker.deactivate();

      const flexibilityLogger = getLogger("flexibility");
      flexibilityLogger.info(
        `${result.id},${result.successStart},${result.successFlexibility},${result.successReset},${result.averageValue},${result.success},`
      );
      IPCHandler.onFlexibilityEvent(result);
      this.logger.info(`Sending 'endFlexibilityRequest' command`);
      arrayPromiseSplitter(
        (results) => this.contract.endFlexibilityRequest(start, results, { gasLimit: 8000000 }),
        contractResults
      )
        .then(() => this.logger.info("Sent 'endFlexibilityRequest' command"))
        .catch((e) => this.logger.error("Sending 'endFlexibilityRequest' command", e));
    }
  }

  private updateBaseline() {
    this.#baseline = this.iots.reduce((acc, iot) => acc + iot.production, 0);
    IPCHandler.onSetBaseline(this.#baseline);
  }

  public addEndRequestFlexibilityCallback(callback: EndRequestFlexibilityCallback) {
    this.#endRequestFlexibilityCallbacks.push(callback);
  }

  public removeEndRequestFlexibilityCallback(callback: EndRequestFlexibilityCallback) {
    this.#endRequestFlexibilityCallbacks = this.#endRequestFlexibilityCallbacks.filter(
      (c) => c !== callback
    );
  }

  public addRequestFlexibilityCallback(callback: RequestFlexibilityCallback) {
    this.#requestFlexibilityCallbacks.push(callback);
  }

  public removeRequestFlexibilityCallback(callback: RequestFlexibilityCallback) {
    this.#requestFlexibilityCallbacks = this.#requestFlexibilityCallbacks.filter(
      (c) => c !== callback
    );
  }

  public get iotLength() {
    return this.iots.length;
  }

  public get baseline() {
    return this.#baseline;
  }

  public get timestamp() {
    return this.clock.timestamp;
  }

  public get gridFlexibility() {
    return this.tracker.flexibilityBaseline;
  }
}
