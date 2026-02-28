import { auth } from "$lib/auth";
import type { RequestHandler } from "./$types";

// This forces SvelteKit to pass all /api/auth/* requests directly to Better Auth
export const fallback: RequestHandler = async ({ request }) => {
	return auth.handler(request);
};