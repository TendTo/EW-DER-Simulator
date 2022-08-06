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

export enum ContractEvents {
  CancelAgreement = "CancelAgreement",
  EndRequestFlexibility = "EndRequestFlexibility",
  FlexibilityProvisioningError = "FlexibilityProvisioningError",
  FlexibilityProvisioningSuccess = "FlexibilityProvisioningSuccess",
  RegisterAgreement = "RegisterAgreement",
  RequestFlexibility = "RequestFlexibility",
  ReviseAgreement = "ReviseAgreement",
  RewardProduction = "RewardProduction",
  StartFlexibilityProvisioning = "StartFlexibilityProvisioning",
}
