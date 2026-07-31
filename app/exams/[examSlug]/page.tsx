import { redirect } from "next/navigation";

export default async function ExamIndexPage({
  params,
}: {
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  redirect(`/exams/${examSlug}/study`);
}
