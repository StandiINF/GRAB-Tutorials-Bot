export const commands = [
  {
    name: "deck",
    description: "Get a deck's cards",
    dm_permission: true,
    options: [
      {
        name: "name",
        description: "The name of the deck",
        type: 3,
        required: true
      }
    ]
  }
];
