import { AgreementLogRow, EventType } from "./types";

export default class TableManager {
  private readonly addAgreementLogTBody: HTMLElement;
  private readonly addAgreementLogTemplate: HTMLTemplateElement;

  constructor() {
    this.addAgreementLogTBody = document.getElementById("addAgreementLogTBody");
    this.addAgreementLogTemplate = document.getElementById(
      "addAgreementLogTemplate"
    ) as HTMLTemplateElement;
  }

  public addAgreementLogRow(
    { blockNumber, address, value, valuePrice, flexibility, flexibilityPrice }: AgreementLogRow,
    eventType: EventType
  ) {
    const clone = this.addAgreementLogTemplate.content.cloneNode(true) as Element;
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
    this.addAgreementLogTBody.appendChild(clone);
  }
}
