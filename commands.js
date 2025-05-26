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
    name: "link",
    description: "Link your account to this bot",
    options: [
      {
        name: "code",
        description: "Code from the site",
        type: 3,
        required: true
      }
    ],
  },

  {
    name: "account",
    description: "Show the GRAB Tutorials account linked to your Discord account",
    options: [],
  }
];
