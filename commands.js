export const commands = [
  {
    name: "deck",
    description: "Get a deck's cards",
    options: [
      {
        name: "name",
        description: "The name of the deck",
        type: 3,
        required: true,
        autocomplete: true
      }
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2]
  },

  {
    name: "account",
    description: "Account management for GRAB Tutorials",
    options: [
      {
        type: 1,
        name: "info",
        description: "Show the GRAB Tutorials account linked to your Discord account",
        options: []
      },
      {
        type: 1,
        name: "link",
        description: "Link your site account to this bot",
        options: [
          {
            name: "code",
            description: "Code from the site",
            type: 3,
            required: true
          }
        ]
      },
      {
        type: 1,
        name: "unlink",
        description: "Unlink your Discord account from the site",
        options: []
      }
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2]
  },

  {
    name: "version",
    description: "Show the latest GRAB version and Build Number!",
    options: [],
    integration_types: [0, 1],
    contexts: [0, 1, 2]
  }
];
];
