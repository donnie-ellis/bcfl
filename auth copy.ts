import NextAuth, { NextAuthConfig } from "next-auth"

export const options: NextAuthConfig =
    {
        providers: [
            {
                id: 'yahoo',
                name: 'Yahoo',
                type: 'oauth',
                issuer: 'https://api.login.yahoo.com',
                clientId: process.env.YAHOO_CLIENT_ID!,
                clientSecret: process.env.YAHOO_CLIENT_SECRET!,
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
                    checks: ['state']
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
                                    client_id: process.env.YAHOO_CLIENT_ID!,
                                    client_secret: process.env.YAHOO_CLIENT_SECRET!,
                                    refresh_token: token.refreshToken,
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
        }
    };

export const { handlers, auth, signIn, signOut } = NextAuth(options)
