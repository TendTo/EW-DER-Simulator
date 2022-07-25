import ITickable from "../ITickable";

export default interface IIoT extends ITickable {
  address: string;

  startProducing(): Promise<void>;

  stopProducing(): void;

  listenToEvents(): void;
}
