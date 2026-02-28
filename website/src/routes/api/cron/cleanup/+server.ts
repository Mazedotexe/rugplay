import { json } from '@sveltejs/kit';
import { minesCleanupInactiveGames } from '$lib/server/games/mines';

export async function GET({ request }) {
    // Optional: Check VERCEL_CRON_SECRET for security
    await minesCleanupInactiveGames();
    return json({ success: true });
}