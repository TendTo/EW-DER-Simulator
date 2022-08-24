import { BigNumber, providers, utils, Wallet } from "ethers";
import { getLogger, Logger } from "log4js";
import {
  AggregatorContract,
  AggregatorContract__factory,
  IAggregatorContract,
} from "../typechain-types";
import {
  CancelAgreementEvent,
  RegisterAgreementEvent,
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

/**
 * The Aggregator is the main class of the simulator. It is responsible for
 * receiving the readings from IoT devices and starting a flexibility request.
 */
export default class Aggregator implements ITickable {
  private readonly logger: Logger = getLogger("aggregator");
  public readonly tracker: FairFlexibilityTracker = new FairFlexibilityTracker();
  public readonly contract: AggregatorContract;
  public readonly derRpcUrl: string;
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

  constructor(
    { sk, seed, numberOfDERs, contractAddress, aggRpcUrl, derRpcUrl }: BlockchainOptions,
    public readonly clock: Clock,
    private readonly initialFunds: boolean
  ) {
    this.aggProvider = new providers.JsonRpcProvider(aggRpcUrl);
    this.derRpcUrl = derRpcUrl;
    this.wallet = new Wallet(sk, this.aggProvider);
    this.mnemonic = seed;
    this.numberOfDERs = numberOfDERs;
    this.contract = AggregatorContract__factory.connect(contractAddress, this.wallet);
    this.logger.log(`Created`);
  }
  /**
   * Start a flexibility request
   * @param param0 flexibility options
   */
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
      // Send the request to the smart contract and wait for the successful response
      const tx = await this.contract.requestFlexibility(
        flexibilityStart,
        flexibilityStop,
        Math.floor(this.#baseline + (this.#baseline * flexibilityValue) / 100)
      );
      IPCHandler.sendToast("Aggregator - Flexibility request sent", "success");
      this.logger.log("Flexibility request sent");
      // Wait for the block to be added to the blockchain
      await tx.wait();
    } catch (e) {
      this.logger.error("Error requesting flexibility", e);
      IPCHandler.sendToast("Aggregator - Error requesting flexibility", "error");
    }
  }
  /**
   * Distribuite the initial funds to all the IoTs through the smart contract's {@link AggregatorContract.sendFunds} function
   * @param iots list of IoTs to distribute the funds to. If undefined, all IoTs in {@link Aggregator.iots} are used.
   */
  private async distributeFounds(iots?: IIoT[]) {
    // Calculate the amount of funds to distribute based on the number of IoTs
    const totalCost = ETHPerIoT.mul(this.iots.length);
    const strTotalCost = utils.formatEther(totalCost);
    const iotList = iots ?? this.iots;
    IPCHandler.sendToast(`Aggregator - Sending ${strTotalCost} VT to IoTs`, "info");
    this.logger.log(`Sending ${strTotalCost} VT to ${iotList.length} IoTs`);
    try {
      // Send the funds to each IoT (arrayPromiseSplitter splits the array in chunks if it is too long)
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
  /**
   * Get some useful information about the current state of the blockchain network.
   */
  private async getNetworkInfo() {
    this.logger.log("Getting network info");
    this.logger.log(`Aggregator rpc url: ${this.aggProvider.connection.url}`);
    this.logger.log(`IoT rpc url: ${this.derRpcUrl}`);
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
  /**
   * Reset the state of the smart contract by invoking the {@link AggregatorContract.resetContract} function.
   * If size of the data storage is too big, this method may fail, but the simulation would still work.
   * This said, it would be wise to re-deploy the smart contract to make sure it is really clean.
   */
  private async resetContract() {
    this.logger.log("Resetting smart contract");
    try {
      // Call the resetContract function and wait for the transaction to complete
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
  /**
   * Called by a RegisterAgreement event from the smart contract.
   * Make sure the IoT that sent the event is active and update the baseline.
   * @param prosumer the prosumer that emitted the event
   * @param agreement agreement between the prosumer and the aggregator
   * @param event blockchain info about the event
   */
  private onRegisterAgreement(
    prosumer: string,
    agreement: IAggregatorContract.AgreementStructOutput,
    event: RegisterAgreementEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    // Activate the IoT that sent the event
    this.iots.find((iot) => iot.address === prosumer).agreementStatus(true);
    // Update the baseline with the new event
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
  /**
   * Called by a ReviseAgreement event from the smart contract.
   * Update the baseline.
   * @param prosumer the prosumer that emitted the event
   * @param _ old agreement that has been replaced
   * @param newAgreement new agreement that has been created
   * @param event blockchain info about the event
   */
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
  /**
   * Called by a CancelAgreement event from the smart contract.
   * Make sure the IoT that sent the event is deactivated and update the baseline.
   * @param prosumer the prosumer that emitted the event
   * @param agreement agreement between the prosumer and the aggregator that has been removed
   * @param event blockchain info about the event
   */
  private onCancelAgreement(
    prosumer: string,
    agreement: IAggregatorContract.AgreementStructOutput,
    event: CancelAgreementEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    // Deactivate the IoT that sent the event
    this.iots.find((iot) => iot.address === prosumer).agreementStatus(false);
    // Update the baseline removing the old agreement
    this.updateBaseline();
    IPCHandler.onAgreementEvent({
      ...parseAgreementLog(agreement, event),
      address: prosumer,
      className: "negative-bg",
    });
    this.logger.log(`CancelAgreementEvent ${prosumer} [${agreement}]- Block ${event.blockNumber}`);
  }
  //#endregion
  /**
   * Add all the listeners to the smart contract events, so that the correct methods are called when the events are emitted.
   */
  private listenContractLogs() {
    this.logger.log(`Setup listeners for contract logs`);

    this.contract.on(this.contract.filters.ReviseAgreement(), this.onReviseAgreement.bind(this));
    this.contract.on(this.contract.filters.CancelAgreement(), this.onCancelAgreement.bind(this));
    this.contract.on(
      this.contract.filters.RegisterAgreement(),
      this.onRegisterAgreement.bind(this)
    );
  }
  /**
   * Start the setup of the simulation. In order:
   * 1. Start listening for events from the smart contract
   * 2. Get the current state of the blockchain network
   * 3. Reset the smart contract
   * 4. Create all the IoT devices as described in the user input
   * 5. [OPTIONAL] Send some funds to the newly created IoT devices
   * 6. Add the {@link Aggregator.onTick} listener to the {@link Aggregator.clock}
   */
  public async setupSimulation() {
    this.logger.log(`Setup production`);
    this.listenContractLogs();
    await this.getNetworkInfo();
    await this.resetContract();
    this.iots = await IoTFactory.createIoTs(this, this.mnemonic, this.numberOfDERs);
    if (this.initialFunds) await this.distributeFounds();
    this.clock.addFunction(this.onTick.bind(this));
  }
  /**
   * Start the simulation by calling the {@link IoT.startProducing} function for each IoT device.
   * Finally, invoke {@link Clock.start} to make the internal time flow.
   */
  public async startSimulation() {
    this.logger.log(`Start production`);
    for (let i = 0; i < this.iots.length; i++) this.iots[i].startProducing();
    this.clock.start();
  }
  /**
   * Stop the simulation by calling the {@link IoT.stopProducing} function for each IoT device.
   * Finally, invoke {@link Clock.stop} to make the internal time stop.
   */
  public stopSimulation() {
    this.contract.removeAllListeners();
    this.clock.stop();
    for (let i = 0; i < this.iots.length; i++) this.iots[i].stopProducing(false);
    this.iots = [];
  }
  /**
   * Called by each {@link IoT} device when it has produced some energy.
   * The reading is accumulated in the {@link Aggregator.aggregatedValue}.
   * If the {@link Aggregator.tracker} is active, it means that a flexibility event is currently taking place.
   * So the reading is considered in the {@link Aggregator.tracker} statistics.
   * @param iot device that produced the reading
   * @param value value of the reading
   */
  public onIoTReading(iot: IIoT, value: number) {
    this.aggregatedValue += value;
    // If the tracker is active, add the reading to the tracker statistics
    if (this.tracker.isActive) this.tracker.parseReading(iot, value, this.clock.timestamp);
  }
  /**
   * Called by the {@link Clock} when a new tick has been reached.
   * Send the aggregated readings to the frontend and, if necessary, update the chart.
   * @param clock clock that is calling the function
   * @param timestamp current timestamp as provided by the clock
   */
  public onTick(clock: Clock, timestamp: number) {
    let options: ChartSetup = undefined;
    // If the number of points already drawn in the chart is 0 or has reached the max value,
    // set the options object to make the graph redraw with the new origin
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
    // Increment the number of points drawn in the chart
    this.counter++;
    // Reset the aggregated value
    this.aggregatedValue = 0;
    // Check if the flexibility event is over
    this.checkStopTracker(timestamp);
  }
  /**
   * Variate the number of IoTs currently in use, either by adding or removing them.
   * @deprecated
   * @param param0 variation user input
   */
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
  /**
   * Check if the flexibility event is over.
   * If it is, the {@link Aggregator.tracker} statistics are used to call the {@link AggregatorContract.endFlexibilityRequest} function.
   * The {@link Aggregator.tracker} is then reset.
   * @param timestamp timestamp provided by the {@link Clock}
   */
  private checkStopTracker(timestamp: number) {
    if (this.tracker.isActive && this.tracker.hasEnded(timestamp)) {
      // Get the statistics results from the tracker
      const result = this.tracker.result;
      const contractResults = this.tracker.contractResults;
      const start = this.tracker.flexibilityStart;
      this.tracker.deactivate();

      const flexibilityLogger = getLogger("flexibility");
      flexibilityLogger.log(
        `${result.id},${result.successStart},${result.successFlexibility},${result.successReset},${result.averageValue},${result.success},`
      );
      IPCHandler.onFlexibilityEvent(result);
      this.logger.log(`Sending 'endFlexibilityRequest' command`);
      // Call the endFlexibilityRequest function (arrayPromiseSplitter splits the array in chunks if it is too long)
      arrayPromiseSplitter(
        (results) => this.contract.endFlexibilityRequest(start, results, { gasLimit: 8000000 }),
        contractResults
      )
        .then(() => this.logger.log("Sent 'endFlexibilityRequest' command"))
        .catch((e) => this.logger.error("Sending 'endFlexibilityRequest' command", e));
    }
  }
  /**
   * Update the {@link Aggregator.baseline} value and make the chart redraw with the new value.
   * It is called when an agreement has changed in the smart contract.
   */
  private updateBaseline() {
    this.#baseline = this.iots.reduce((acc, iot) => acc + iot.production, 0);
    IPCHandler.onSetBaseline(this.#baseline);
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
