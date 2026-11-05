import { redirect } from "next/navigation";

export default function JobsCreateRedirect() {
  redirect("/jobs/new");
}
