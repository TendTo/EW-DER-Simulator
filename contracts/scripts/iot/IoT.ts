import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Aggregator, Aggregator__factory } from "../../typechain-types";
import { BigNumber } from "ethers";
import Agreement from "./Agreement";

class IoT {
  public static AGGREGATOR_ADDRESS =
    "0x0000000000000000000000000000000000000000";
  private agreement: Agreement;
  private contract: Aggregator;

  constructor(private signer: SignerWithAddress) {
    this.agreement = new Agreement();
    this.contract = Aggregator__factory.connect(
      IoT.AGGREGATOR_ADDRESS,
      this.signer
    );
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  registerContract() {
    this.contract.registerAgreement(this.agreement.struct);
  }

  async startProducing() {
    for (let i = 0; i < 5; i++) {
      this.produce();
      await this.sleep(5000);
    }
  }

  stopProducing() {}

  listenToEvents() {
    const filter = this.contract.filters.RequestFlexibility();
    this.contract.on(filter, this.provideFlexibility.bind(this));
  }

  private provideFlexibility(event: any) {
    console.log(event);
  }

  private produce() {
    console.log("Producing...");
  }
}

export default IoT;
