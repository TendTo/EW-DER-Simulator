import { AgreementLogRow, FlexibilityLogRow } from "./types";

export default class TableManager {
  private readonly agreementLogTBody: HTMLElement;
  private readonly agreementLogTemplate: HTMLTemplateElement;
  private readonly flexibilityLogTBody: HTMLElement;
  private readonly flexibilityLogTemplate: HTMLTemplateElement;
  private readonly totalFlexibilityLogTBody: HTMLElement;
  private totalFlexibilityTR: HTMLElement;
  private readonly totalFlexibilityTemplate: HTMLTemplateElement;
  private flexibilityRows: Omit<FlexibilityLogRow, "id">[] = [];

  constructor() {
    this.agreementLogTBody = document.getElementById("agreementLogTBody");
    this.agreementLogTemplate = document.getElementById(
      "agreementLogTemplate"
    ) as HTMLTemplateElement;

    this.flexibilityLogTBody = document.getElementById("flexibilityLogTBody");
    this.flexibilityLogTemplate = document.getElementById(
      "flexibilityLogTemplate"
    ) as HTMLTemplateElement;

    this.totalFlexibilityLogTBody = document.getElementById("totalFlexibilityTBody");
    this.totalFlexibilityTemplate = document.getElementById(
      "totalFlexibilityTemplate"
    ) as HTMLTemplateElement;

    this.addTotalFlexibilityRow();
    console.log("totalFlexibilityTR", this.totalFlexibilityTR);
  }

  public addAgreementLogRow({
    blockNumber,
    address,
    value,
    valuePrice,
    flexibility,
    flexibilityPrice,
    className,
  }: AgreementLogRow) {
    const clone = this.agreementLogTemplate.content.cloneNode(true) as Element;
    const cols = clone.querySelectorAll("td");
    if (cols.length !== 6) throw new Error("AgreementLogRow: Invalid template");
    cols[0].classList.add(className);
    cols[0].innerHTML = blockNumber.toString();
    cols[1].innerHTML = address;
    cols[2].innerHTML = value;
    cols[3].innerHTML = valuePrice;
    cols[4].innerHTML = flexibility;
    cols[5].innerHTML = flexibilityPrice;
    this.agreementLogTBody.prepend(clone);
  }

  public addFlexibilityLogRow({
    id,
    nIoT,
    successStart,
    successFlexibility,
    percentageDIfference: averageValue,
    successReset,
    success,
  }: FlexibilityLogRow) {
    this.flexibilityRows.push({
      nIoT,
      successStart,
      successFlexibility,
      percentageDIfference: averageValue,
      successReset,
      success,
    });
    const clone = this.flexibilityLogTemplate.content.cloneNode(true) as Element;
    const cols = clone.querySelectorAll("td");
    if (cols.length !== 6) throw new Error("FlexibilityLogRow: Invalid template");
    cols[0].classList.add(success ? "positive-bg" : "negative-bg");
    cols[0].innerHTML = id.toString();
    cols[1].innerHTML = nIoT.toString();
    cols[2].innerHTML = (successStart * 100).toFixed(2) + "%";
    cols[3].innerHTML = (successFlexibility * 100).toFixed(2) + "%";
    cols[4].innerHTML = (averageValue * 100).toFixed(2) + "%";
    cols[5].innerHTML = (successReset * 100).toFixed(2) + "%";
    this.flexibilityLogTBody.prepend(clone);
    this.setTotalFlexibilityRow();
  }

  private setTotalFlexibilityRow() {
    const cols = this.totalFlexibilityTR.querySelectorAll("td");
    const [successStart, successFlexibility, successReset, averageValue, successful] =
      this.flexibilityRows.reduce(
        (acc, cur) => {
          acc[0] += cur.successStart;
          acc[1] += cur.successFlexibility;
          acc[2] += cur.successReset;
          acc[3] += cur.percentageDIfference;
          acc[4] += cur.success ? 1 : 0;
          return acc;
        },
        [0, 0, 0, 0, 0]
      );
    if (cols.length !== 7) throw new Error("TotalFlexibilityRow: Invalid template");
    cols[0].classList.add(
      successful / this.flexibilityRows.length > 0.95 ? "positive-bg" : "negative-bg"
    );
    cols[0].innerHTML = this.flexibilityRows.length.toString();
    cols[1].innerHTML = this.flexibilityRows[0] ? this.flexibilityRows[0].nIoT.toString() : "0";
    cols[2].innerHTML = ((successStart * 100) / this.flexibilityRows.length).toFixed(2) + "%";
    cols[3].innerHTML = ((successFlexibility * 100) / this.flexibilityRows.length).toFixed(2) + "%";
    cols[4].innerHTML = ((averageValue * 100) / this.flexibilityRows.length).toFixed(2) + "%";
    cols[5].innerHTML = ((successReset * 100) / this.flexibilityRows.length).toFixed(2) + "%";
    cols[6].innerHTML = ((successful * 100) / this.flexibilityRows.length).toFixed(2) + "%";
  }

  resetTotalFlexibilityRow() {
    const cols = this.totalFlexibilityTR.querySelectorAll("td");
    if (cols.length !== 6) throw new Error("TotalFlexibilityRow: Invalid template");
    cols[0].classList.remove("positive-bg", "negative-bg");
    cols[0].innerHTML = "";
    cols[1].innerHTML = "";
    cols[2].innerHTML = "";
    cols[3].innerHTML = "";
    cols[4].innerHTML = "";
    cols[5].innerHTML = "";
  }

  addTotalFlexibilityRow() {
    const clone = this.totalFlexibilityTemplate.content.cloneNode(true) as Element;
    this.totalFlexibilityTR = clone.querySelector("tr");
    this.totalFlexibilityLogTBody.prepend(this.totalFlexibilityTR);
  }

  reset() {
    this.agreementLogTBody.replaceChildren();
    this.addTotalFlexibilityRow();
    this.flexibilityRows = [];
  }
}
