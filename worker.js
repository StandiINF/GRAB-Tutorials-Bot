const nacl = require("tweetnacl");
import { Buffer } from 'node:buffer';

const CARD_JSON_URLS = [
    "https://assets.grab-tutorials.live/basics.json",
    "https://assets.grab-tutorials.live/editor.json",
    "https://assets.grab-tutorials.live/animation.json",
    "https://assets.grab-tutorials.live/trigger.json",
    "https://assets.grab-tutorials.live/help.json"
];

async function fetchAllCards() {
    const allCards = [];
    for (const url of CARD_JSON_URLS) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            if (Array.isArray(data)) {
                for (const card of data) {
                    allCards.push({ ...card, _deckUrl: url });
                }
            }
        } catch (e) {}
    }
    return allCards;
}

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

            if (command_name === "basic") {

                return Response.json({
                    type: 4,
                    data: {
                        tts: false,
                        content: "Success",
                        embeds: [],
                        allowed_mentions: { parse: [] }
                    }
                });

            } else if (command_name === "embed") {

                const embed = {
                    "type": "rich",
                    "title": "Basic embed",
                    "description": "This is a description",
                    "color": 0x5865F2,
                    "fields": [
                        {
                            "name": "Field 1",
                            "value": "Value 1",
                            "inline": true
                        },
                        {
                            "name": "Field 2",
                            "value": "Value 2",
                            "inline": false
                        }
                    ],
                    "url": "https://discord.com"
                };

                return Response.json({
                    type: 4,
                    data: {
                        tts: false,
                        content: '',
                        embeds: [embed],
                        allowed_mentions: { parse: [] }
                    }
                });

            } else if (command_name === "input") {

                const input = json.data.options[0].value;

                return Response.json({
                    type: 4,
                    data: {
                        tts: false,
                        content: `You entered: ${input}`,
                        embeds: [],
                        allowed_mentions: { parse: [] }
                    }
                });

            } else if (command_name === "deck") {
                // Changed: no subcommand, just the title option
                const selectedTitle = json.data.options[0].value;
                const allCards = await fetchAllCards();
                const card = allCards.find(c => c.title === selectedTitle);

                if (!card) {
                    return Response.json({
                        type: 4,
                        data: {
                            content: "Card not found.",
                            allowed_mentions: { parse: [] }
                        }
                    });
                }

                // Use the "cover" property from the card, prepend base URL if needed
                let coverUrl = card.cover || "";
                if (coverUrl && !coverUrl.startsWith("http")) {
                    coverUrl = `https://assets.grab-tutorials.live/${coverUrl.replace(/^\/+/, "")}`;
                }

                return Response.json({
                    type: 4,
                    data: {
                        content: '',
                        embeds: [
                            {
                                title: card.title,
                                description: card.description || '',
                                // Always include image if coverUrl is present
                                image: coverUrl ? { url: coverUrl } : undefined
                            }
                        ],
                        allowed_mentions: { parse: [] }
                    }
                });
            }
        }

        // Handle other requests
        return new Response("invalid request type", {status: 400});

    },
};