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
                const capitalizedDeckName = deckNameInput.charAt(0).toUpperCase() + deckNameInput.slice(1);

                const decksUrl = "https://assets.grab-tutorials.live/decks-png.json";
                let replyContent = `Deck "${capitalizedDeckName}" not found.`;
                try {
                    const decksRes = await fetch(decksUrl);
                    if (decksRes.ok) {
                        const decks = await decksRes.json();
                        const found = decks.find(deck => deck.title === capitalizedDeckName);
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
                                        // ignore help fetch errors
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
                                                            custom_id: `deck_left_${capitalizedDeckName}_0`,
                                                            disabled: true
                                                        },
                                                        {
                                                            type: 2,
                                                            style: 1,
                                                            label: "Next",
                                                            custom_id: `deck_right_${capitalizedDeckName}_0`,
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
        }

        if (json.type == 3 && json.data.custom_id?.startsWith("deck_")) {

            const [ , direction, deckName, indexStr ] = json.data.custom_id.split("_");
            const currentIndex = parseInt(indexStr, 10);

            const decksUrl = "https://assets.grab-tutorials.live/decks-png.json";
            let replyContent = `Deck "${deckName}" not found.`;
            try {
                const decksRes = await fetch(decksUrl);
                if (decksRes.ok) {
                    const decks = await decksRes.json();
                    const found = decks.find(deck => deck.title === deckName);
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
                                    // ignore help fetch errors
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
                                                        custom_id: `deck_left_${deckName}_${newIndex}`,
                                                        disabled: newIndex === 0
                                                    },
                                                    {
                                                        type: 2,
                                                        style: 1,
                                                        label: "Next",
                                                        custom_id: `deck_right_${deckName}_${newIndex}`,
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

        // Handle autocomplete interaction
        if (json.type === 4 && json.data?.name === "deck" && json.data?.options?.[0]?.name === "name") {
            try {
                const decksRes = await fetch("https://assets.grab-tutorials.live/decks-png.json");
                if (decksRes.ok) {
                    const decks = await decksRes.json();
                    const choices = decks.map(deck => ({
                        name: deck.title,
                        value: deck.title
                    })).slice(0, 25); // Discord allows max 25 choices
                    return Response.json({
                        type: 8,
                        data: {
                            choices
                        }
                    });
                }
            } catch (e) {
                // ignore errors, fall through
            }
            return Response.json({
                type: 8,
                data: { choices: [] }
            });
        }

        return new Response("invalid request type", {status: 400});

    },
};