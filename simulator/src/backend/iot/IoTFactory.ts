import { mnemonicToSeed } from "bip39";
import { hdkey } from "ethereumjs-wallet";
import WindIoT from "./WindIoT";
import Aggregator from "../Aggregator";
import { EnergySource } from "../constants";
import IIoT from "./IIoT";
import SolarIoT from "./SolarIoT";
import { NumberOfDERs } from "../../module";

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
    const iots: IIoT[] = [];
    Object.entries(ders).forEach(([source, number]: [keyof typeof EnergySource, number]) => {
      for (let i = 0; i < number; i++) {
        const wallet = masterKey.derivePath(`m/44'/60'/0'/0/${counter++}`).getWallet();
        const sk = wallet.getPrivateKeyString();
        if (source === "Wind") iots.push(new WindIoT(aggregator, sk));
        else if (source === "Solar") iots.push(new SolarIoT(aggregator, sk));
        else throw new Error("Unknown energy source");
      }
    });
    return iots;
  }
}
