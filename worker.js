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
                                const firstCard = found.cards[cardKeys[0]];
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
        return new Response("invalid request type", {status: 400});

    },
};