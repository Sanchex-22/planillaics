import { clerkMiddleware, clerkClient, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(['/dashboard/(.*)']);
const isUserProtectedRoute = createRouteMatcher(['/dashboard/(.*)']);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return null
  }
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const role = (user.publicMetadata.role as string | undefined) ?? "user";

  if (role !== "admin" && isProtectedRoute(req)) {
    return redirectToSignIn();
  }

  if (role === "user" && isUserProtectedRoute(req)) {
    return redirectToSignIn();
  }

});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
