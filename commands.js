export const commands = [
    {
        name: "basic",
        description: "Basic command",
    },
    {
        name: "embed",
        description: "Embed command",
    },
    {
        name: "input",
        description: "Command with input",
        options: [
            {
                name: "input",
                description: "String input",
                required: true,
                type: 3
            }
        ]
    },
    {
        name: "deck",
        description: "Deck commands",
        options: [
            {
                type: 3,
                name: "title",
                description: "Title of the card",
                required: true,

                choices: []
            }
        ]
    }
];
