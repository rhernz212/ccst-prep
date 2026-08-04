import { notFound } from "next/navigation";
import { SubnetCalculatorForm } from "@/components/subnetting/SubnetCalculatorForm";
import { SubnetPracticeCard } from "@/components/subnetting/SubnetPracticeCard";
import { getExamMeta } from "@/lib/content/exam-content";
import { hasExamTool } from "@/lib/content/exam-tools";

export default async function SubnettingPage({
  params,
}: {
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam || !hasExamTool(exam, "subnetting")) notFound();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-fluid-xl font-semibold text-foreground">Subnetting</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Work a problem, check it against the calculator, repeat until the maths is automatic.
        </p>
      </div>
      {/* Practice above the calculator: the drill is the point, and leading
          with the answer machine invites using it instead of doing the work. */}
      <div className="space-y-4">
        <SubnetPracticeCard />
        <SubnetCalculatorForm />
      </div>
    </div>
  );
}
