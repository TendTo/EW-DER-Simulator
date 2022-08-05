import { BigNumber } from "ethers";
import Agreement from "../Agreement";
import ITickable from "../ITickable";

export default interface IIoT extends ITickable {
  production: number;
  expectedFlexibility: number;
  value: number;
  address: string;
  agreement: Agreement;

  startProducing(): Promise<void>;

  stopProducing(sendLog: boolean): void;

  listenToEvents(): void;

  agreementStatus(registered: boolean): void;
}
