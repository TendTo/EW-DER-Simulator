import { PersonalEventProbability } from "../../constants";
import BaseEvent from "./BaseEvent";

export default class PersonalEvent extends BaseEvent {
  public static rollForEvent(timestamp: number) {
    if (Math.random() < PersonalEventProbability) {
      const intensity = Math.random() * 20 - 10;
      const duration = Math.floor(Math.random() * 10) + 1;
      return new this(intensity, duration, timestamp);
    }
    return null;
  }
}
