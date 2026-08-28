export function isNetworkLikeError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    message.includes("failed to fetch") ||
    message.includes("network")
  );
}
