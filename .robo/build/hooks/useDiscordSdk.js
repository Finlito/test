import { DiscordSDK, DiscordSDKMock } from "@discord/embedded-app-sdk";
import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
const queryParams = new URLSearchParams(window.location.search);
const isEmbedded = queryParams.get('frame_id') != null;
let discordSdk;
if (isEmbedded) {
    discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
} else {
    // We're using session storage for user_id, guild_id, and channel_id
    // This way the user/guild/channel will be maintained until the tab is closed, even if you refresh
    // Session storage will generate new unique mocks for each tab you open
    // Any of these values can be overridden via query parameters
    // i.e. if you set https://my-tunnel-url.com/?user_id=test_user_id
    // this will override this will override the session user_id value
    const mockUserId = getOverrideOrRandomSessionValue('user_id');
    const mockGuildId = getOverrideOrRandomSessionValue('guild_id');
    const mockChannelId = getOverrideOrRandomSessionValue('channel_id');
    discordSdk = new DiscordSDKMock(import.meta.env.VITE_DISCORD_CLIENT_ID, mockGuildId, mockChannelId);
    const discriminator = String(mockUserId.charCodeAt(0) % 5);
    discordSdk._updateCommandMocks({
        authenticate: async ()=>{
            return {
                access_token: 'mock_token',
                user: {
                    username: mockUserId,
                    discriminator,
                    id: mockUserId,
                    avatar: null,
                    public_flags: 1
                },
                scopes: [],
                expires: new Date(2112, 1, 1).toString(),
                application: {
                    description: 'mock_app_description',
                    icon: 'mock_app_icon',
                    id: 'mock_app_id',
                    name: 'mock_app_name'
                }
            };
        }
    });
}
export { discordSdk };
var SessionStorageQueryParam = /*#__PURE__*/ function(SessionStorageQueryParam) {
    SessionStorageQueryParam["user_id"] = "user_id";
    SessionStorageQueryParam["guild_id"] = "guild_id";
    SessionStorageQueryParam["channel_id"] = "channel_id";
    return SessionStorageQueryParam;
}(SessionStorageQueryParam || {});
function getOverrideOrRandomSessionValue(queryParam) {
    const overrideValue = queryParams.get(queryParam);
    if (overrideValue != null) {
        return overrideValue;
    }
    const currentStoredValue = sessionStorage.getItem(queryParam);
    if (currentStoredValue != null) {
        return currentStoredValue;
    }
    // Set queryParam to a random 8-character string
    const randomString = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(queryParam, randomString);
    return randomString;
}
const DiscordContext = /*#__PURE__*/ createContext({
    accessToken: null,
    authenticated: false,
    discordSdk: discordSdk,
    error: null,
    session: {
        user: {
            id: '',
            username: '',
            discriminator: '',
            avatar: null,
            public_flags: 0
        },
        access_token: '',
        scopes: [],
        expires: '',
        application: {
            rpc_origins: undefined,
            id: '',
            name: '',
            icon: null,
            description: ''
        }
    },
    status: 'pending'
});
export function DiscordContextProvider(props) {
    const { authenticate, children, loadingScreen = null, scope } = props;
    const setupResult = useDiscordSdkSetup({
        authenticate,
        scope
    });
    if (loadingScreen && ![
        'error',
        'ready'
    ].includes(setupResult.status)) {
        return /*#__PURE__*/ React.createElement(React.Fragment, null, loadingScreen);
    }
    return /*#__PURE__*/ React.createElement(DiscordContext.Provider, {
        value: setupResult
    }, children);
}
export function useDiscordSdk() {
    return useContext(DiscordContext);
}
/**
 * Authenticate with Discord and return the access token.
 * See full list of scopes: https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes
 *
 * @param scope The scope of the authorization (default: ['identify', 'guilds'])
 * @returns The result of the Discord SDK `authenticate()` command
 */ export async function authenticateSdk(options) {
    const { scope = [
        'identify',
        'guilds'
    ] } = options ?? {};
    await discordSdk.ready();
    const { code } = await discordSdk.commands.authorize({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        response_type: 'code',
        state: '',
        prompt: 'none',
        scope: scope
    });
    const response = await fetch('/.proxy/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            code
        })
    });
    const { access_token } = await response.json();
    // Authenticate with Discord client (using the access_token)
    const auth = await discordSdk.commands.authenticate({
        access_token
    });
    if (auth == null) {
        throw new Error('Authenticate command failed');
    }
    return {
        accessToken: access_token,
        auth
    };
}
export function useDiscordSdkSetup(options) {
    const { authenticate, scope } = options ?? {};
    const [accessToken, setAccessToken] = useState(null);
    const [session, setSession] = useState(null);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('pending');
    const setupDiscordSdk = useCallback(async ()=>{
        try {
            setStatus('loading');
            await discordSdk.ready();
            if (authenticate) {
                setStatus('authenticating');
                const { accessToken, auth } = await authenticateSdk({
                    scope
                });
                setAccessToken(accessToken);
                setSession(auth);
            }
            setStatus('ready');
        } catch (e) {
            console.error(e);
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unknown error occurred');
            }
            setStatus('error');
        }
    }, [
        authenticate
    ]);
    useStableEffect(()=>{
        setupDiscordSdk();
    });
    return {
        accessToken,
        authenticated: !!accessToken,
        discordSdk,
        error,
        session,
        status
    };
}
/**
 * React in development mode re-mounts the root component initially.
 * This hook ensures that the callback is only called once, preventing double authentication.
 */ function useStableEffect(callback) {
    const isRunning = useRef(false);
    useEffect(()=>{
        if (!isRunning.current) {
            isRunning.current = true;
            callback();
        }
    }, []);
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkQ6XFxkaXNjXFxkZW1vMVxcc3JjXFxob29rc1xcdXNlRGlzY29yZFNkay50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGlzY29yZFNESywgRGlzY29yZFNES01vY2sgfSBmcm9tICdAZGlzY29yZC9lbWJlZGRlZC1hcHAtc2RrJ1xuaW1wb3J0IHsgdXNlU3RhdGUsIHVzZUVmZmVjdCwgdXNlQ2FsbGJhY2ssIHVzZVJlZiwgY3JlYXRlQ29udGV4dCwgdXNlQ29udGV4dCB9IGZyb20gJ3JlYWN0J1xuaW1wb3J0IHR5cGUgeyBSZWFjdE5vZGUgfSBmcm9tICdyZWFjdCdcblxudHlwZSBVbndyYXBQcm9taXNlPFQ+ID0gVCBleHRlbmRzIFByb21pc2U8aW5mZXIgVT4gPyBVIDogVFxudHlwZSBEaXNjb3JkU2Vzc2lvbiA9IFVud3JhcFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgZGlzY29yZFNkay5jb21tYW5kcy5hdXRoZW50aWNhdGU+PlxudHlwZSBBdXRob3JpemVJbnB1dCA9IFBhcmFtZXRlcnM8dHlwZW9mIGRpc2NvcmRTZGsuY29tbWFuZHMuYXV0aG9yaXplPlswXVxudHlwZSBTZGtTZXR1cFJlc3VsdCA9IFJldHVyblR5cGU8dHlwZW9mIHVzZURpc2NvcmRTZGtTZXR1cD5cblxuY29uc3QgcXVlcnlQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpXG5jb25zdCBpc0VtYmVkZGVkID0gcXVlcnlQYXJhbXMuZ2V0KCdmcmFtZV9pZCcpICE9IG51bGxcblxubGV0IGRpc2NvcmRTZGs6IERpc2NvcmRTREsgfCBEaXNjb3JkU0RLTW9ja1xuXG5pZiAoaXNFbWJlZGRlZCkge1xuXHRkaXNjb3JkU2RrID0gbmV3IERpc2NvcmRTREsoaW1wb3J0Lm1ldGEuZW52LlZJVEVfRElTQ09SRF9DTElFTlRfSUQpXG59IGVsc2Uge1xuXHQvLyBXZSdyZSB1c2luZyBzZXNzaW9uIHN0b3JhZ2UgZm9yIHVzZXJfaWQsIGd1aWxkX2lkLCBhbmQgY2hhbm5lbF9pZFxuXHQvLyBUaGlzIHdheSB0aGUgdXNlci9ndWlsZC9jaGFubmVsIHdpbGwgYmUgbWFpbnRhaW5lZCB1bnRpbCB0aGUgdGFiIGlzIGNsb3NlZCwgZXZlbiBpZiB5b3UgcmVmcmVzaFxuXHQvLyBTZXNzaW9uIHN0b3JhZ2Ugd2lsbCBnZW5lcmF0ZSBuZXcgdW5pcXVlIG1vY2tzIGZvciBlYWNoIHRhYiB5b3Ugb3BlblxuXHQvLyBBbnkgb2YgdGhlc2UgdmFsdWVzIGNhbiBiZSBvdmVycmlkZGVuIHZpYSBxdWVyeSBwYXJhbWV0ZXJzXG5cdC8vIGkuZS4gaWYgeW91IHNldCBodHRwczovL215LXR1bm5lbC11cmwuY29tLz91c2VyX2lkPXRlc3RfdXNlcl9pZFxuXHQvLyB0aGlzIHdpbGwgb3ZlcnJpZGUgdGhpcyB3aWxsIG92ZXJyaWRlIHRoZSBzZXNzaW9uIHVzZXJfaWQgdmFsdWVcblx0Y29uc3QgbW9ja1VzZXJJZCA9IGdldE92ZXJyaWRlT3JSYW5kb21TZXNzaW9uVmFsdWUoJ3VzZXJfaWQnKVxuXHRjb25zdCBtb2NrR3VpbGRJZCA9IGdldE92ZXJyaWRlT3JSYW5kb21TZXNzaW9uVmFsdWUoJ2d1aWxkX2lkJylcblx0Y29uc3QgbW9ja0NoYW5uZWxJZCA9IGdldE92ZXJyaWRlT3JSYW5kb21TZXNzaW9uVmFsdWUoJ2NoYW5uZWxfaWQnKVxuXG5cdGRpc2NvcmRTZGsgPSBuZXcgRGlzY29yZFNES01vY2soaW1wb3J0Lm1ldGEuZW52LlZJVEVfRElTQ09SRF9DTElFTlRfSUQsIG1vY2tHdWlsZElkLCBtb2NrQ2hhbm5lbElkKVxuXHRjb25zdCBkaXNjcmltaW5hdG9yID0gU3RyaW5nKG1vY2tVc2VySWQuY2hhckNvZGVBdCgwKSAlIDUpXG5cblx0ZGlzY29yZFNkay5fdXBkYXRlQ29tbWFuZE1vY2tzKHtcblx0XHRhdXRoZW50aWNhdGU6IGFzeW5jICgpID0+IHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGFjY2Vzc190b2tlbjogJ21vY2tfdG9rZW4nLFxuXHRcdFx0XHR1c2VyOiB7XG5cdFx0XHRcdFx0dXNlcm5hbWU6IG1vY2tVc2VySWQsXG5cdFx0XHRcdFx0ZGlzY3JpbWluYXRvcixcblx0XHRcdFx0XHRpZDogbW9ja1VzZXJJZCxcblx0XHRcdFx0XHRhdmF0YXI6IG51bGwsXG5cdFx0XHRcdFx0cHVibGljX2ZsYWdzOiAxXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNjb3BlczogW10sXG5cdFx0XHRcdGV4cGlyZXM6IG5ldyBEYXRlKDIxMTIsIDEsIDEpLnRvU3RyaW5nKCksXG5cdFx0XHRcdGFwcGxpY2F0aW9uOiB7XG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246ICdtb2NrX2FwcF9kZXNjcmlwdGlvbicsXG5cdFx0XHRcdFx0aWNvbjogJ21vY2tfYXBwX2ljb24nLFxuXHRcdFx0XHRcdGlkOiAnbW9ja19hcHBfaWQnLFxuXHRcdFx0XHRcdG5hbWU6ICdtb2NrX2FwcF9uYW1lJ1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9KVxufVxuXG5leHBvcnQgeyBkaXNjb3JkU2RrIH1cblxuZW51bSBTZXNzaW9uU3RvcmFnZVF1ZXJ5UGFyYW0ge1xuXHR1c2VyX2lkID0gJ3VzZXJfaWQnLFxuXHRndWlsZF9pZCA9ICdndWlsZF9pZCcsXG5cdGNoYW5uZWxfaWQgPSAnY2hhbm5lbF9pZCdcbn1cblxuZnVuY3Rpb24gZ2V0T3ZlcnJpZGVPclJhbmRvbVNlc3Npb25WYWx1ZShxdWVyeVBhcmFtOiBgJHtTZXNzaW9uU3RvcmFnZVF1ZXJ5UGFyYW19YCkge1xuXHRjb25zdCBvdmVycmlkZVZhbHVlID0gcXVlcnlQYXJhbXMuZ2V0KHF1ZXJ5UGFyYW0pXG5cdGlmIChvdmVycmlkZVZhbHVlICE9IG51bGwpIHtcblx0XHRyZXR1cm4gb3ZlcnJpZGVWYWx1ZVxuXHR9XG5cblx0Y29uc3QgY3VycmVudFN0b3JlZFZhbHVlID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShxdWVyeVBhcmFtKVxuXHRpZiAoY3VycmVudFN0b3JlZFZhbHVlICE9IG51bGwpIHtcblx0XHRyZXR1cm4gY3VycmVudFN0b3JlZFZhbHVlXG5cdH1cblxuXHQvLyBTZXQgcXVlcnlQYXJhbSB0byBhIHJhbmRvbSA4LWNoYXJhY3RlciBzdHJpbmdcblx0Y29uc3QgcmFuZG9tU3RyaW5nID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMiwgMTApXG5cdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0ocXVlcnlQYXJhbSwgcmFuZG9tU3RyaW5nKVxuXHRyZXR1cm4gcmFuZG9tU3RyaW5nXG59XG5cbmNvbnN0IERpc2NvcmRDb250ZXh0ID0gY3JlYXRlQ29udGV4dDxTZGtTZXR1cFJlc3VsdD4oe1xuXHRhY2Nlc3NUb2tlbjogbnVsbCxcblx0YXV0aGVudGljYXRlZDogZmFsc2UsXG5cdGRpc2NvcmRTZGs6IGRpc2NvcmRTZGssXG5cdGVycm9yOiBudWxsLFxuXHRzZXNzaW9uOiB7XG5cdFx0dXNlcjoge1xuXHRcdFx0aWQ6ICcnLFxuXHRcdFx0dXNlcm5hbWU6ICcnLFxuXHRcdFx0ZGlzY3JpbWluYXRvcjogJycsXG5cdFx0XHRhdmF0YXI6IG51bGwsXG5cdFx0XHRwdWJsaWNfZmxhZ3M6IDBcblx0XHR9LFxuXHRcdGFjY2Vzc190b2tlbjogJycsXG5cdFx0c2NvcGVzOiBbXSxcblx0XHRleHBpcmVzOiAnJyxcblx0XHRhcHBsaWNhdGlvbjoge1xuXHRcdFx0cnBjX29yaWdpbnM6IHVuZGVmaW5lZCxcblx0XHRcdGlkOiAnJyxcblx0XHRcdG5hbWU6ICcnLFxuXHRcdFx0aWNvbjogbnVsbCxcblx0XHRcdGRlc2NyaXB0aW9uOiAnJ1xuXHRcdH1cblx0fSxcblx0c3RhdHVzOiAncGVuZGluZydcbn0pXG5cbmludGVyZmFjZSBEaXNjb3JkQ29udGV4dFByb3ZpZGVyUHJvcHMge1xuXHRhdXRoZW50aWNhdGU/OiBib29sZWFuXG5cdGNoaWxkcmVuOiBSZWFjdE5vZGVcblx0bG9hZGluZ1NjcmVlbj86IFJlYWN0Tm9kZVxuXHRzY29wZT86IEF1dGhvcml6ZUlucHV0WydzY29wZSddXG59XG5leHBvcnQgZnVuY3Rpb24gRGlzY29yZENvbnRleHRQcm92aWRlcihwcm9wczogRGlzY29yZENvbnRleHRQcm92aWRlclByb3BzKSB7XG5cdGNvbnN0IHsgYXV0aGVudGljYXRlLCBjaGlsZHJlbiwgbG9hZGluZ1NjcmVlbiA9IG51bGwsIHNjb3BlIH0gPSBwcm9wc1xuXHRjb25zdCBzZXR1cFJlc3VsdCA9IHVzZURpc2NvcmRTZGtTZXR1cCh7IGF1dGhlbnRpY2F0ZSwgc2NvcGUgfSlcblxuXHRpZiAobG9hZGluZ1NjcmVlbiAmJiAhWydlcnJvcicsICdyZWFkeSddLmluY2x1ZGVzKHNldHVwUmVzdWx0LnN0YXR1cykpIHtcblx0XHRyZXR1cm4gPD57bG9hZGluZ1NjcmVlbn08Lz5cblx0fVxuXG5cdHJldHVybiA8RGlzY29yZENvbnRleHQuUHJvdmlkZXIgdmFsdWU9e3NldHVwUmVzdWx0fT57Y2hpbGRyZW59PC9EaXNjb3JkQ29udGV4dC5Qcm92aWRlcj5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZURpc2NvcmRTZGsoKSB7XG5cdHJldHVybiB1c2VDb250ZXh0KERpc2NvcmRDb250ZXh0KVxufVxuXG5pbnRlcmZhY2UgQXV0aGVudGljYXRlU2RrT3B0aW9ucyB7XG5cdHNjb3BlPzogQXV0aG9yaXplSW5wdXRbJ3Njb3BlJ11cbn1cblxuLyoqXG4gKiBBdXRoZW50aWNhdGUgd2l0aCBEaXNjb3JkIGFuZCByZXR1cm4gdGhlIGFjY2VzcyB0b2tlbi5cbiAqIFNlZSBmdWxsIGxpc3Qgb2Ygc2NvcGVzOiBodHRwczovL2Rpc2NvcmQuY29tL2RldmVsb3BlcnMvZG9jcy90b3BpY3Mvb2F1dGgyI3NoYXJlZC1yZXNvdXJjZXMtb2F1dGgyLXNjb3Blc1xuICpcbiAqIEBwYXJhbSBzY29wZSBUaGUgc2NvcGUgb2YgdGhlIGF1dGhvcml6YXRpb24gKGRlZmF1bHQ6IFsnaWRlbnRpZnknLCAnZ3VpbGRzJ10pXG4gKiBAcmV0dXJucyBUaGUgcmVzdWx0IG9mIHRoZSBEaXNjb3JkIFNESyBgYXV0aGVudGljYXRlKClgIGNvbW1hbmRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZVNkayhvcHRpb25zPzogQXV0aGVudGljYXRlU2RrT3B0aW9ucykge1xuXHRjb25zdCB7IHNjb3BlID0gWydpZGVudGlmeScsICdndWlsZHMnXSB9ID0gb3B0aW9ucyA/PyB7fVxuXG5cdGF3YWl0IGRpc2NvcmRTZGsucmVhZHkoKVxuXHRjb25zdCB7IGNvZGUgfSA9IGF3YWl0IGRpc2NvcmRTZGsuY29tbWFuZHMuYXV0aG9yaXplKHtcblx0XHRjbGllbnRfaWQ6IGltcG9ydC5tZXRhLmVudi5WSVRFX0RJU0NPUkRfQ0xJRU5UX0lELFxuXHRcdHJlc3BvbnNlX3R5cGU6ICdjb2RlJyxcblx0XHRzdGF0ZTogJycsXG5cdFx0cHJvbXB0OiAnbm9uZScsXG5cdFx0c2NvcGU6IHNjb3BlXG5cdH0pXG5cblx0Y29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnLy5wcm94eS9hcGkvdG9rZW4nLCB7XG5cdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0aGVhZGVyczoge1xuXHRcdFx0J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuXHRcdH0sXG5cdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoeyBjb2RlIH0pXG5cdH0pXG5cdGNvbnN0IHsgYWNjZXNzX3Rva2VuIH0gPSBhd2FpdCByZXNwb25zZS5qc29uKClcblxuXHQvLyBBdXRoZW50aWNhdGUgd2l0aCBEaXNjb3JkIGNsaWVudCAodXNpbmcgdGhlIGFjY2Vzc190b2tlbilcblx0Y29uc3QgYXV0aCA9IGF3YWl0IGRpc2NvcmRTZGsuY29tbWFuZHMuYXV0aGVudGljYXRlKHsgYWNjZXNzX3Rva2VuIH0pXG5cblx0aWYgKGF1dGggPT0gbnVsbCkge1xuXHRcdHRocm93IG5ldyBFcnJvcignQXV0aGVudGljYXRlIGNvbW1hbmQgZmFpbGVkJylcblx0fVxuXHRyZXR1cm4geyBhY2Nlc3NUb2tlbjogYWNjZXNzX3Rva2VuLCBhdXRoIH1cbn1cblxuaW50ZXJmYWNlIFVzZURpc2NvcmRTZGtTZXR1cE9wdGlvbnMge1xuXHRhdXRoZW50aWNhdGU/OiBib29sZWFuXG5cdHNjb3BlPzogQXV0aG9yaXplSW5wdXRbJ3Njb3BlJ11cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZURpc2NvcmRTZGtTZXR1cChvcHRpb25zPzogVXNlRGlzY29yZFNka1NldHVwT3B0aW9ucykge1xuXHRjb25zdCB7IGF1dGhlbnRpY2F0ZSwgc2NvcGUgfSA9IG9wdGlvbnMgPz8ge31cblx0Y29uc3QgW2FjY2Vzc1Rva2VuLCBzZXRBY2Nlc3NUb2tlbl0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKVxuXHRjb25zdCBbc2Vzc2lvbiwgc2V0U2Vzc2lvbl0gPSB1c2VTdGF0ZTxEaXNjb3JkU2Vzc2lvbiB8IG51bGw+KG51bGwpXG5cdGNvbnN0IFtlcnJvciwgc2V0RXJyb3JdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbClcblx0Y29uc3QgW3N0YXR1cywgc2V0U3RhdHVzXSA9IHVzZVN0YXRlPCdhdXRoZW50aWNhdGluZycgfCAnZXJyb3InIHwgJ2xvYWRpbmcnIHwgJ3BlbmRpbmcnIHwgJ3JlYWR5Jz4oJ3BlbmRpbmcnKVxuXG5cdGNvbnN0IHNldHVwRGlzY29yZFNkayA9IHVzZUNhbGxiYWNrKGFzeW5jICgpID0+IHtcblx0XHR0cnkge1xuXHRcdFx0c2V0U3RhdHVzKCdsb2FkaW5nJylcblx0XHRcdGF3YWl0IGRpc2NvcmRTZGsucmVhZHkoKVxuXG5cdFx0XHRpZiAoYXV0aGVudGljYXRlKSB7XG5cdFx0XHRcdHNldFN0YXR1cygnYXV0aGVudGljYXRpbmcnKVxuXHRcdFx0XHRjb25zdCB7IGFjY2Vzc1Rva2VuLCBhdXRoIH0gPSBhd2FpdCBhdXRoZW50aWNhdGVTZGsoeyBzY29wZSB9KVxuXHRcdFx0XHRzZXRBY2Nlc3NUb2tlbihhY2Nlc3NUb2tlbilcblx0XHRcdFx0c2V0U2Vzc2lvbihhdXRoKVxuXHRcdFx0fVxuXG5cdFx0XHRzZXRTdGF0dXMoJ3JlYWR5Jylcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKGUpXG5cdFx0XHRpZiAoZSBpbnN0YW5jZW9mIEVycm9yKSB7XG5cdFx0XHRcdHNldEVycm9yKGUubWVzc2FnZSlcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNldEVycm9yKCdBbiB1bmtub3duIGVycm9yIG9jY3VycmVkJylcblx0XHRcdH1cblx0XHRcdHNldFN0YXR1cygnZXJyb3InKVxuXHRcdH1cblx0fSwgW2F1dGhlbnRpY2F0ZV0pXG5cblx0dXNlU3RhYmxlRWZmZWN0KCgpID0+IHtcblx0XHRzZXR1cERpc2NvcmRTZGsoKVxuXHR9KVxuXG5cdHJldHVybiB7IGFjY2Vzc1Rva2VuLCBhdXRoZW50aWNhdGVkOiAhIWFjY2Vzc1Rva2VuLCBkaXNjb3JkU2RrLCBlcnJvciwgc2Vzc2lvbiwgc3RhdHVzIH1cbn1cblxuLyoqXG4gKiBSZWFjdCBpbiBkZXZlbG9wbWVudCBtb2RlIHJlLW1vdW50cyB0aGUgcm9vdCBjb21wb25lbnQgaW5pdGlhbGx5LlxuICogVGhpcyBob29rIGVuc3VyZXMgdGhhdCB0aGUgY2FsbGJhY2sgaXMgb25seSBjYWxsZWQgb25jZSwgcHJldmVudGluZyBkb3VibGUgYXV0aGVudGljYXRpb24uXG4gKi9cbmZ1bmN0aW9uIHVzZVN0YWJsZUVmZmVjdChjYWxsYmFjazogKCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHtcblx0Y29uc3QgaXNSdW5uaW5nID0gdXNlUmVmKGZhbHNlKVxuXG5cdHVzZUVmZmVjdCgoKSA9PiB7XG5cdFx0aWYgKCFpc1J1bm5pbmcuY3VycmVudCkge1xuXHRcdFx0aXNSdW5uaW5nLmN1cnJlbnQgPSB0cnVlXG5cdFx0XHRjYWxsYmFjaygpXG5cdFx0fVxuXHR9LCBbXSlcbn1cbiJdLCJuYW1lcyI6WyJEaXNjb3JkU0RLIiwiRGlzY29yZFNES01vY2siLCJ1c2VTdGF0ZSIsInVzZUVmZmVjdCIsInVzZUNhbGxiYWNrIiwidXNlUmVmIiwiY3JlYXRlQ29udGV4dCIsInVzZUNvbnRleHQiLCJxdWVyeVBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiaXNFbWJlZGRlZCIsImdldCIsImRpc2NvcmRTZGsiLCJlbnYiLCJWSVRFX0RJU0NPUkRfQ0xJRU5UX0lEIiwibW9ja1VzZXJJZCIsImdldE92ZXJyaWRlT3JSYW5kb21TZXNzaW9uVmFsdWUiLCJtb2NrR3VpbGRJZCIsIm1vY2tDaGFubmVsSWQiLCJkaXNjcmltaW5hdG9yIiwiU3RyaW5nIiwiY2hhckNvZGVBdCIsIl91cGRhdGVDb21tYW5kTW9ja3MiLCJhdXRoZW50aWNhdGUiLCJhY2Nlc3NfdG9rZW4iLCJ1c2VyIiwidXNlcm5hbWUiLCJpZCIsImF2YXRhciIsInB1YmxpY19mbGFncyIsInNjb3BlcyIsImV4cGlyZXMiLCJEYXRlIiwidG9TdHJpbmciLCJhcHBsaWNhdGlvbiIsImRlc2NyaXB0aW9uIiwiaWNvbiIsIm5hbWUiLCJTZXNzaW9uU3RvcmFnZVF1ZXJ5UGFyYW0iLCJxdWVyeVBhcmFtIiwib3ZlcnJpZGVWYWx1ZSIsImN1cnJlbnRTdG9yZWRWYWx1ZSIsInNlc3Npb25TdG9yYWdlIiwiZ2V0SXRlbSIsInJhbmRvbVN0cmluZyIsIk1hdGgiLCJyYW5kb20iLCJzbGljZSIsInNldEl0ZW0iLCJEaXNjb3JkQ29udGV4dCIsImFjY2Vzc1Rva2VuIiwiYXV0aGVudGljYXRlZCIsImVycm9yIiwic2Vzc2lvbiIsInJwY19vcmlnaW5zIiwidW5kZWZpbmVkIiwic3RhdHVzIiwiRGlzY29yZENvbnRleHRQcm92aWRlciIsInByb3BzIiwiY2hpbGRyZW4iLCJsb2FkaW5nU2NyZWVuIiwic2NvcGUiLCJzZXR1cFJlc3VsdCIsInVzZURpc2NvcmRTZGtTZXR1cCIsImluY2x1ZGVzIiwiUHJvdmlkZXIiLCJ2YWx1ZSIsInVzZURpc2NvcmRTZGsiLCJhdXRoZW50aWNhdGVTZGsiLCJvcHRpb25zIiwicmVhZHkiLCJjb2RlIiwiY29tbWFuZHMiLCJhdXRob3JpemUiLCJjbGllbnRfaWQiLCJyZXNwb25zZV90eXBlIiwic3RhdGUiLCJwcm9tcHQiLCJyZXNwb25zZSIsImZldGNoIiwibWV0aG9kIiwiaGVhZGVycyIsImJvZHkiLCJKU09OIiwic3RyaW5naWZ5IiwianNvbiIsImF1dGgiLCJFcnJvciIsInNldEFjY2Vzc1Rva2VuIiwic2V0U2Vzc2lvbiIsInNldEVycm9yIiwic2V0U3RhdHVzIiwic2V0dXBEaXNjb3JkU2RrIiwiZSIsImNvbnNvbGUiLCJtZXNzYWdlIiwidXNlU3RhYmxlRWZmZWN0IiwiY2FsbGJhY2siLCJpc1J1bm5pbmciLCJjdXJyZW50Il0sIm1hcHBpbmdzIjoiQUFBQSxTQUFTQSxVQUFVLEVBQUVDLGNBQWMsUUFBUSw0QkFBMkI7QUFDdEUsU0FBU0MsUUFBUSxFQUFFQyxTQUFTLEVBQUVDLFdBQVcsRUFBRUMsTUFBTSxFQUFFQyxhQUFhLEVBQUVDLFVBQVUsUUFBUSxRQUFPO0FBUTNGLE1BQU1DLGNBQWMsSUFBSUMsZ0JBQWdCQyxPQUFPQyxRQUFRLENBQUNDLE1BQU07QUFDOUQsTUFBTUMsYUFBYUwsWUFBWU0sR0FBRyxDQUFDLGVBQWU7QUFFbEQsSUFBSUM7QUFFSixJQUFJRixZQUFZO0lBQ2ZFLGFBQWEsSUFBSWYsV0FBVyxZQUFZZ0IsR0FBRyxDQUFDQyxzQkFBc0I7QUFDbkUsT0FBTztJQUNOLG9FQUFvRTtJQUNwRSxrR0FBa0c7SUFDbEcsdUVBQXVFO0lBQ3ZFLDZEQUE2RDtJQUM3RCxrRUFBa0U7SUFDbEUsa0VBQWtFO0lBQ2xFLE1BQU1DLGFBQWFDLGdDQUFnQztJQUNuRCxNQUFNQyxjQUFjRCxnQ0FBZ0M7SUFDcEQsTUFBTUUsZ0JBQWdCRixnQ0FBZ0M7SUFFdERKLGFBQWEsSUFBSWQsZUFBZSxZQUFZZSxHQUFHLENBQUNDLHNCQUFzQixFQUFFRyxhQUFhQztJQUNyRixNQUFNQyxnQkFBZ0JDLE9BQU9MLFdBQVdNLFVBQVUsQ0FBQyxLQUFLO0lBRXhEVCxXQUFXVSxtQkFBbUIsQ0FBQztRQUM5QkMsY0FBYztZQUNiLE9BQU87Z0JBQ05DLGNB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