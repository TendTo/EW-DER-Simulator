import { Wallet } from "ethers";
import {
  AggregatorContract,
  AggregatorContract__factory,
} from "../typechain-types";
import Agreement from "./Agreement";
import Aggregator from "./Aggregator";
import { Addresses } from "./constants";

class IoT {
  private agreement: Agreement;
  private contract: AggregatorContract;
  private wallet: Wallet;
  private stop: boolean;

  constructor(private aggregator: Aggregator, private sk: string) {
    this.stop = false;
    this.wallet = new Wallet(sk);
    this.agreement = new Agreement();
    this.contract = AggregatorContract__factory.connect(
      Addresses.AggregatorContract,
      this.wallet
    );
    console.log(`IoT ${this.wallet.address} - Constructor`);
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  registerContract() {
    this.contract.registerAgreement(this.agreement.struct);
  }

  async startProducing() {
    while (!this.stop) {
      this.produce();
      await this.sleep(5000);
    }
  }

  stopProducing() {
    this.stop = true;
  }

  listenToEvents() {
    const filter = this.contract.filters.RequestFlexibility();
    this.contract.on(filter, this.provideFlexibility.bind(this));
  }

  private provideFlexibility(event: any) {
    console.log(event);
  }

  private produce() {
    this.aggregator.onIoTReading(this.agreement.value);
    console.log(`IoT ${this.address} - Producing...`);
  }

  get address() {
    return this.wallet.address;
  }
}

export default IoT;
