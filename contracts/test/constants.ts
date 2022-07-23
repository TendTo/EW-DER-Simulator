export enum EnergySource {
  Battery,
  Solar,
  Wind,
  Hydro,
  Biomass,
  Nuclear,
  Other,
}

export enum ContractError {
  AgreementAlreadyExistsError = "AgreementAlreadyExistsError",
  AgreementDoesNotExistsError = "AgreementDoesNotExistsError",
  ZeroValueError = "ZeroValueError",
  UnauthorizedAggregatorError = "UnauthorizedAggregatorError",
  FlexibilityError = "FlexibilityError",
  FlexibilityRequestNotFoundError = "FlexibilityRequestNotFoundError",
}
