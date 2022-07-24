import { AgreementLogRow, AgreementEventType } from "./types";

export default class TableManager {
  private readonly agreementLogTBody: HTMLElement;
  private readonly agreementLogTemplate: HTMLTemplateElement;
  private readonly flexibilityLogTBody: HTMLElement;
  private readonly flexibilityLogTemplate: HTMLTemplateElement;

  constructor() {
    this.agreementLogTBody = document.getElementById("agreementLogTBody");
    this.agreementLogTemplate = document.getElementById(
      "agreementLogTemplate"
    ) as HTMLTemplateElement;
    this.flexibilityLogTBody = document.getElementById("flexibilityLogTBody");
    this.flexibilityLogTemplate = document.getElementById(
      "flexibilityLogTemplate"
    ) as HTMLTemplateElement;
  }

  public addAgreementLogRow(
    { blockNumber, address, value, valuePrice, flexibility, flexibilityPrice }: AgreementLogRow,
    eventType: AgreementEventType
  ) {
    const clone = this.agreementLogTemplate.content.cloneNode(true) as Element;
    const cols = clone.querySelectorAll("td");
    if (eventType === "register") clone.classList.add("positive-bg");
    if (eventType === "revise") clone.classList.add("neutral-bg");
    if (eventType === "cancel") clone.classList.add("negative-bg");
    if (cols.length !== 6) throw new Error("Invalid template");
    cols[0].innerHTML = blockNumber.toString();
    cols[1].innerHTML = address;
    cols[2].innerHTML = value;
    cols[3].innerHTML = valuePrice;
    cols[4].innerHTML = flexibility;
    cols[5].innerHTML = flexibilityPrice;
    this.agreementLogTBody.prepend(clone);
  }

  public addFlexibilityLogRow(
    { blockNumber, address, value, valuePrice, flexibility, flexibilityPrice }: AgreementLogRow,
    eventType: AgreementEventType
  ) {
    const clone = this.agreementLogTemplate.content.cloneNode(true) as Element;
    const cols = clone.querySelectorAll("td");
    if (eventType === "register") clone.classList.add("positive-bg");
    if (eventType === "revise") clone.classList.add("neutral-bg");
    if (eventType === "cancel") clone.classList.add("negative-bg");
    if (cols.length !== 6) throw new Error("Invalid template");
    cols[0].innerHTML = blockNumber.toString();
    cols[1].innerHTML = address;
    cols[2].innerHTML = value;
    cols[3].innerHTML = valuePrice;
    cols[4].innerHTML = flexibility;
    cols[5].innerHTML = flexibilityPrice;
    this.agreementLogTBody.prepend(clone);
  }
}
