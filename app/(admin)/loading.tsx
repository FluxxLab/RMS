import { Loader } from "@/components/ui/loader";

/*
 * Shown while a page in this section is being fetched.
 *
 * It sits at the group level rather than on each page: every route here renders
 * inside the same shell, so the nav stays put and only the content region is
 * replaced — which is what makes moving between tabs feel answered rather than
 * frozen.
 */
export default function Loading() {
  return <Loader />;
}
