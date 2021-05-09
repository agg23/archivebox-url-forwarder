const urlRegex = /(https?:\/\/)?([-a-zA-Z0-9@:%._\+~#=]+\.[a-zA-Z0-9]+)(:[0-9]+)?\/?(.*)/;

export const hostToMatchPattern = (hostURL: string): string => {
  const matches = hostURL.match(urlRegex);

  if (!matches) {
    throw new Error(`No matches for URL ${hostURL}`);
  }

  const protocol = matches[1] ?? "*://";
  const domain = matches[2];
  // const port = matches[3] ?? "";
  const path = matches[4] ?? "";

  return `${protocol}${domain}/${path}`;
};
