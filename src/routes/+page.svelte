<script>
    import { Client } from 'tmi.js';
    import { PUBLIC_OAUTH_TOKEN, PUBLIC_CLIENT_ID } from '$env/static/public';
    import { Color, Solver, hexToRgb } from '../lib/utils';

    import gen from "random-seed"

    // #region Images
    import flyBody1 from "$lib/bugs/fly/Body1.png";
    import flyBody2 from "$lib/bugs/fly/Body2.png";
    import flyHead1 from "$lib/bugs/fly/Head1.png";
    import flyHead2 from "$lib/bugs/fly/Head2.png";
    import flyWings1 from "$lib/bugs/fly/Wings1.png";
    import flyWings2 from "$lib/bugs/fly/Wings2.png";
    import flyEyes1 from "$lib/bugs/fly/Eyes1.png";
    import flyEyes2 from "$lib/bugs/fly/Eyes2.png";
    /**
     * The types of bugs that people can be
     */
    const bugs = {
        fly: {
            bodies: [flyBody1, flyBody2],
            wings: [flyWings1, flyWings2],
            heads: [flyHead1, flyHead2],
            eyes: [flyEyes1, flyEyes2],
        }
    }
    // #endregion

    // #region State
    let isBugOnLastMessageRight = false;
    let idOfLastMessage = 0;
    let tempStorage = {};
    const MAX_DECIMAL_FOR_COLORS = 16777215;
    /** @type {MessageDetails[]} */
    let messages = $state([]); //$inspect(messages);
    // DEBUG STUFF
    const testMessages = ["This is a test.", "Yes it is", "Another test", "Alright"];
    const testUsers = ["Kuro", "Zuzu", "Naka", "Ghost"];
    // #endregion

    // #region Twitch Chat
    const NICKNAME = "TrashInspector";
    const CHANNEL_TO_JOIN = "otzdarva";

    /**
     * Parses a message from Twitch
     * @param {string} message - The message from Twitch
    */
    const parseMessage = (message) => {
        if(!message){
            console.error("No message to parse");
            return;
        }
        const parts = message?.split(";");
        const tags = {};
        parts.forEach(part => {
            const [key, value] = part.split("=");
            tags[key] = value;
        });
        // Grab username and sanitize it.  Should already be sanitized, so we don't have to do that.
        // The first exclamation point will ALWAYS end the username because the message comes last, 
        // so we don't have to worry about grabbing a bad username from the message
        tags.username = message?.split(":")?.find(part => part.includes("!"))?.split("!")?.[0];
        // Grab message and sanitize it.  No whitespace or special characters allowed, sorry.
        tags.message = message?.split("PRIVMSG")?.[1]?.split(":")?.[1]?.replaceAll(/[^ -~]/g, "");
        
        // console.log(tags, message);

        return tags;
    }

    $effect(() => {
        console.log("CREATING SOCKET");
        const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

        socket.addEventListener('open', function () {
            console.log("OPENED SOCKET");
            socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
            socket.send(`PASS oauth:${PUBLIC_OAUTH_TOKEN}`);
            socket.send(`NICK ${NICKNAME}`);
            socket.send(`JOIN #${CHANNEL_TO_JOIN}`);
        });

        socket.addEventListener('message', function (event) {
            addMessage(parseMessage(event.data));
        });
    });

    // #endregion

    // #region Helper Functions
    const getRandomId = () => {
        return Math.floor(Math.random() * 2000000000);
    };

    /**
     * Gets the color transform for a given hex code
     * @param hex {string} The hex code of a color
     */
    const getColorTransform = (hex) => {
        const rgb = hexToRgb(hex);

        if (!rgb || rgb.length !== 3) {
            console.error(`Invalid format! hex: ${hex} rgb: ${rgb}`);
            return;
        }

        const color = new Color(rgb[0], rgb[1], rgb[2]);
        const solver = new Solver(color);
        const result = solver.solve();

        return result.filter;
    }

    /**
     * Removes leading # and adds leading 0s to hex codes if they're missing.
     * @param hex {string} The hex code of a color
     */
    const normalizeHex = (hex) => {
        let newHex = hex;
        while(newHex.length < 6){
            newHex = `0${newHex}`;
        }
        return newHex;
    }
    /**
     * Alternates the side of the chat the user's bugs are on unless this message came from the same user as the last message
     */
    const getBugSide = (currentUserId, prevUserId, isLastMsgRight) => {
        let isBugOnRight = false;
        if(
            // Same user and user was on the right
            (
                currentUserId === prevUserId
                && isLastMsgRight
            )
            ||
            // Different user and user was on the left
            (
                currentUserId !== prevUserId 
                && !isLastMsgRight
            )
        ){
            isBugOnRight = true;
        }
        idOfLastMessage = currentUserId;
        isBugOnLastMessageRight = isBugOnRight;
        return isBugOnRight;
    }

    // #endregion

    // #region THE ADD MESSAGE
    /**
     * Adds a message to the `messages` array
     * @param tags {MessageTagsType} - Various details about the message and its sender
     */
    const addMessage = (tags) => {
        if(!tags["user-id"] || tags["user-id"].length <= 1 || !tags.username || !tags.message){
            console.error("Missing some stuff", tags);
            return;
        };
        // If this user has already chatted, we can just use the same bug details
        if(tempStorage[tags["user-id"]]){
            const temp = tempStorage[tags["user-id"]];
            messages.push({
                username: tags.username,
                "user-id": tags["user-id"],
                color: temp.color,
                message: tags.message,
                isBugOnRight: getBugSide(tags["user-id"], idOfLastMessage, isBugOnLastMessageRight),
                bugType: temp.bugType,
                bugPartsIndexes: temp.bugPartsIndexes,
                filters: [`${temp.primaryColorTransform}`, `${temp.secondaryColorTransform}`, `${temp.tertiaryColorTransform}`, `${temp.quaternaryColorTransform}`],
            })

            return;
        }

        // Generate a seeded random number generator
        var rand = gen.create(tags["user-id"]);

        // Get your bug
        const bugType = Object.keys(bugs)[rand(Object.keys(bugs).length)];
        const bugParts = bugs[bugType];
        let bugPartsIndexes = {};
        Object.keys(bugParts).forEach(part => {
            const partIndex = rand(bugParts[part].length);
            bugPartsIndexes[part] = partIndex;
        });
        
        // Get your colors
        let primaryColor = "";
        if(!tags.color || tags.color.length < 0 || tags.color === "#000000"){
            primaryColor = normalizeHex(rand(MAX_DECIMAL_FOR_COLORS).toString(16));
        }else{
            primaryColor = tags.color.replace("#", "");
        }
        // const secondaryColor = normalizeHex(rand(MAX_DECIMAL_FOR_COLORS).toString(16));
        // const tertiaryColor = normalizeHex(rand(MAX_DECIMAL_FOR_COLORS).toString(16));
        // const quaternaryColor = normalizeHex(rand(MAX_DECIMAL_FOR_COLORS).toString(16));

        const primaryTransform = getColorTransform(primaryColor);
        // NOTE: YOU NEED TO MAKE SURE THESE FILTER VALUES ARE IN THIS ***EXACT*** ORDER
        const secondaryTransform = `filter: sepia(100%) invert(${rand.intBetween(0, 25)}%) saturate(${rand.intBetween(200, 1000)}%) hue-rotate(${rand.intBetween(0, 360)}deg);`;  //getColorTransform(secondaryColor);
        const tertiaryTransform = `filter: sepia(100%) invert(${rand.intBetween(0, 25)}%) saturate(${rand.intBetween(200, 1000)}%) hue-rotate(${rand.intBetween(0, 360)}deg);`;   //getColorTransform(tertiaryColor);
        const quaternaryTransform = `filter: sepia(100%) invert(${rand.intBetween(0, 25)}%) saturate(${rand.intBetween(200, 1000)}%) hue-rotate(${rand.intBetween(0, 360)}deg);`; //getColorTransform(quaternaryColor);

        console.log(primaryTransform, secondaryTransform, tertiaryTransform, quaternaryTransform)

        // Store them so we don't have to do these expensive calcs again
        tempStorage[tags["user-id"]] = {
            color: primaryColor,
            bugType: bugType,
            bugPartsIndexes: bugPartsIndexes,
            primaryColorTransform: primaryTransform,
            secondaryColorTransform: secondaryTransform,
            tertiaryColorTransform: tertiaryTransform,
            quaternaryColorTransform: quaternaryTransform,
        };

        messages.push({
            username: tags.username,
            "user-id": tags["user-id"],
            color: primaryColor,
            message: tags.message,
            isBugOnRight: getBugSide(tags["user-id"], idOfLastMessage, isBugOnLastMessageRight),
            bugType: bugType,
            bugPartsIndexes: bugPartsIndexes,
            filters: [primaryTransform, secondaryTransform, tertiaryTransform, quaternaryTransform],
        });
    };
    // #endregion


    $effect(()=>{
        if(messages.length > 10){
            messages.shift()
        }
    });

    // #region JSDoc Types
    /**
     * @typedef {Object} MessageTagsType
     * @property {string} message - "The message the user sent to the chat"
     * @property {string} badge-info - null
     * @property {string} badges - null
     * @property {string} client-nonce - "27229ae92db73f6c9f4f74bfe84a2901"
     * @property {string} color - "#FF7400"
     * @property {string} display-name - "Nakabozu"
     * @property {string} emotes - null
     * @property {boolean} first-msg - false
     * @property {string} flags - null
     * @property {string} id - "99c4c1a3-dc55-42ac-a7ea-4953820e4ece"
     * @property {boolean} mod - false
     * @property {boolean} returning-chatter - false
     * @property {string} room-id - "1058181866"
     * @property {boolean} subscriber - false
     * @property {string} tmi-sent-ts - "1713563770116"
     * @property {boolean} turbo - false
     * @property {string} user-id - "28814601" "1058181866"
     * @property {string} user-type - null
     * @property {string} emotes-raw - null
     * @property {string} badge-info-raw - null
     * @property {string} badges-raw - null
     * @property {string} username - "nakabozu"
     * @property {string} message-type - "chat"
     */

    /**
     * @typedef {Object} MessageDetails
     * @property {string} username - null
     * @property {string} user-id - null
     * @property {string} message - null
     * @property {string} color - The hex color of the user's twitch id, or a random color of they don't have one.
     * @property {boolean} isBugOnRight - If true, this bug should be on the right side of the chat; otherwise, it should be on the left
     * @property {string} bugType - The key for the type of bug the user is
     * @property {Object.<string, number>} bugPartsIndexes - The indexes of the bug parts belonging to the `bugType`
     * @property {string[]} filters - The filters to apply to the bug parts to change their colors randomly
    */
    // #endregion

    // #region HTML
    // #endregion
