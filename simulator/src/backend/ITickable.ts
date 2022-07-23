import { Season } from "./constants";

export default interface ITickable {
  onTick(season: Season, day: number, hour: number): void;
}
