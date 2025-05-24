import fetch from 'node-fetch';
import { commands } from './commands.js';

const token = process.env.DISCORD_TOKEN;
const application_id = process.env.DISCORD_APPLICATION_ID;
const guild_id = "1244383332805116037";

async function registerCommands() {
    // Separate deck command for guild, others for global
    const globalCommands = commands.filter(cmd => cmd.name !== "deck");
    const deckCommand = commands.find(cmd => cmd.name === "deck");

    // Register global commands
    if (globalCommands.length > 0) {
        const commands_url = `https://discord.com/api/v10/applications/${application_id}/commands`;
        const response = await fetch(commands_url, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bot ${token}`
            },
            method: 'PUT',
            body: JSON.stringify(globalCommands)
        });

        if (response.ok) {
            console.log('Registered global commands');
        } else {
            console.error('Error registering global commands');
            const text = await response.text();
            console.error(text);
        }
    }

    // Register deck command as guild command
    if (deckCommand) {
        const guild_commands_url = `https://discord.com/api/v10/applications/${application_id}/guilds/${guild_id}/commands`;
        const response = await fetch(guild_commands_url, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bot ${token}`
            },
            method: 'PUT',
            body: JSON.stringify([deckCommand])
        });

        if (response.ok) {
            console.log('Registered deck command as guild command');
        } else {
            console.error('Error registering deck command as guild command');
            const text = await response.text();
            console.error(text);
        }
    }
}

await registerCommands();