import { Breadcrumb, MessageBar, PageHeader } from "@/components/fluent";

interface Crumb {
  label: string;
  href?: string;
}

interface DataErrorProps {
  /** Same crumbs and title the view would carry, so the page stays recognisable. */
  breadcrumb: Crumb[];
  title: string;
  /** Plain-language sentence from the API layer. Never a stack or a status code. */
  message: string;
}

/**
 * Stands in for a view whose data could not be loaded. It keeps the page's
 * frame so the person knows where they are, and says what to do next rather
 * than leaving an empty screen.
 */
export function DataError({ breadcrumb, title, message }: DataErrorProps) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <Breadcrumb items={breadcrumb} />
      <PageHeader title={title} />
      <MessageBar intent="error" title="This view could not be loaded" live>
        {message} Reload the page to try again.
      </MessageBar>
    </section>
  );
}
