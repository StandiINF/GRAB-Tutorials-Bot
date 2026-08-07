export const commands = [
  {
    name: "deck",
    description: "Preview a deck",
    options: [
      {
        name: "name",
        description: "The title of the deck",
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
    description: "Account commands",
    options: [
      {
        type: 1,
        name: "info",
        description: "Show your linked account",
        options: []
      },
      {
        type: 1,
        name: "link",
        description: "Link your account",
        options: [
          {
            name: "code",
            description: "Code given from the site",
            type: 3,
            required: true
          }
        ]
      },
      {
        type: 1,
        name: "unlink",
        description: "Unlink your account",
        options: []
      }
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2]
  },

  {
    name: "version",
    description: "Show the latest GRAB version and Build Number",
    options: [],
    integration_types: [0, 1],
    contexts: [0, 1, 2]
  },

  {
    name: "user",
    description: "Get a user's details (data from grab-tutorials.live, not grabvr.quest).",
    options: [
      {
        name: "username",
        description: "User's username.",
        type: 3,
        required: true
      }
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2]
  }
];
