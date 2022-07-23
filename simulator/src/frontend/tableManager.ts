import { AgreementLogRow } from "./types";

export default class TableManager {
  private readonly addAgreementLogTBody: HTMLElement;
  private readonly addAgreementLogTemplate: HTMLTemplateElement;

  constructor() {
    this.addAgreementLogTBody = document.getElementById("addAgreementLogTBody");
    this.addAgreementLogTemplate = document.getElementById(
      "addAgreementLogTemplate"
    ) as HTMLTemplateElement;
  }

  public addAgreementLogRow({
    address,
    value,
    valuePrice,
    flexibility,
    flexibilityPrice,
  }: AgreementLogRow) {
    const clone = this.addAgreementLogTemplate.content.cloneNode(true) as Element;
    const cols = clone.querySelectorAll("td");
    if (cols.length !== 5) throw new Error("Invalid template");
    cols[0].innerHTML = address;
    cols[1].innerHTML = value;
    cols[2].innerHTML = valuePrice;
    cols[3].innerHTML = flexibility;
    cols[4].innerHTML = flexibilityPrice;
    this.addAgreementLogTBody.appendChild(clone);
  }
}
