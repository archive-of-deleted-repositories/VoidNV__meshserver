export type BrowserOpenOptions = {
  directory?: boolean;
  multiple?: boolean;
};

export async function promptServerPath(
  options?: BrowserOpenOptions,
  currentValue = "",
): Promise<string | string[] | null> {
  const label = options?.directory ? "Server folder path" : "Server file path";
  const value = window.prompt(label, currentValue);
  if (!value) return null;
  if (!options?.multiple) return value;
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}
