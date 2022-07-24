import { TransactionReceipt } from "@ethersproject/providers";
import { Season } from "../constants";

export default interface IIoT {
  address: string;

  startProducing(): Promise<void>;

  onTick(season: Season, day: number, hour: number): Promise<void>;

  stopProducing(): void;

  listenToEvents(): void;
}
