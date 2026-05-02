export type PkgFormat = "snoroh";

export function buildInstallUrl(format: PkgFormat, id: string): string {
  return `${format}://install?id=${encodeURIComponent(id)}&v=1`;
}

export const DOWNLOAD_URL: Record<PkgFormat, string> = {
  snoroh: "https://github.com/thanh-dong/snor-oh/releases/latest",
};
