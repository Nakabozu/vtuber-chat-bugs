# Twitch Chat Bugs
This application generates randomly colored bugs that represent users in the TrashGangFriends chat

## Setup
1. Make a Twitch bot
2. Get the bot's oauth token
3. Add the oauth token to an ENV variable called `PUBLIC_OAUTH_TOKEN`
4. Execute `npm run dev` in the root!
5. Add the URL provided in the terminal to a "Browser" Source in OBS
6. DONE!

### Details
- The chat is 350 pixels wide by 450 pixels high.
- Only select ASCII values are allowed in messages, so you might be missing some stuff!
- Doesn't render Twitch emotes (yet!)