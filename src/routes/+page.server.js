export async function load() {
    // const tokenResponse = await fetch(
    //     `https://id.twitch.tv/oauth2/token?client_id=${PUBLIC_CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    //     {
    //         method: "POST",
    //     },
    // )

    // const tokenJson = await tokenResponse.json()
    // const token = tokenJson.access_token

    // const channelResponse = await fetch(
    //     "https://api.twitch.tv/helix/search/channels?query=bradgarropy",
    //     {
    //         headers: {
    //             "authorization": `Bearer ${token}`,
    //             "client-id": clientId,
    //         },
    //     },
    // )

    // const channelJson = await channelResponse.json()
    // const isLive = channelJson.data[0].is_live
    // return {
    //     token: token,
    // };
}