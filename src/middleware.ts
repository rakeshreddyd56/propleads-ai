import { clerkMiddleware } from "@clerk/nextjs/server";

// Minimal middleware — just sets Clerk auth context.
// Route-level auth is handled by resolveOrg() in each API route/page.
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};
