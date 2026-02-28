import { json, error } from '@sveltejs/kit';
import { minesCleanupInactiveGames, minesAutoCashout } from '$lib/server/games/mines';
import { resolveExpiredQuestions, processAccountDeletions } from '$lib/server/job';
import { CRON_SECRET } from '$env/static/private';

export async function GET({ url }) {
    // 🛡️ Security: Check for a secret key so random people can't trigger your cron
    const secret = url.searchParams.get('secret');
    if (secret !== CRON_SECRET) {
        throw error(401, 'Unauthorized');
    }

    try {
        // Run all your background tasks
        await Promise.all([
            minesCleanupInactiveGames(),
            minesAutoCashout(),
            resolveExpiredQuestions(),
            processAccountDeletions()
        ]);

        return json({ success: true, timestamp: new Date().toISOString() });
    } catch (err) {
        console.error('Cron Error:', err);
        throw error(500, 'Internal Server Error');
    }
}