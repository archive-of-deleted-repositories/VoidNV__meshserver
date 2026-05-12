export async function open(options?: { directory?: boolean; multiple?: boolean }) {
  const label = options?.directory ? "Server folder path" : "Server file path";
  const value = window.prompt(label);
  if (!value) return null;
  return options?.multiple ? [value] : value;
}
