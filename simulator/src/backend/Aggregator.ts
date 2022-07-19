import { Wallet } from "ethers";
import IoT from "./IoT";
import { mnemonicToSeed } from "bip39";
import { hdkey } from "ethereumjs-wallet";
import { IoTBank__factory } from "../typechain-types";
import { Addresses, ETHPerIoT } from "./constants";
import IPCHandler from "./IPCHandler";

class Aggregator {
  private wallet;
  private iots: IoT[];

  constructor(
    sk: string,
    private mnemonic: string,
    private numberOfDERs: number
  ) {
    this.wallet = new Wallet(sk);
    this.iots = [];
  }

  private async addIoTDevices() {
    const masterKey = hdkey.fromMasterSeed(await mnemonicToSeed(this.mnemonic));
    for (let i = 0; i < this.numberOfDERs; i++) {
      const wal = masterKey.derivePath(`m/44'/60'/0'/0/${i}`).getWallet();
      this.iots.push(new IoT(this, wal.getPrivateKeyString()));
    }
  }

  private async distributeFounds() {
    const contract = IoTBank__factory.connect(Addresses.IoTBank, this.wallet);
    contract.sendFunds(
      this.iots.map((iot) => iot.address),
      { value: ETHPerIoT * this.iots.length }
    );
  }

  private startProducing() {
    this.iots.forEach((iot) => iot.startProducing());
  }

  public async startSimulation() {
    await this.addIoTDevices();
    // await this.distributeFounds();
    this.startProducing();
  }

  stopSimulation() {
    this.iots.forEach((iot) => iot.stopProducing());
    delete this.iots;
    this.iots = [];
  }

  onIoTReading(value: number) {
    IPCHandler.onNewReading(value);
  }
}

export default Aggregator;
