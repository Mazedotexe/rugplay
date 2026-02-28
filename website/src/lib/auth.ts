import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
// FIXED: Removed getRequestEvent because it no longer exists
import { sveltekitCookies } from "better-auth/svelte-kit"; 
import { apiKey } from "better-auth/plugins";
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { db } from "./server/db";
import * as schema from "./server/db/schema";
import { generateUsername } from "./utils/random";
import { uploadProfilePicture } from "./server/s3";

if (!privateEnv.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID is not set');
if (!privateEnv.GOOGLE_CLIENT_SECRET) throw new Error('GOOGLE_CLIENT_SECRET is not set');
if (!publicEnv.PUBLIC_BETTER_AUTH_URL) throw new Error('PUBLIC_BETTER_AUTH_URL is not set');

export const auth = betterAuth({
    baseURL: publicEnv.PUBLIC_BETTER_AUTH_URL,
    secret: privateEnv.PRIVATE_BETTER_AUTH_SECRET,
    appName: "Rugplay",
    trustedOrigins: [
        publicEnv.PUBLIC_BETTER_AUTH_URL,
        "https://rugplay.com",
        "http://localhost:5173",
    ],
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema,
    }),
    plugins: [
        // FIXED: Removed getRequestEvent from here too
        sveltekitCookies(),
        apiKey({
            defaultPrefix: 'rgpl_',
            rateLimit: {
                enabled: true,
                timeWindow: 1000 * 60 * 60 * 24,
                maxRequests: 2000
            },
            permissions: {
                defaultPermissions: { api: ['read'] }
            }
        }),
    ],
    socialProviders: {
        google: {
            clientId: privateEnv.GOOGLE_CLIENT_ID,
            clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
            mapProfileToUser: async (profile) => {
                const newUsername = generateUsername();
                
                // Temporarily using Google's default picture URL instead of uploading to S3
                // We will re-enable S3 once your environment variables are set up
                return {
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture || null, 
                    username: newUsername,
                };
            },
        }
    },
    user: {
        additionalFields: {
            username: { type: "string", required: true, input: false },
            isAdmin: { type: "boolean", required: true, input: false },
            isBanned: { type: "boolean", required: false, input: false },
            banReason: { type: "string", required: false, input: false },
            baseCurrencyBalance: { type: "string", required: false, input: false },
            bio: { type: "string", required: false },
            volumeMaster: { type: "string", required: false, input: false },
            volumeMuted: { type: "boolean", required: false, input: false },
        }
    },
    session: {
        cookieCache: { enabled: true, maxAge: 60 * 5 }
    },
    advanced: {
        database: { generateId: false }
    }
});