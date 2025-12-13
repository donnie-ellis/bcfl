import { getServerSession, type NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Account, User, Profile } from "next-auth";
import { getServerSupabaseClient } from '@/lib/serverSupabaseClient';

interface ExtendedJWT extends JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    userId?: string;
    error?: string;
}

interface ExtendedSession {
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
    accessToken?: string;
    expires: string;
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
            clientId: process.env.YAHOO_CLIENT_ID!,
            clientSecret: process.env.YAHOO_CLIENT_SECRET!,
            wellKnown: 'https://api.login.yahoo.com/.well-known/openid-configuration',
            authorization: {
                url: "https://api.login.yahoo.com/oauth2/request_auth",
                params: {
                    client_id: process.env.YAHOO_CLIENT_ID!,
                    redirect_uri: process.env.REDIRECT_URI!,
                    response_type: 'code'
                }
            },
            token: "https://api.login.yahoo.com/oauth2/get_token",
            profile(profile: Profile & { 
                sub: string; 
                name?: string; 
                email?: string; 
                picture?: string; 
            }) {
                return {
                    id: profile.sub,
                    name: profile.name || null,
                    email: profile.email || null,
                    image: profile.picture || null
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
        async signIn({ user, account }: { user: User; account: Account | null }) {
            if (!user.email || !account) return false;
            const supabase = getServerSupabaseClient();

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

            const userId = user.id; // Use the ID provided by Yahoo

            if (!existingUser) {
                const { error: createError } = await supabase
                    .from('users')
                    .insert({
                        id: userId,
                        email: user.email,
                        name: user.name,
                        image: user.image
                    })
                    .select('id')
                    .single();

                if (createError) {
                    console.error("Error creating user:", createError);
                    return false;
                }
            }

            // Store session information
            const { error: sessionError } = await supabase
                .from('sessions')
                .insert({
                    user_id: userId,
                    access_token: account.access_token!,
                    refresh_token: account.refresh_token!,
                    expires_at: new Date(account.expires_at! * 1000).toISOString()
                });

            if (sessionError) {
                console.error("Error storing session:", sessionError);
                return false;
            }

            return true;
        },
        async jwt({ token, account, user }: { 
            token: ExtendedJWT; 
            account: Account | null; 
            user: User | null; 
        }) {
            if (account && user) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
                token.userId = user.id;
            }

            // If the token has expired, try to refresh it
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
                                client_id: process.env.YAHOO_CLIENT_ID!,
                                client_secret: process.env.YAHOO_CLIENT_SECRET!,
                                refresh_token: token.refreshToken!,
                                grant_type: 'refresh_token',
                            }),
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const refreshedTokens = await response.json();
                    const supabase = getServerSupabaseClient();

                    // Update token in database
                    const { error: updateError } = await supabase
                        .from('sessions')
                        .update({
                            access_token: refreshedTokens.access_token,
                            refresh_token: refreshedTokens.refresh_token ?? token.refreshToken,
                            expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString()
                        })
                        .eq('user_id', token.userId!);

                    if (updateError) {
                        console.error("Error updating session:", updateError);
                        return { ...token, error: "RefreshAccessTokenError" };
                    }

                    return {
                        ...token,
                        accessToken: refreshedTokens.access_token,
                        refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
                        expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
                    };
                } catch (error) {
                    console.error("Error refreshing access token", error);
                    return { ...token, error: "RefreshAccessTokenError" };
                }
            }

            return token;
        },
        async session({ session, token }: { 
            session: ExtendedSession; 
            token: ExtendedJWT; 
        }) {
            const supabase = getServerSupabaseClient();``
            if (token.userId) {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id, email, name, image')
                    .eq('id', token.userId)
                    .single();

                if (userError) {
                    console.error("Error fetching user data:", userError);
                } else {
                    session.user = {
                        ...session.user,
                        ...userData,
                        id: token.userId
                    };
                }

                const { data: sessionData, error: sessionError } = await supabase
                    .from('sessions')
                    .select('access_token')
                    .eq('user_id', token.userId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (sessionError) {
                    console.error("Error fetching session data:", sessionError);
                } else {
                    session.accessToken = sessionData.access_token;
                }
            } else {
                console.error("No userId found in token");
            }

            return session;
        },
    }
};

export const getServerAuthSession = () => getServerSession(authOptions);