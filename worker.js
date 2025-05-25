const nacl = require("tweetnacl");
import { Buffer } from 'node:buffer';

const CARD_JSON_URLS = [
    "https://assets.grab-tutorials.live/decks-png.json"
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

        const json = JSON.parse(body);

        if (json.type === 4 && json.data?.name === "deck") {
            const options = json.data.options || [];
            const focused = json.data.options.find(opt => opt.focused);
            const categoryOpt = options.find(opt => opt.name === "category");
            if (focused && focused.name === "card" && categoryOpt) {
                const category = categoryOpt.value;
                const allCards = await fetchAllCards();
                const cardsInCategory = allCards.filter(c => (c.category || "").toLowerCase() === category.toLowerCase());

                const userInput = focused.value?.toLowerCase() || "";
                const choices = cardsInCategory
                    .filter(c => c.title.toLowerCase().includes(userInput))
                    .slice(0, 25)
                    .map(c => ({
                        name: c.title,
                        value: c.title
                    }));
                return Response.json({
                    type: 4,
                    data: {
                        choices
                    }
                });
            }
        }

        if (json.type == 1) {
            return Response.json({
                type: 1
            });
        }

        if (json.type == 2) {
            const command_name = json.data.name;

            if (command_name === "deck") {
                const options = json.data.options || [];
                const categoryOpt = options.find(opt => opt.name === "category");
                const cardOpt = options.find(opt => opt.name === "card");

                if (!categoryOpt) {
                    return Response.json({
                        type: 4,
                        data: {
                            content: "Please provide a category.",
                            allowed_mentions: { parse: [] }
                        }
                    });
                }

                const category = categoryOpt.value;
                const allCards = await fetchAllCards();
                const cardsInCategory = allCards.filter(c => (c.category || "").toLowerCase() === category.toLowerCase());

                if (!cardOpt) {
                    if (cardsInCategory.length === 0) {
                        return Response.json({
                            type: 4,
                            data: {
                                content: `No cards found in category "${category}".`,
                                allowed_mentions: { parse: [] }
                            }
                        });
                    }
                    const titles = cardsInCategory.map(c => c.title).join('\n');
                    return Response.json({
                        type: 4,
                        data: {
                            content: `Cards in **${category}**:\n${titles}`,
                            allowed_mentions: { parse: [] }
                        }
                    });
                }

                let cardTitle = cardOpt.value;
                if (cardTitle.length > 0) {
                    cardTitle = cardTitle.charAt(0).toUpperCase() + cardTitle.slice(1);
                }

                const card = cardsInCategory.find(c => c.title === cardTitle);

                if (!card) {
                    return Response.json({
                        type: 4,
                        data: {
                            content: `Card "${cardTitle}" not found in category "${category}".`,
                            allowed_mentions: { parse: [] }
                        }
                    });
                }

                let imageUrl = card.image || card.url || card.first || "";
                if (imageUrl && !imageUrl.startsWith("http")) {
                    imageUrl = `https://assets.grab-tutorials.live/${imageUrl.replace(/^\/+/, "")}`;
                }

                const embed = {
                    type: "rich",
                    title: card.title,
                    description: imageUrl ? imageUrl : '',
                    color: 0x5865F2,
                    fields: [],
                    image: imageUrl ? { url: imageUrl } : undefined
                };

                return Response.json({
                    type: 4,
                    data: {
                        content: '',
                        embeds: [embed],
                        allowed_mentions: { parse: [] }
                    }
                });
            }
        }

        return new Response("invalid request type", {status: 400});

    },
};