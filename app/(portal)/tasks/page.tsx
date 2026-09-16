import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Breadcrumb, MessageBar, PageHeader } from "@/components/fluent";
import { TaskForms } from "@/components/portal/task-forms";
import { DataError } from "@/components/ui/data-error";
import { getMyTasks, isParticipant, pageData, readSession } from "@/lib/api";

export const metadata: Metadata = { title: "Your session · BIL Research" };

const CRUMBS = [{ label: "Studies", href: "/" }, { label: "Your session" }];

/**
 * The study itself, as the participant answers it.
 *
 * A task opens when its session starts and closes once it is answered, so this
 * page is empty except while a session is actually running — which is the point
 * at which a supervised participant is sitting in front of it.
 */
export default async function TasksPage() {
  if (!isParticipant(await readSession())) redirect("/sign-in?next=/tasks");

  const tasks = pageData(await getMyTasks(), "/sign-in");
  if (!tasks.ok) return <DataError breadcrumb={CRUMBS} title="Your session" message={tasks.message} />;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={CRUMBS} />
      <PageHeader title="Your session" description="The questions for the study you are sitting." />

      {tasks.data.length === 0 ? (
        <MessageBar intent="info" title="Nothing to answer right now.">
          The questions for a study appear here once its session has started.
        </MessageBar>
      ) : (
        <TaskForms tasks={tasks.data} />
      )}
    </div>
  );
}
