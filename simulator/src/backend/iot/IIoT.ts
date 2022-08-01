import Agreement from "../Agreement";
import ITickable from "../ITickable";

export default interface IIoT extends ITickable {
  address: string;
  agreement: Agreement;

  startProducing(): Promise<void>;

  stopProducing(sendLog: boolean): void;

  listenToEvents(): void;
}
