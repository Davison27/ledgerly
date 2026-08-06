export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;

  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  if (uaData?.platform) return /mac/i.test(uaData.platform);

  return /mac/i.test(navigator.platform || navigator.userAgent);
}
