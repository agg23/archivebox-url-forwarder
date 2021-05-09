import { browser } from "webextension-polyfill-ts";
import { hostToMatchPattern } from "../shared";

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await browser.storage.sync.get("host");

  const host: string | undefined = settings["host"];

  const inputs = document.getElementsByTagName("input");
  const input = inputs.length > 0 ? inputs[0] : undefined;

  if (input) {
    input.value = host ?? "";
  }

  const buttons = document.getElementsByTagName("button");
  const button = buttons.length > 0 ? buttons[0] : undefined;

  if (button) {
    button.addEventListener("click", async () => {
      const value = input?.value;

      browser.storage.sync.set({ host: value });

      if (value) {
        const newMatchPattern = hostToMatchPattern(value);
        const didComplete = await browser.permissions.request({
          origins: [newMatchPattern],
        });

        if (didComplete) {
          browser.runtime.sendMessage("saved");
        }
      } else {
        browser.runtime.sendMessage("saved");
      }
    });
  }
});
