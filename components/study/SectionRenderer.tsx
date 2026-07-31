/**
 * Renders pre-sanitized chapter HTML (sanitized once at ingestion time,
 * see scripts/ingest/sanitize.ts) — never pass unsanitized/user-supplied
 * HTML through this component.
 */
export function SectionRenderer({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
