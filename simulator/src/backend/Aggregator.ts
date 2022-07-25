import { BigNumber, providers, Wallet } from "ethers";
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
import { BlockchainOptions, NumberOfDERs } from "../module";
import Clock from "./clock";
import { ETHPerIoT } from "./constants";
import { IIoT, IoTFactory } from "./iot";
import IPCHandler from "./IPCHandler";
import ITickable from "./ITickable";
import { parseAgreementLog } from "./utils";

export default class Aggregator implements ITickable {
  private wallet: Wallet;
  private iots: IIoT[];
  private mnemonic: string;
  private numberOfDERs: NumberOfDERs;
  private aggregatedValue: number;
  public readonly contract: AggregatorContract;
  public readonly provider: providers.JsonRpcProvider;
  private readonly logger: Logger;
  private blockNumber: number;
  private balance: BigNumber;

  constructor(
    { sk, seed, numberOfDERs, contractAddress, rpcUrl }: BlockchainOptions,
    private readonly clock: Clock
  ) {
    this.logger = getLogger("aggregator");
    this.provider = new providers.JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(sk, this.provider);
    this.iots = [];
    this.mnemonic = seed;
    this.numberOfDERs = numberOfDERs;
    this.contract = AggregatorContract__factory.connect(contractAddress, this.wallet);
    this.aggregatedValue = 0;
    this.logger.log(`Created`);
  }

  private requestFlexibility(startTimestamp: number, endTimestamp: number, flexibility: number) {
    this.logger.log(
      `Request flexibility from ${startTimestamp} to ${endTimestamp} of ${flexibility} Watts`
    );
    return this.contract.requestFlexibility(1, 1, 1);
  }

  private async distributeFounds() {
    this.logger.log(`Sending funds`);
    const tx = await this.contract.sendFunds(
      this.iots.map((iot) => iot.address),
      { value: BigNumber.from(ETHPerIoT).mul(this.iots.length) }
    );
    return await tx.wait();
  }

  private startProducing() {
    this.logger.log(`Start production`);
    for (let i = 0; i < this.iots.length; i++) this.iots[i].startProducing();
    this.clock.start();
  }

  private async getNetworkInfo() {
    this.logger.log(`Getting network info`);
    try {
      [this.blockNumber, this.balance] = await Promise.all([
        this.provider.getBlockNumber(),
        this.wallet.getBalance(),
      ]);
      this.logger.log(`Address ${this.wallet.address}`);
      this.logger.log(`Balance ${this.balance}`);
      this.logger.log(`BlockNumber ${this.blockNumber}`);
    } catch (e) {
      this.logger.error(`Error getting network info`);
      this.logger.error(e);
    }
  }

  private onRegisterAgreement(
    prosumer: string,
    agreement: IAggregatorContract.AgreementStructOutput,
    event: RegisterAgreementEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    IPCHandler.onRegisterAgreementEvent(prosumer, parseAgreementLog(agreement), event.blockNumber);
    this.logger.log(`RegisterAgreementEvent ${prosumer} ${agreement} - Block ${event.blockNumber}`);
  }
  private onReviseAgreement(
    prosumer: string,
    oldAgreement: IAggregatorContract.AgreementStructOutput,
    newAgreement: IAggregatorContract.AgreementStructOutput,
    event: ReviseAgreementEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    IPCHandler.onReviseAgreementEvent(
      prosumer,
      parseAgreementLog(oldAgreement),
      parseAgreementLog(newAgreement),
      event.blockNumber
    );
    this.logger.log(
      `ReviseAgreementEvent ${prosumer} ${oldAgreement} -> ${newAgreement} - Block ${event.blockNumber}`
    );
  }
  private onCancelAgreement(
    prosumer: string,
    agreement: IAggregatorContract.AgreementStructOutput,
    event: CancelAgreementEvent
  ) {
    if (event.blockNumber < this.blockNumber) return;
    IPCHandler.onCancelAgreementEvent(prosumer, parseAgreementLog(agreement), event.blockNumber);
    this.logger.log(`CancelAgreementEvent ${prosumer} ${agreement} - Block ${event.blockNumber}`);
  }

  private listenContractLogs() {
    this.logger.log(`Setup listeners for contract logs`);

    this.contract.on(this.contract.filters.ReviseAgreement(), this.onReviseAgreement.bind(this));
    this.contract.on(this.contract.filters.CancelAgreement(), this.onCancelAgreement.bind(this));
    this.contract.on(
      this.contract.filters.RegisterAgreement(),
      this.onRegisterAgreement.bind(this)
    );
  }

  private setupClock() {
    for (let i = 0; i < this.iots.length; i++) {
      this.clock.addFunction(this.iots[i].onTick.bind(this.iots[i]));
    }
    this.clock.addFunction(this.onTick.bind(this));
  }

  public async setupSimulation(initialFunds: boolean) {
    this.logger.log(`Setup production`);
    await this.getNetworkInfo();
    this.listenContractLogs();
    this.iots = await IoTFactory.createIoTs(this, this.mnemonic, this.numberOfDERs);
    if (initialFunds) await this.distributeFounds();
    this.setupClock();
  }

  public async startSimulation() {
    this.startProducing();
  }

  stopSimulation() {
    this.contract.removeAllListeners();
    this.clock.stop();
    this.iots.forEach((iot) => iot.stopProducing());
    delete this.iots;
    this.iots = [];
  }

  onIoTReading(address: string, value: number) {
    this.aggregatedValue += value;
  }

  onTick(clock: Clock, timestamp: number) {
    IPCHandler.onNewAggregatedReading(this.aggregatedValue, clock.ISO);
    this.aggregatedValue = 0;
  }
}
