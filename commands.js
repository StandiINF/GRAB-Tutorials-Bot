export const commands = [
    {
        name: "deck",
        description: "Get a deck's cards",
        options: [
            {
                name: "name",
                description: "The name of the deck",
                "integration_types": [0,1],
                "contexts": [0,1,2],
                type: 3,
                required: true
            }
        ]
    },
];