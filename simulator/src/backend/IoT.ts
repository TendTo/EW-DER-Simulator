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

  constructor(private aggregator: Aggregator, sk: string) {
    this.stop = false;
    this.wallet = new Wallet(sk);
    this.agreement = new Agreement();
    this.contract = AggregatorContract__factory.connect(
      Addresses.AggregatorContract,
      this.wallet
    );
    console.log(`IoT ${this.wallet.address} - Created`);
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
      // Random sleep between 3 and 7 seconds
      await this.sleep(Math.floor(Math.random() * (7 - 3 + 1)) * 1000);
    }
  }

  stopProducing() {
    this.stop = true;
    console.log(`IoT ${this.address} - Stopped`);
  }

  listenToEvents() {
    const filter = this.contract.filters.RequestFlexibility();
    this.contract.on(filter, this.provideFlexibility.bind(this));
  }

  private provideFlexibility(event: any) {
    console.log(`IoT ${this.address} - Providing flexibility ${this.agreement.flexibility}`);
  }

  private produce() {
    // Return the current agreement value with a random variation of 10% of the value
    this.aggregator.onIoTReading(this.agreement.value + (Math.random() - 0.5) * 0.1 * this.agreement.value);
    console.log(`IoT ${this.address} - Producing...`);
  }

  get address() {
    return this.wallet.address;
  }
}

export default IoT;
