import { BigNumber, providers, utils, Wallet } from "ethers";
import { getLogger, Logger } from "log4js";
import {
  AggregatorContract,
  AggregatorContract__factory,
  IAggregatorContract,
} from "../typechain-types";
import {
  CancelAgreementEvent,
  ConfirmFlexibilityProvisioningEvent,
  RegisterAgreementEvent,
  RequestFlexibilityEvent,
  ReviseAgreementEvent,
  StartFlexibilityProvisioningEvent,
} from "../typechain-types/AggregatorContract";
import {
  BlockchainOptions,
  DerVariationOptions,
  FlexibilityOptions,
  NumberOfDERs,
} from "../module";
import Clock from "./clock";
import { EnergySource, ETHPerIoT } from "./constants";
import { IIoT, IoTFactory } from "./iot";
import IPCHandler from "./IPCHandler";
import ITickable from "./ITickable";
import FairFlexibilityTracker from "./FairFlexibilityTracker";
import { parseAgreementLog } from "./utils";
import { ChartSetup } from "src/frontend/types";

export default class Aggregator implements ITickable {
  private readonly logger: Logger = getLogger("aggregator");
  private readonly tracker: FairFlexibilityTracker = new FairFlexibilityTracker();
  public readonly contract: AggregatorContract;
  public readonly provider: providers.JsonRpcProvider;
  private readonly tickIntervalsInOneHour = this.clock.tickIntervalsInOneHour;
  private aggregatedValue: number = 0;
  private counter: number = 0;
  private iots: IIoT[] = [];
  private wallet: Wallet;
  private mnemonic: string;
  private numberOfDERs: NumberOfDERs;
  private blockNumber: number;
  private balance: BigNumber;

  constructor(
    { sk, seed, numberOfDERs, contractAddress, rpcUrl }: BlockchainOptions,
    public readonly clock: Clock,
    private readonly initialFunds: boolean
  ) {
    this.provider = new providers.JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(sk, this.provider);
    this.mnemonic = seed;
    this.numberOfDERs = numberOfDERs;
    this.contract = AggregatorContract__factory.connect(contractAddress, this.wallet);
    this.logger.log(`Created`);
  }

  public async requestFlexibility({
    flexibilityValue,
    flexibilityStart = Date.now() / 1000,
    flexibilityStop = flexibilityStart + 60 * 60 * 24,
  }: FlexibilityOptions) {
    this.logger.log(
      `Request flexibility from ${flexibilityStart} to ${flexibilityStop} of ${flexibilityValue} Watts`
    );
    try {
      this.tracker.activate({ flexibilityValue, flexibilityStart, flexibilityStop });
      const tx = await this.contract.requestFlexibility(
        flexibilityStart,
        flexibilityStop,
        flexibilityValue
      );
      IPCHandler.sendToast("Aggregator - Flexibility request sent", "success");
      this.logger.log("Aggregator - Flexibility request sent");
      return tx.wait();
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
      const tx = await this.contract.sendFunds(
        iotList.map((iot) => iot.address),
        { value: totalCost }
      );
      return await tx.wait();
    } catch (e) {
      this.logger.error("Error sending funds", e);
      IPCHandler.sendToast("Aggregator - Error sending funds", "error");
    }
  }

  private async getNetworkInfo() {
    this.logger.log("Getting network info");
    try {
      [this.blockNumber, this.balance] = await Promise.all([
        this.provider.getBlockNumber(),
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
      this.logger.error("Error resetting contract", e);
      IPCHandler.sendToast("Can't reset the contract", "error");
    }
  }

  //#region Log listeners
  private onRegisterAgreement(
    prosumer: string,
    agreement: IAggregatorContract.AgreementStructOutput,
    event: RegisterAgreementEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    IPCHandler.onSetBaseline(this.baseline);
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
    IPCHandler.onSetBaseline(this.baseline);
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
    IPCHandler.onSetBaseline(this.baseline);
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
    this.logger.log(
      `RequestFlexibilityEvent ${start} ${end} ${gridFlexibility} - Block ${event.blockNumber}`
    );
    IPCHandler.onFlexibilityEvent({
      start: start.toString(),
      prosumer: "Aggregator",
      className: "positive-bg",
      blockNumber: event.blockNumber,
      flexibility: gridFlexibility.toString(),
    });
  }
  private onStartFlexibilityProvisioning(
    start: BigNumber,
    prosumer: string,
    flexibility: BigNumber,
    reward: BigNumber,
    event: StartFlexibilityProvisioningEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    this.logger.log(
      `StartFlexibilityProvisioningEvent ${start} ${prosumer} ${flexibility} ${reward} - Block ${event.blockNumber}`
    );
    IPCHandler.onFlexibilityEvent({
      start: start.toString(),
      prosumer: prosumer,
      className: "neutral-bg",
      blockNumber: event.blockNumber,
      flexibility: flexibility.toString(),
    });
    this.tracker.addIoT(prosumer, flexibility.toNumber());
  }
  private onConfirmFlexibilityProvisioning(
    start: BigNumber,
    prosumer: string,
    flexibility: BigNumber,
    reward: BigNumber,
    event: ConfirmFlexibilityProvisioningEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    this.logger.log(
      `ConfirmFlexibilityProvisioningEvent ${start} ${prosumer} ${flexibility} ${reward} - Block ${event.blockNumber}`
    );
    IPCHandler.onFlexibilityEvent({
      start: start.toString(),
      prosumer: prosumer,
      className: "negative-bg",
      blockNumber: event.blockNumber,
      flexibility: flexibility.toString(),
    });
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
      this.contract.filters.StartFlexibilityProvisioning(),
      this.onStartFlexibilityProvisioning.bind(this)
    );
    this.contract.on(
      this.contract.filters.ConfirmFlexibilityProvisioning(),
      this.onConfirmFlexibilityProvisioning.bind(this)
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

  public onIoTReading(address: string, value: number) {
    this.aggregatedValue += value;
    if (this.tracker.isActive) this.tracker.parseReading(address, this.aggregatedValue);
  }

  public onTick(clock: Clock, timestamp: number) {
    this.logger.debug(`Aggregated value: ${this.aggregatedValue} - Tick ${timestamp}`);
    let options: ChartSetup = undefined;
    if (this.counter >= this.tickIntervalsInOneHour || this.counter === 0) {
      this.counter = 0;
      options = {
        baseline: this.baseline,
        startTimestamp: this.timestamp,
        nPoints: this.tickIntervalsInOneHour,
      };
    }
    IPCHandler.onNewAggregatedReading(this.aggregatedValue, clock.timestampString, options);

    this.applyTracker(timestamp);
    this.counter++;
    this.aggregatedValue = 0;
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

  private applyTracker(timestamp: number) {
    if (this.tracker.isActive && this.tracker.hasEnded(timestamp)) {
      this.logger.info(`Sending 'endFlexibilityRequest' command`);
      this.tracker.deactivate();
      this.contract
        .endFlexibilityRequest(this.tracker.results)
        .then(() => this.logger.info("Sent 'endFlexibilityRequest' command"))
        .catch((e) => this.logger.error("Sending 'endFlexibilityRequest' command", e));
    }
  }

  public get iotLength() {
    return this.iots.length;
  }

  public get baseline() {
    return this.iots.reduce((acc, iot) => acc + iot.value, 0);
  }

  public get timestamp() {
    return this.clock.timestamp;
  }
}
