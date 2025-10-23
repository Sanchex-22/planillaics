import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
// import { getFirstBranchByUserId } from "~/services/branchesServices";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
//   const branch = await getFirstBranchByUserId(user.id);
//   if (!branch) redirect("/no-branch");
}
