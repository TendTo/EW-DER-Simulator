export default class ButtonWrapper {
  private readonly buttons: HTMLButtonElement[];
  private readonly spinner: HTMLDivElement;
  private readonly startButton: HTMLButtonElement;
  private readonly stopButton: HTMLButtonElement;

  constructor() {
    this.buttons = Array.from(document.querySelectorAll("button"));
    this.startButton = document.getElementById("start") as HTMLButtonElement;
    this.stopButton = document.getElementById("stop") as HTMLButtonElement;
    this.spinner = document.getElementById("spinner") as HTMLDivElement;
  }

  public loading(loading: boolean) {
    this.buttons.forEach((button) => {
      button.disabled = loading;
    });
    this.spinner.style.display = loading ? "block" : "none";
  }

  public playing(playing: boolean) {
    this.stopButton.disabled = !playing;
    this.startButton.disabled = playing;
  }
}
