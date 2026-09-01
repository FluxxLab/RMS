import type { Metadata } from "next";
import { Breadcrumb, MessageBar } from "@/components/fluent";
import { SignupWizard } from "@/components/portal/signup-wizard";
import { DataError } from "@/components/ui/data-error";
import { getMyInterests, getMyProfile, getTaxonomy, isParticipant, pageData, readSession } from "@/lib/api";
import { fromProfile } from "@/lib/screening-schema";

export const metadata: Metadata = { title: "Register · BIL Research" };

const CRUMBS = [{ label: "Studies", href: "/" }, { label: "Register" }];

/**
 * Seven-step registration and master screening.
 *
 * Someone already signed in is updating rather than registering, so their
 * stored answers are read back and the wizard starts from them.
 */
export default async function SignupPage() {
  const taxonomy = pageData(await getTaxonomy());
  if (!taxonomy.ok) return <DataError breadcrumb={CRUMBS} title="Register" message={taxonomy.message} />;

  const editing = isParticipant(await readSession());
  const [profileResult, interestsResult] = editing
    ? await Promise.all([getMyProfile(), getMyInterests()])
    : [null, null];

  const stored = profileResult?.ok ? profileResult.data.profile : null;
  const { answers, declaredConditions } = fromProfile(stored);
  const interests = interestsResult?.ok ? interestsResult.data : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <Breadcrumb items={[{ label: "Studies", href: "/" }, { label: editing ? "Update your profile" : "Register" }]} />

      {editing && (
        <MessageBar intent="info" title="You are updating the answers already on file.">
          The contact step is skipped: your name and email stay in the vault and an update never touches them. Change what you
          need and save.
        </MessageBar>
      )}

      <div className="flex min-h-0 flex-1 justify-center">
        <SignupWizard
          taxonomy={taxonomy.data.map((tag) => tag.label)}
          initialAnswers={answers}
          initialConditions={declaredConditions}
          initialInterests={interests}
          editing={editing}
        />
      </div>
    </div>
  );
}
