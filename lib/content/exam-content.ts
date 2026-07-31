import "server-only";

/**
 * Guarded re-export of the fs-based content reader for use from Next.js
 * Server Components/routes — the "server-only" import fails the build if
 * this ever gets pulled into client code. Plain Node scripts (ingestion,
 * seeding) that can't go through Next's bundler import ./content-reader
 * directly instead, since "server-only"'s guard only works within a
 * bundler context.
 */
export * from "./content-reader";
