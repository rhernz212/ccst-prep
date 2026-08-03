import { SubnetCalculatorForm } from "@/components/subnetting/SubnetCalculatorForm";
import { SubnetPracticeCard } from "@/components/subnetting/SubnetPracticeCard";

export default function SubnettingPage() {
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
