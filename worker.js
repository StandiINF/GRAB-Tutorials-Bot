const nacl = require("tweetnacl");
import { Buffer } from 'node:buffer';

export default {
    async fetch(request, env, ctx) {

        // Handle invalid requests
        const signature = request.headers.get("x-signature-ed25519");
        const timestamp = request.headers.get("x-signature-timestamp");
        const body = await request.text();
        const isVerified = signature && timestamp && nacl.sign.detached.verify(
            Buffer.from(timestamp + body),
            Buffer.from(signature, "hex"),
            Buffer.from(env.PUBLIC_KEY, "hex")
        );

        if (!isVerified) {
            return new Response("invalid request signature", {status: 401});
        }

        // Handle ping requests
        const json = JSON.parse(body);
        if (json.type == 1) {
            return Response.json({
                type: 1
            });
        }

        // Handle command requests
        if (json.type == 2) {
            const command_name = json.data.name;

            if (command_name === "deck") {
                const deckNameInput = json.data.options?.find(opt => opt.name === "name")?.value || "";
                const deckNameLower = deckNameInput.toLowerCase();

                const decksUrl = "https://assets.grab-tutorials.live/decks-png.json";
                let replyContent = `Deck "${deckNameInput}" not found.`;
                try {
                    const decksRes = await fetch(decksUrl);
                    if (decksRes.ok) {
                        const decks = await decksRes.json();
                        const found = decks.find(deck => (deck.title || "").toLowerCase() === deckNameLower);
                        if (found) {
                            let color = undefined;
                            switch (found.category) {
                                case "basics":
                                    color = 0x90CF90;
                                    break;
                                case "editor":
                                    color = 0x7C4848;
                                    break;
                                case "animation":
                                    color = 0x638DDD;
                                    break;
                                case "trigger":
                                    color = 0xF89900;
                                    break;
                            }
                            const cardKeys = found.cards ? Object.keys(found.cards) : [];
                            if (cardKeys.length > 0) {
                                const firstIndex = 0;
                                const firstCard = found.cards[cardKeys[firstIndex]];
                                const firstCardLink = firstCard?.link;
                                let helpText = "";
                                if (firstCard?.help) {
                                    try {
                                        const helpRes = await fetch("https://assets.grab-tutorials.live/help.json");
                                        if (helpRes.ok) {
                                            const helpArr = await helpRes.json();
                                            const helpObj = Array.isArray(helpArr)
                                                ? helpArr.find(h => h.id === firstCard.help)
                                                : helpArr[firstCard.help] || (helpArr.find && helpArr.find(h => h.id === firstCard.help));
                                            if (helpObj && helpObj.text) {
                                                helpText = helpObj.text;
                                            }
                                        }
                                    } catch (e) {
                                        // 
                                    }
                                }
                                if (firstCardLink) {
                                    return Response.json({
                                        type: 4,
                                        data: {
                                            tts: false,
                                            content: "",
                                            embeds: [
                                                {
                                                    title: found.title,
                                                    color,
                                                    image: {
                                                        url: `https://assets.grab-tutorials.live/${firstCardLink}`,
                                                        width: 300,
                                                        height: 154.91
                                                    },
                                                    description: `*Card 1 of ${cardKeys.length}*${helpText ? `\n\n*${helpText}*` : ""}`
                                                }
                                            ],
                                            components: [
                                                {
                                                    type: 1,
                                                    components: [
                                                        {
                                                            type: 2,
                                                            style: 1,
                                                            label: "Back",
                                                            custom_id: `deck_left_${deckNameLower}_0`,
                                                            disabled: true
                                                        },
                                                        {
                                                            type: 2,
                                                            style: 1,
                                                            label: "Next",
                                                            custom_id: `deck_right_${deckNameLower}_0`,
                                                            disabled: cardKeys.length <= 1
                                                        }
                                                    ]
                                                }
                                            ],
                                            allowed_mentions: { parse: [] }
                                        }
                                    });
                                } else {
                                    replyContent = `Deck "${found.title}" found, but no card link available.`;
                                }
                            } else {
                                replyContent = `Deck "${found.title}" found, but no cards available.`;
                            }
                        }
                    } else {
                        replyContent = "Failed to fetch decks data.";
                    }
                } catch (e) {
                    replyContent = "Error fetching decks data.";
                }

                return Response.json({
                    type: 4,
                    data: {
                        tts: false,
                        content: replyContent,
                        embeds: [],
                        allowed_mentions: { parse: [] }
                    }
                });
            }

            if (command_name === "account") {
                const subcommand = json.data.options?.[0]?.name;
                const suboptions = json.data.options?.[0]?.options || [];
                const allowedGuildId = "916686745288982590";
                if (subcommand === "link" || subcommand === "unlink") {
                    const guildId = json.guild_id;
                    if (guildId !== allowedGuildId) {
                        return Response.json({
                            type: 4,
                            data: {
                                content: "This command cannot be used here.\n -# Please use it in the Standi Discord server.",
                                allowed_mentions: { parse: [] }
                            }
                        });
                    }
                }
                if (subcommand === "info") {
                    try {
                        const discordId = json.member?.user?.id || json.user?.id;
                        if (!discordId) {
                            return Response.json({
                                type: 4,
                                data: {
                                    content: "You aren't logged in.",
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        }

                        let row;
                        try {
                            row = await env.DB.prepare(
                                "SELECT alias FROM links WHERE discord_id = ? LIMIT 1"
                            ).bind(discordId).first();
                        } catch (sqlErr) {
                            console.error("SQL error in /account info:", sqlErr);
                            return Response.json({
                                type: 4,
                                data: {
                                    content: "Database error: " + sqlErr.message,
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        }
                        if (row && row.alias) {
                            return Response.json({
                                type: 4,
                                data: {
                                    content: `Your linked account: **${row.alias}**`,
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        } else {
                            return Response.json({
                                type: 4,
                                data: {
                                    content: "You aren't logged in.",
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        }
                    } catch (e) {
                        console.error("Unexpected error in /account info:", e);
                        return Response.json({
                            type: 4,
                            data: {
                                content: "You aren't logged in.",
                                allowed_mentions: { parse: [] }
                            }
                        });
                    }
                } else if (subcommand === "link") {
                    const code = suboptions.find(opt => opt.name === "code")?.value;
                    if (!code) {
                        return Response.json({
                            type: 4,
                            data: {
                                content: "You must provide a 6-digit code.",
                                allowed_mentions: { parse: [] }
                            }
                        });
                    }
                    try {
                        const value = await env.LINK_CODES.get(code);
                        if (!value) {
                            return Response.json({
                                type: 4,
                                data: {
                                    content: "Invalid or expired code.",
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        }
                        const entry = JSON.parse(value);
                        const alias = entry.alias;
                        const discordId = json.member?.user?.id || json.user?.id;
                        if (!alias || !discordId) {
                            return Response.json({
                                type: 4,
                                data: {
                                    content: "Could not determine alias or Discord ID.",
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        }

                        let checkRes;
                        try {
                            checkRes = await env.DB.prepare(
                                "SELECT 1 FROM links WHERE alias = ? OR discord_id = ? LIMIT 1"
                            ).bind(alias, discordId).first();
                        } catch (sqlCheckErr) {
                            console.error("SQL check error:", sqlCheckErr);
                            return Response.json({
                                type: 4,
                                data: {
                                    content: "Database error during check: " + sqlCheckErr.message,
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        }
                        if (checkRes) {
                            await env.LINK_CODES.delete(code);
                            return Response.json({
                                type: 4,
                                data: {
                                    content: "This account is already linked.",
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        }

                        try {
                            await env.DB.prepare(
                                "INSERT INTO links (alias, discord_id) VALUES (?, ?)"
                            ).bind(alias, discordId).run();
                        } catch (sqlInsertErr) {
                            console.error("SQL insert error:", sqlInsertErr);
                            return Response.json({
                                type: 4,
                                data: {
                                    content: "Database error during insert: " + sqlInsertErr.message,
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        }

                        await env.LINK_CODES.delete(code);

                        return Response.json({
                            type: 4,
                            data: {
                                content: `Successfully linked: **${alias}**!`,
                                allowed_mentions: { parse: [] }
                            }
                        });
                    } catch (e) {
                        console.error("Unexpected error in /account link:", e);
                        return Response.json({
                            type: 4,
                            data: {
                                content: "An error occurred while linking your account. Please try again.",
                                allowed_mentions: { parse: [] }
                            }
                        });
                    }
                } else if (subcommand === "unlink") {
                    try {
                        const discordId = json.member?.user?.id || json.user?.id;
                        if (!discordId) {
                            return Response.json({
                                type: 4,
                                data: {
                                    content: "Could not determine your Discord ID.",
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        }
                        let row;
                        try {
                            row = await env.DB.prepare(
                                "SELECT alias FROM links WHERE discord_id = ? LIMIT 1"
                            ).bind(discordId).first();
                        } catch (sqlErr) {
                            console.error("SQL error in /account unlink (select):", sqlErr);
                            return Response.json({
                                type: 4,
                                data: {
                                    content: "Database error: " + sqlErr.message,
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        }
                        if (!row || !row.alias) {
                            return Response.json({
                                type: 4,
                                data: {
                                    content: "No link found for your Discord.",
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        }
                        try {
                            await env.DB.prepare(
                                "DELETE FROM links WHERE discord_id = ?"
                            ).bind(discordId).run();
                        } catch (sqlDelErr) {
                            console.error("SQL error in /account unlink (delete):", sqlDelErr);
                            return Response.json({
                                type: 4,
                                data: {
                                    content: "Database error during unlink: " + sqlDelErr.message,
                                    allowed_mentions: { parse: [] }
                                }
                            });
                        }
                        return Response.json({
                            type: 4,
                            data: {
                                content: `Unlinked account: **${row.alias}**.`,
                                allowed_mentions: { parse: [] }
                            }
                        });
                    } catch (e) {
                        console.error("Unexpected error in /account unlink:", e);
                        return Response.json({
                            type: 4,
                            data: {
                                content: "An error occurred while unlinking your account. Please try again.",
                                allowed_mentions: { parse: [] }
                            }
                        });
                    }
                }
            }
        }

        if (json.type == 3 && json.data.custom_id?.startsWith("deck_")) {

            const [ , direction, deckName, indexStr ] = json.data.custom_id.split("_");
            const deckNameLower = deckName.toLowerCase();
            const currentIndex = parseInt(indexStr, 10);

            const decksUrl = "https://assets.grab-tutorials.live/decks-png.json";
            let replyContent = `Deck "${deckName}" not found.`;
            try {
                const decksRes = await fetch(decksUrl);
                if (decksRes.ok) {
                    const decks = await decksRes.json();
                    const found = decks.find(deck => (deck.title || "").toLowerCase() === deckNameLower);
                    if (found) {
                        let color = undefined;
                        switch (found.category) {
                            case "basics":
                                color = 0x90CF90;
                                break;
                            case "editor":
                                color = 0x7C4848;
                                break;
                            case "animation":
                                color = 0x638DDD;
                                break;
                            case "trigger":
                                color = 0xF89900;
                                break;
                        }
                        const cardKeys = found.cards ? Object.keys(found.cards) : [];
                        if (cardKeys.length > 0) {
                            let newIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
                            if (newIndex < 0) newIndex = cardKeys.length - 1;
                            if (newIndex >= cardKeys.length) newIndex = 0;
                            const card = found.cards[cardKeys[newIndex]];
                            const cardLink = card?.link;
                            let helpText = "";
                            if (card?.help) {
                                try {
                                    const helpRes = await fetch("https://assets.grab-tutorials.live/help.json");
                                    if (helpRes.ok) {
                                        const helpArr = await helpRes.json();
                                        const helpObj = Array.isArray(helpArr)
                                            ? helpArr.find(h => h.id === card.help)
                                            : helpArr[card.help] || (helpArr.find && helpArr.find(h => h.id === card.help));
                                        if (helpObj && helpObj.text) {
                                            helpText = helpObj.text;
                                        }
                                    }
                                } catch (e) {
                                    // 
                                }
                            }
                            if (cardLink) {
                                return Response.json({
                                    type: 7,
                                    data: {
                                        content: "",
                                        embeds: [
                                            {
                                                title: found.title,
                                                color,
                                                image: {
                                                    url: `https://assets.grab-tutorials.live/${cardLink}`,
                                                    width: 300,
                                                    height: 154.91
                                                },
                                                description: `*Card ${newIndex + 1} of ${cardKeys.length}*${helpText ? `\n\n*${helpText}*` : ""}`
                                            }
                                        ],
                                        components: [
                                            {
                                                type: 1,
                                                components: [
                                                    {
                                                        type: 2,
                                                        style: 1,
                                                        label: "Back",
                                                        custom_id: `deck_left_${deckNameLower}_${newIndex}`,
                                                        disabled: newIndex === 0
                                                    },
                                                    {
                                                        type: 2,
                                                        style: 1,
                                                        label: "Next",
                                                        custom_id: `deck_right_${deckNameLower}_${newIndex}`,
                                                        disabled: newIndex === cardKeys.length - 1
                                                    }
                                                ]
                                            }
                                        ],
                                        allowed_mentions: { parse: [] }
                                    }
                                });
                            } else {
                                replyContent = `Deck "${found.title}" found, but no card link available.`;
                            }
                        } else {
                            replyContent = `Deck "${found.title}" found, but no cards available.`;
                        }
                    }
                } else {
                    replyContent = "Failed to fetch decks data.";
                }
            } catch (e) {
                replyContent = "Error fetching decks data.";
            }

            return Response.json({
                type: 7,
                data: {
                    content: replyContent,
                    embeds: [],
                    components: [],
                    allowed_mentions: { parse: [] }
                }
            });
        }

        if (json.type === 4 && json.data?.name === "deck" && json.data?.options?.[0]?.name === "name") {
            try {
                const userInput = json.data.options[0].value?.toLowerCase() || "";
                const decksRes = await fetch("https://assets.grab-tutorials.live/decks-png.json");
                if (decksRes.ok) {
                    const decks = await decksRes.json();
                    const filtered = userInput
                        ? decks.filter(deck => (deck.title || "").toLowerCase().startsWith(userInput))
                        : decks;
                    const choices = filtered.map(deck => ({
                        name: deck.title,
                        value: (deck.title || "").toLowerCase()
                    })).slice(0, 25);
                    return Response.json({
                        type: 8,
                        data: {
                            choices
                        }
                    });
                }
            } catch (e) {
                // 
            }
            return Response.json({
                type: 8,
                data: { choices: [] }
            });
        }

        return new Response("invalid request type", {status: 400});

    },
};