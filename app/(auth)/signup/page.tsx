import type { Metadata } from "next";
import { MessageBar } from "@/components/fluent";
import { RegisterShell } from "@/components/portal/register-shell";
import { SignupWizard } from "@/components/portal/signup-wizard";
import { getMyProfile, isParticipant, readSession } from "@/lib/api";
import { fromProfile } from "@/lib/screening-schema";

export const metadata: Metadata = { title: "Register · BIL Research" };

/**
 * Seven-step registration and master screening.
 *
 * Someone already signed in is updating rather than registering, so their
 * stored answers are read back and the wizard starts from them.
 */
export default async function SignupPage() {
  /*
   * No taxonomy fetch: topics are chosen on the interests page, so registration
   * no longer depends on that call being up to render its last step.
   */
  const editing = isParticipant(await readSession());
  const profileResult = editing ? await getMyProfile() : null;

  const stored = profileResult?.ok ? profileResult.data.profile : null;
  const { answers, declaredConditions, sectorExperience } = fromProfile(stored);

  return (
    <RegisterShell>
      {editing && (
        <MessageBar intent="info" title="You are updating the answers already on file.">
          The contact step is skipped: your name and email stay in the vault and an update never touches them. Change what you
          need and save.
        </MessageBar>
      )}

      <SignupWizard
        initialAnswers={answers}
        initialConditions={declaredConditions}
        initialSectorExperience={sectorExperience}
        editing={editing}
      />
    </RegisterShell>
  );
}
