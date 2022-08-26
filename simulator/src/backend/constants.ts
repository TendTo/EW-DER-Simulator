import { BigNumber, ethers } from "ethers";

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

export enum NodeErrors {
  UNPREDICTABLE_GAS_LIMIT = "UNPREDICTABLE_GAS_LIMIT",
}

export const ETHPerIoT = BigNumber.from("10000000000000000");
export const PersonalEventProbability = 0;
export const MeteoEventProbability = 0;
export const FlexibilityErrorMargin = 10;
export const FlexibilityStartOffset = 15 * 60;
export const FlexibilityEndOffset = 30 * 60;
export const maxFeePerGas = ethers.utils.parseUnits("1.7", "gwei");
export const maxPriorityFeePerGas = ethers.utils.parseUnits("1.6", "gwei");
export const gasPrice = ethers.utils.parseUnits("25", "gwei");
