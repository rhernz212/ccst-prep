import { SubnetCalculatorForm } from "@/components/subnetting/SubnetCalculatorForm";
import { SubnetPracticeCard } from "@/components/subnetting/SubnetPracticeCard";

export default function SubnettingPage() {
  return (
    <div className="space-y-8">
      <SubnetCalculatorForm />
      <SubnetPracticeCard />
    </div>
  );
}