</script>

<button on:click={
()=>{
    addMessage(
        {
            message: testMessages[Math.floor(Math.random() * testMessages.length)],
            username: testUsers[Math.floor(Math.random() * testUsers.length)],
            "user-id": getRandomId(),
        })
}}
style="position:absolute; left: 390px;">ADD MESSAGE</button>
<ul>
    {#each messages as message}
        <li class={message.isBugOnRight ? "row-left" : "row-right"}>
            <figure>
                <span>placeholder for image</span>
                {#each Object.keys(message.bugPartsIndexes) as part, index}
                    <img width={50} src={bugs[message.bugType][part][message.bugPartsIndexes[part]]} alt={`${message.bugType} ${part}`} style={message.filters[index]}/>
                {/each}
            </figure>
            <div>
                <span></span>
                <header class="nunito" style={`color: #${message.color};`}>{message.username}</header>
                <p class="nunito">
                    {message.message}
                </p>
            </div>
        </li>
    {/each}
</ul>

<style>
    :global(body){
        background-color: #1f1f1f;
    }

    ul{
        margin: 0px;
        padding: 0px;
        outline: 0px;
        list-style-type: none;
        display: flex;
        flex-direction: column;
        width: 350px;
        max-height: 410px;
        align-items: flex-end;
        justify-content: flex-end;
    }

    li{
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        list-style-type: none;
        margin: 0px;
        padding: 0px;
        border: 0px;
    }

    /* li.row-left{
        flex-direction: row-reverse;
        justify-content: flex-start;
    }

    li.row-right{
        justify-content: flex-end;
    } */

    

    figure{
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        max-width: 65px;
        gap: 5px;
        margin: 0px;
        padding: 0px;
        border: 0px;
        /* Used to account for the extra space the speech arrow takes up */
        margin-top: 1rem;
    }

    figure span{
        width: 50px;
        height: 50px;
        opacity: 0;
        overflow: hidden;
    }

    img{
        position: absolute;
    }

    header{
        width: 100%;
        word-wrap: break-word;
        margin: 0px;
        padding: 0px;
        font-size: 1rem;
        font-weight: bolder;
        line-height: 1rem;
        /* text-shadow: 0px 0px 2px #cccccc80; */
        /* -webkit-text-stroke-width: 1px;
        -webkit-text-stroke-color:#ffffff30; */
    }

    p{
        position: relative;
        z-index: 2;

        width: 100%;
        border: 2px solid black;
        border-radius: 10px;
        background-color: #3b3b38;
        color: ghostwhite;
        padding: 2px 5px;
        margin: 0px;
    }

    li div span {
        z-index: 1;
        margin-left: -6px;
        margin-bottom: -43px;

        display: inline-block;
        align-self: center;
        width: 15px;
        height: 15px;
        transform:rotate(45deg);
        
        border: 2px solid black;
        background-color: #3b3b38;

    }

    .itim-regular {
        font-family: "Itim", cursive;
        font-weight: 400;
        font-style: normal;
    }

    .caveat-brush-regular {
        font-family: "Caveat Brush", cursive;
        font-weight: 400;
        font-style: normal;
    }

    .kalam-light {
        font-family: "Kalam", cursive;
        font-weight: 300;
        font-style: normal;
    }

    .kalam-regular {
        font-family: "Kalam", cursive;
        font-weight: 400;
        font-style: normal;
    }

    .kalam-bold {
        font-family: "Kalam", cursive;
        font-weight: 700;
        font-style: normal;
    }
    .nunito {
        font-family: "Nunito", sans-serif;
        font-optical-sizing: auto;
        font-style: normal;
    }
</style>