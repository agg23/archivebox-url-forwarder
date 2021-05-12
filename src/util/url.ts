const match: (testUrl: string, configUrl: string) => boolean = require("smurl");

const DEFAULT_FILTER_URLS = [
  "*.twitch.tv",
  "*.youtube.com",
  "*.vimeo.com",
].flatMap((url) => {
  if (url.startsWith("*.")) {
    return [url, url.slice(2)];
  }

  return [url];
});

export const filterUrl = (urlString: string) =>
  !!DEFAULT_FILTER_URLS.find((configUrl) => match(urlString, configUrl));
