import { createClerkClient, ClerkClient } from "@clerk/express";

let clerk: ClerkClient;

function getClerk(): ClerkClient {
  if (!clerk) {
    clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY?.trim(),
    });
  }
  return clerk;
}

/**
 * Fetch the user's role from Clerk's public_metadata via the Backend API.
 * This works regardless of session token template configuration.
 */
export async function getUserRole(clerkUserId: string): Promise<string> {
  try {
    const user = await getClerk().users.getUser(clerkUserId);
    return (user.publicMetadata?.role as string) || "user";
  } catch (error) {
    console.error("getUserRole failed:", error);
    return "user";
  }
}
