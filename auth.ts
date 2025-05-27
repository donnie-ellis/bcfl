import { getServerSession, type NextAuthOptions } from "next-auth";
import { createClient } from '@supabase/supabase-js';
import { JWT } from "next-auth/jwt";

// Validate environment variables at startup
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables.");
}
if (!process.env.YAHOO_CLIENT_ID || !process.env.YAHOO_CLIENT_SECRET || !process.env.REDIRECT_URI) {
    throw new Error("Missing Yahoo OAuth environment variables.");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

interface ExtendedJWT extends JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    userId?: string;
}

export const authOptions: NextAuthOptions = {
    session: {
        strategy: 'jwt'
    },
    providers: [
        {
            id: 'yahoo',
            name: 'Yahoo',
            type: 'oauth',
            version: '1',
            issuer: 'https://api.login.yahoo.com',
            idToken: true,
            userinfo: 'https://api.login.yahoo.com/openid/v1/userinfo',
            clientId: process.env.YAHOO_CLIENT_ID,
            clientSecret: process.env.YAHOO_CLIENT_SECRET,
            wellKnown: 'https://api.login.yahoo.com/.well-known/openid-configuration',
            authorization: {
                url: "https://api.login.yahoo.com/oauth2/request_auth",
                params: {
                    client_id: process.env.YAHOO_CLIENT_ID,
                    redirect_uri: process.env.REDIRECT_URI,
                    response_type: 'code'
                }
            },
            token: "https://api.login.yahoo.com/oauth2/get_token",
            profile(profile: { sub: string; name: string; email: string; picture: string }) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture
                }
            },
            client: {
                authorization_signed_response_alg: 'ES256',
                id_token_signed_response_alg: 'ES256',
            },
            checks: ['state'],
        },
    ],
    callbacks: {
        async signIn({ user }) {
            if (!user.email) return false;

            // Check if user exists, if not create a new user
            const { data: existingUser, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('email', user.email)
                .single();

            if (userError && userError.code !== 'PGRST116') {
                console.error("Error checking user:", userError);
                return false;
            }

            if (!existingUser) {
                const { error: createError } = await supabase
                    .from('users')
                    .insert({
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        image: user.image
                    });

                if (createError) {
                    console.error("Error creating user:", createError);
                    return false;
                }
            }

            return true;
        },
        async jwt({ token, account, user }: { token: ExtendedJWT, account: any, user: any }) {
            // Store tokens in JWT only, not in Supabase
            if (account && user) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
                token.userId = user.id;
            }

            // Refresh token if expired
            if (token.expiresAt && typeof token.expiresAt === 'number' && Date.now() > token.expiresAt * 1000) {
                try {
                    const response = await fetch(
                        "https://api.login.yahoo.com/oauth2/get_token",
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: new URLSearchParams({
                                client_id: process.env.YAHOO_CLIENT_ID as string,
                                client_secret: process.env.YAHOO_CLIENT_SECRET as string,
                                refresh_token: token.refreshToken as string,
                                grant_type: 'refresh_token',
                            }),
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const refreshedTokens = await response.json();

                    return {
                        ...token,
                        accessToken: refreshedTokens.access_token,
                        refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
                        expiresAt: Date.now() + refreshedTokens.expires_in * 1000,
                    };
                } catch (error) {
                    console.error("Error refreshing access token", error);
                    return { ...token, error: "RefreshAccessTokenError" };
                }
            }

            return token;
        },
        async session({ session, token }) {
            // Attach user info from JWT to session
            // Test the session token
            if (typeof token.accessToken !== 'string' || !token.userId) {
                throw new Error("Invalid or messing session accessToken");
            }
            if (typeof token.userId !== "string" || !token.userId) {
               throw new Error("Invalid or missing userId in token");
            }
            session.user = {
                ...session.user,
                id: token.userId,
            };
            session.accessToken = token.accessToken;
            return session;
        },
    }
};

export const getServerAuthSession = () => getServerSession(authOptions);