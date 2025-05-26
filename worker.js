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

            if (command_name === "link") {
                const code = json.data.options?.find(opt => opt.name === "code")?.value;
                if (!code) {
                    return Response.json({
                        type: 4,
                        data: {
                            content: "hi its me k1dfun, i need a 6 digit code.",
                            allowed_mentions: { parse: [] }
                        }
                    });
                }
                try {
                    // Directly check the KV store for the code
                    const value = await env.LINK_CODES.get(code);
                    if (!value) {
                        return Response.json({
                            type: 4,
                            data: {
                                content: "hi im k1dfun, and this didn't work, the code may be invalid or expired.",
                                allowed_mentions: { parse: [] }
                            }
                        });
                    }
                    await env.LINK_CODES.delete(code);
                    const entry = JSON.parse(value);
                    return Response.json({
                        type: 4,
                        data: {
                            content: `k1dfun says: you did it! welcome **${entry.alias}**!`,
                            allowed_mentions: { parse: [] }
                        }
                    });
                } catch (e) {
                    return Response.json({
                        type: 4,
                        data: {
                            content: "something happened idk what, no code for you. dearest k1dfun.",
                            allowed_mentions: { parse: [] }
                        }
                    });
                }
            }

            if (command_name === "account") {
                try {
                    const discordId = json.member?.user?.id || json.user?.id;
                    if (!discordId) {
                        return Response.json({
                            type: 4,
                            data: {
                                content: "hi k1dfun here, i dont know who you are because your not logged in",
                                allowed_mentions: { parse: [] }
                            }
                        });
                    }
                    const res = await fetch('https://api.grab-tutorials.live/accountInfo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ discordId })
                    });
                    if (!res.ok) {
                        return Response.json({
                            type: 4,
                            data: {
                                content: "hi k1dfun here, i dont know who you are because your not logged in",
                                allowed_mentions: { parse: [] }
                            }
                        });
                    }
                    const data = await res.json();
                    if (data.success && data.alias) {
                        return Response.json({
                            type: 4,
                            data: {
                                content: `hi im k1dfun, this is your acccount here: **${data.alias}**`,
                                allowed_mentions: { parse: [] }
                            }
                        });
                    } else {
                        return Response.json({
                            type: 4,
                            data: {
                                content: "hi k1dfun here, i dont know who you are because your not logged in",
                                allowed_mentions: { parse: [] }
                            }
                        });
                    }
                } catch (e) {
                    return Response.json({
                        type: 4,
                        data: {
                            content: "hi k1dfun here, i dont know who you are because your not logged in",
                            allowed_mentions: { parse: [] }
                        }
                    });
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
                                replyContent = `Deck "${found.title}" there is a lot of code here, and i dont feel like saying anything for it says k1dfun `;
                            }
                        } else {
                            replyContent = `Deck "${found.title}" found, but no cards available.`;
                        }
                    }
                } else {
                    replyContent = "i failed again!";
                }
            } catch (e) {
                replyContent = "i failed";
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
