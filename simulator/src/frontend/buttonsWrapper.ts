export default class ButtonWrapper {
  private readonly buttons: HTMLButtonElement[];
  private readonly spinner: HTMLDivElement;

  constructor() {
    this.buttons = Array.from(document.querySelectorAll("button"));
    this.spinner = document.getElementById("spinner") as HTMLDivElement;
  }

  public loading(loading: boolean) {
    this.buttons.forEach((button) => {
      button.disabled = loading;
    });
    this.spinner.style.display = loading ? "block" : "none";
  }
}
