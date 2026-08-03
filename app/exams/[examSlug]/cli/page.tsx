import { CliPracticePanel } from "@/components/cli/CliPracticePanel";

export default function CliPracticePage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-fluid-xl font-semibold text-foreground">CLI Practice</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A simulated Windows shell on a fixed practice network. Run the commands the exam expects
          you to read the output of.
        </p>
      </div>
      <CliPracticePanel />
    </div>
  );
}
