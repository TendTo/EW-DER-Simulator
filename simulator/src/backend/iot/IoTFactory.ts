import { mnemonicToSeed } from "bip39";
import { hdkey } from "ethereumjs-wallet";
import WindIoT from "./WindIoT";
import Aggregator from "../Aggregator";
import { EnergySource } from "../constants";
import IIoT from "./IIoT";
import SolarIoT from "./SolarIoT";
import { NumberOfDERs } from "src/module";

type IoTRequestOptions = {
  source: EnergySource;
  number: number;
};

export default class IoTFactory {
  private _instance: IoTFactory;

  public get instance(): IoTFactory {
    if (!this._instance) this._instance = new IoTFactory();
    return this._instance;
  }

  static async createIoTs(
    aggregator: Aggregator,
    mnemonic: string,
    ders: NumberOfDERs
  ): Promise<IIoT[]> {
    const masterKey = hdkey.fromMasterSeed(await mnemonicToSeed(mnemonic));
    let counter = 0;
    return Object.entries(ders).map(([source, number]) => {
      for (let i = 0; i < number; i++) {
        const wallet = masterKey.derivePath(`m/44'/60'/0'/0/${counter++}`).getWallet();
        const sk = wallet.getPrivateKeyString();
        return source === "Wind" ? new WindIoT(aggregator, sk) : new SolarIoT(aggregator, sk);
      }
    });
  }
}
