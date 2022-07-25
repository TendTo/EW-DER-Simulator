import { ClockTickCallback } from "../module";

export default interface ITickable {
  onTick: ClockTickCallback;
}
