export const commands = [
    {
        name: "deck",
        description: "Deck commands",
        options: [
            {
                type: 3,
                name: "category",
                description: "Category of the deck",
                required: true,
                choices: [
                    { name: "basics", value: "basics" },
                    { name: "editor", value: "editor" },
                    { name: "animation", value: "animation" },
                    { name: "trigger", value: "trigger" }
                ]
            },
            {
                type: 3,
                name: "card",
                description: "Title of the card",
                required: true,
                autocomplete: true
            }
        ]
    },
    {
        name: "test",
        description: "Test image embed"
    }
];
