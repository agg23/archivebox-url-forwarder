import { browser } from "webextension-polyfill-ts";

const MIN_OPEN_TIME = 10 * 1000;

const SEND_TICK_TIME = 60 * 1000;

console.log("Running in background");

interface Entry {
  url: string;
  timestamp: number;
  hasSent: boolean;
}

const parser = new DOMParser();

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
  console.log(`Sending visit ${url}`);

  const token = await fetchAndGetToken("http://192.168.1.241:8000/add/");

  if (!token) {
    throw new Error("Could not extract token");
  }

  const response = await fetch("http://192.168.1.241:8000/add/", {
    method: "POST",
    headers: {
      "X-CSRFToken": token,
    },
    body: new URLSearchParams({
      url,
      parser: "auto",
      depth: "0",
    }),
  });

  console.log(response);
  console.log(response.body);
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

const tabMap = new Map<
  number,
  {
    url: string;
    timestamp: number;
    hasSent: boolean;
  }
>();

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
