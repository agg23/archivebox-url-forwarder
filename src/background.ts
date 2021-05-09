import { browser } from "webextension-polyfill-ts";
import { hostToMatchPattern } from "./shared";

const MIN_OPEN_TIME = 10 * 1000;

const SEND_TICK_TIME = 60 * 1000;

console.log("Running in background");

interface Entry {
  url: string;
  timestamp: number;
  hasSent: boolean;
}

const parser = new DOMParser();

const tabMap = new Map<
  number,
  {
    url: string;
    timestamp: number;
    hasSent: boolean;
  }
>();

let host: string | undefined = undefined;

const fetchAndGetToken = async (url: string) => {
  const response = await fetch(url);

  if (response.status !== 200) {
    throw new Error(`Unexpected status code ${response.status}`);
  }

  const body = await response.text();

  if (!body) {
    throw new Error("Empty body received");
  }

  const receivedDocument = parser.parseFromString(body, "text/html");

  const node: HTMLInputElement | null = receivedDocument.querySelector(
    "[name=csrfmiddlewaretoken]"
  );
  return node?.value;
};

const sendUrl = async (url: string) => {
  if (!host) {
    console.error("Cannot send URL; no host set");
    return;
  }

  console.log(`Sending visit ${url}`);

  const token = await fetchAndGetToken(`${host}/add/`);

  if (!token) {
    throw new Error("Could not extract token");
  }

  fetch(`${host}/add/`, {
    method: "POST",
    headers: {
      "X-CSRFToken": token,
    },
    body: new URLSearchParams({
      url,
      parser: "auto",
      depth: "0",
    }),
  })
    .then((response) => {
      if (response.status !== 200) {
        console.error(`Failed to save ${url}`);
      }
    })
    .catch(() => console.error(`Failed to save ${url}`));
};

const checkEntry = (entry: Entry): boolean => {
  if (!entry.hasSent && entry.timestamp + MIN_OPEN_TIME <= Date.now()) {
    // Send visited URL
    entry.hasSent = true;
    sendUrl(entry.url);
    return true;
  }

  return false;
};

const init = () => {
  browser.runtime.onMessage.addListener(async () => {
    // New host saved
    const settings = await browser.storage.sync.get("host");
    const hostSetting: string | undefined = settings["host"];

    if (!hostSetting) {
      host = undefined;
      return;
    }

    const oldHost = host;

    if (oldHost) {
      const oldMatchPattern = hostToMatchPattern(oldHost);
      browser.permissions.remove({
        origins: [oldMatchPattern],
      });
    }

    host = hostSetting;
  });

  browser.tabs.onUpdated.addListener((id, changeInfo, { url }) => {
    if (!url) {
      return;
    }

    const existingEntry = tabMap.get(id);

    if (existingEntry) {
      checkEntry(existingEntry);

      if (existingEntry.url === url) {
        return;
      }
    }

    tabMap.set(id, {
      url,
      timestamp: Date.now(),
      hasSent: false,
    });
  });

  browser.tabs.onRemoved.addListener((id) => {
    const existingEntry = tabMap.get(id);

    if (!existingEntry) {
      return;
    }

    checkEntry(existingEntry);

    tabMap.delete(id);
  });

  setInterval(() => {
    for (const [, entry] of tabMap.entries()) {
      checkEntry(entry);
    }
  }, SEND_TICK_TIME);
};

init();
