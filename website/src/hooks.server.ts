import { auth } from "$lib/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    // 1. Skip everything if we are just building
    if (building) return resolve(event);

    // 2. Emergency bypass for the hang: 
    // If the path isn't an API call, just render the page without auth for a second
    if (!event.url.pathname.startsWith('/api')) {
        return resolve(event);
    }

    // 3. Only run the auth handler for actual auth requests
    return svelteKitHandler({ event, resolve, auth });
};