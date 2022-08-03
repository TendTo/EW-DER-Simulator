import { BigNumber } from "ethers";

export enum EnergySource {
  Battery,
  Solar,
  Wind,
  Hydro,
  Biomass,
  Nuclear,
  Other,
}
export enum Season {
  Winter,
  Spring,
  Summer,
  Autumn,
}

export const ETHPerIoT = BigNumber.from("10000000000000000");
export const PersonalEventProbability = 0;
export const MeteoEventProbability = 0;
export const FlexibilityErrorMargin = 10;
export const FlexibilityStartOffset = 15 * 60;
export const FlexibilityEndOffset = 30 * 60;
