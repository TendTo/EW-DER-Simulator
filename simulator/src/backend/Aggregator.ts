import { Wallet, providers, utils, BigNumber } from "ethers";
import { Season } from "./constants";
import IPCHandler from "./IPCHandler";
import Clock from "./clock";
import { BlockchainOptions } from "../module";
import IoTFactory from "./iot/IoTFactory";
import { IIoT } from "./iot";
import ITickable from "./ITickable";
import {
  AggregatorContract,
  AggregatorContract__factory,
} from "../typechain-types";
import { getLogger, Logger } from "log4js";

export default class Aggregator implements ITickable {
  private wallet: Wallet;
  private iots: IIoT[];
  private mnemonic: string;
  private numberOfDERs: number;
  private aggregatedValue: number;
  public readonly contract: AggregatorContract;
  public readonly provider: providers.JsonRpcProvider;
  private readonly logger: Logger;

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
    this.contract = AggregatorContract__factory.connect(
      contractAddress,
      this.wallet
    );
    this.aggregatedValue = 0;
    this.logger.log(`Aggregator ${this.wallet.address} - Created`);
  }

  private async sendBalance() {
    const balance = await this.wallet.getBalance();
    IPCHandler.onAggregatorBalance(
      this.wallet.address,
      utils.formatEther(balance)
    );
    this.logger.log(`Aggregator ${this.wallet.address} - Balance ${balance}`);
  }

  private requestFlexibility(
    startTimestamp: number,
    endTimestamp: number,
    flexibility: number
  ) {
    this.logger.log(
      `Aggregator ${this.wallet.address} - Request flexibility from ${startTimestamp} to ${endTimestamp} of ${flexibility} Watts`
    );
    return this.contract.requestFlexibility(1, 1);
  }

  private distributeFounds() {
    this.logger.log(`Aggregator ${this.wallet.address} - Sending funds`);
    return this.contract.sendFunds(
      this.iots.map((iot) => iot.address),
      { value: BigNumber.from(1) }
    );
  }

  private startProducing() {
    this.logger.log(`Aggregator ${this.wallet.address} - Start production`);
    for (let i = 0; i < this.iots.length; i++) this.iots[i].startProducing();
    this.clock.start();
  }

  private setupClock() {
    for (let i = 0; i < this.iots.length; i++) {
      this.clock.addFunction(this.iots[i].onTick.bind(this.iots[i]));
    }
    this.clock.addFunction(this.onTick.bind(this));
  }

  private registerAgreements() {
    return Promise.all(this.iots.map((iot) => iot.registerAgreement()));
  }

  public async setupSimulation(initialFunds: boolean) {
    this.logger.log(`Aggregator ${this.wallet.address} - Setup production`);
    this.iots = await IoTFactory.createIoTs(
      this,
      this.mnemonic,
      this.numberOfDERs
    );
    if (initialFunds) await this.distributeFounds();
    await this.registerAgreements();
    this.setupClock();
    await this.sendBalance();
  }

  public async startSimulation() {
    this.startProducing();
  }

  stopSimulation() {
    this.clock.stop();
    this.iots.forEach((iot) => iot.stopProducing());
    delete this.iots;
    this.iots = [];
  }

  onIoTReading(address: string, value: number) {
    this.aggregatedValue += value;
  }

  onTick(_: Season, __: number, hour: number) {
    IPCHandler.onNewAggregatedReading(this.aggregatedValue, hour);
    this.aggregatedValue = 0;
  }
}
