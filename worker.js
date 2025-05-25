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
                            const cardKeys = found.cards ? Object.keys(found.cards) : [];
                            if (cardKeys.length > 0) {
                                const firstIndex = 0;
                                const firstCard = found.cards[cardKeys[firstIndex]];
                                const firstCardLink = firstCard?.link;
                                if (firstCardLink) {
                                    return Response.json({
                                        type: 4,
                                        data: {
                                            tts: false,
                                            content: "",
                                            embeds: [
                                                {
                                                    image: {
                                                        url: `https://assets.grab-tutorials.live/${firstCardLink}`
                                                    }
                                                }
                                            ],
                                            components: [
                                                {
                                                    type: 1, // Action row
                                                    components: [
                                                        {
                                                            type: 2, // Button
                                                            style: 1, // Primary
                                                            label: "⬅️",
                                                            custom_id: `deck_left_${capitalizedDeckName}_${firstIndex}`
                                                        },
                                                        {
                                                            type: 2, // Button
                                                            style: 1, // Primary
                                                            label: "➡️",
                                                            custom_id: `deck_right_${capitalizedDeckName}_${firstIndex}`
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

        // Handle button interactions
        if (json.type == 3 && json.data.custom_id?.startsWith("deck_")) {
            // custom_id format: deck_{direction}_{DeckName}_{currentIndex}
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
                        const cardKeys = found.cards ? Object.keys(found.cards) : [];
                        if (cardKeys.length > 0) {
                            let newIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
                            if (newIndex < 0) newIndex = cardKeys.length - 1;
                            if (newIndex >= cardKeys.length) newIndex = 0;
                            const card = found.cards[cardKeys[newIndex]];
                            const cardLink = card?.link;
                            if (cardLink) {
                                return Response.json({
                                    type: 7, // Update message
                                    data: {
                                        content: "",
                                        embeds: [
                                            {
                                                image: {
                                                    url: `https://assets.grab-tutorials.live/${cardLink}`
                                                }
                                            }
                                        ],
                                        components: [
                                            {
                                                type: 1,
                                                components: [
                                                    {
                                                        type: 2,
                                                        style: 1,
                                                        label: "⬅️",
                                                        custom_id: `deck_left_${deckName}_${newIndex}`
                                                    },
                                                    {
                                                        type: 2,
                                                        style: 1,
                                                        label: "➡️",
                                                        custom_id: `deck_right_${deckName}_${newIndex}`
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
        return new Response("invalid request type", {status: 400});

    },
};