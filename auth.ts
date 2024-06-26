import { getServerSession, type NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions =
    {
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
                profile(profile) {
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
            async jwt({ token, account }) {
                if (account) {
                    token.accessToken = account.access_token
                    token.refreshToken = account.refresh_token
                    token.expiresAt = account.expires_at
                }

                // If the token has expired, try to refresh it
                if (Date.now() > token.expiresAt * 1000) {
                    try {
                        const response = await fetch(
                            "https://api.login.yahoo.com/oauth2/get_token",
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                },
                                body: new URLSearchParams({
                                    client_id: process.env.YAHOO_CLIENT_ID! as string,
                                    client_secret: process.env.YAHOO_CLIENT_SECRET! as string,
                                    refresh_token: token.refreshToken as string,
                                    grant_type: 'refresh_token',
                                }),
                            }
                        )

                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`)
                        }

                        const refreshedTokens = await response.json()

                        return {
                            ...token,
                            accessToken: refreshedTokens.access_token,
                            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
                            expiresAt: Date.now() + refreshedTokens.expires_in * 1000,
                        }
                    } catch (error) {
                        console.error("Error refreshing access token", error)
                        return { ...token, error: "RefreshAccessTokenError" }
                    }
                }

             return token
            },
            async session({ session, token, user }) { 
                session.accessToken = token.accessToken as string
                return session;
            },
        }
    };

    export const getServerAuthSession = () => getServerSession(authOptions);