import { auth } from "$lib/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    if (building) return resolve(event);

    // This handles the login/session logic safely
    return svelteKitHandler({ event, resolve, auth });
}

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    // ADD THIS SECTION:
    trustedOrigins: [
        "http://localhost:5173", 
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""
    ],
    // If you are using SvelteKit, make sure this plugin is there too:
    plugins: [sveltekitCookies(getRequestEvent)], 
});