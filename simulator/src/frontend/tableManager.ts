import { AgreementLogRow, AgreementEventType, FlexibilityLogRow } from "./types";

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
    console.log("new agreement", blockNumber);
    const clone = this.agreementLogTemplate.content.cloneNode(true) as Element;
    const cols = clone.querySelectorAll("td");
    if (eventType === "register") cols[0].classList.add("positive-bg");
    if (eventType === "revise") cols[0].classList.add("neutral-bg");
    if (eventType === "cancel") cols[0].classList.add("negative-bg");
    if (cols.length !== 6) throw new Error("Invalid template");
    cols[0].innerHTML = blockNumber.toString();
    cols[1].innerHTML = address;
    cols[2].innerHTML = value;
    cols[3].innerHTML = valuePrice;
    cols[4].innerHTML = flexibility;
    cols[5].innerHTML = flexibilityPrice;
    this.agreementLogTBody.prepend(clone);
  }

  public addFlexibilityLogRow({
    blockNumber,
    address,
    flexibility,
    reward,
    start,
  }: FlexibilityLogRow) {
    const clone = this.flexibilityLogTemplate.content.cloneNode(true) as Element;
    const cols = clone.querySelectorAll("td");
    if (cols.length !== 5) throw new Error("Invalid template");
    cols[0].innerHTML = blockNumber.toString();
    cols[1].innerHTML = address;
    cols[2].innerHTML = start.toString();
    cols[3].innerHTML = flexibility.toString();
    cols[4].innerHTML = reward.toString();
    this.flexibilityLogTBody.prepend(clone);
  }

  reset() {
    this.agreementLogTBody.replaceChildren();
    this.flexibilityLogTBody.replaceChildren();
  }
}
