import "server-only";
import { headers } from "next/headers";

/** Derives the current request's origin from headers rather than a hardcoded env var, so email-confirmation links work the same in local dev and any deployment. */
export async function getSiteUrl() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}
