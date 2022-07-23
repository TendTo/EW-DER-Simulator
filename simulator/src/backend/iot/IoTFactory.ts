import { mnemonicToSeed } from "bip39";
import { hdkey } from "ethereumjs-wallet";
import WindIoT from "./WindIoT";
import Aggregator from "../Aggregator";
import { EnergySource } from "../constants";
import IIoT from "./IIoT";
import SolarIoT from "./SolarIoT";

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
    number: number | IoTRequestOptions[]
  ): Promise<IIoT[]> {
    const masterKey = hdkey.fromMasterSeed(await mnemonicToSeed(mnemonic));
    const output = [];
    if (typeof number === "number") {
      for (let i = 0; i < number; i++) {
        const wal = masterKey.derivePath(`m/44'/60'/0'/0/${i}`).getWallet();
        if (i < number / 2)
          output.push(new SolarIoT(aggregator, wal.getPrivateKeyString()));
        else output.push(new WindIoT(aggregator, wal.getPrivateKeyString()));
      }
    } else {
      throw new Error("parameter: IoTRequestOptions[] Not implemented");
    }
    return output;
  }
}
