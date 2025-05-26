
import { REST, Routes } from 'discord.js';

const CLIENT_ID = process.env.DISCORD_APPLICATION_ID;
const TOKEN = process.env.DISCORD_TOKEN;

const rest = new REST({ version: '10' }).setToken(TOKEN);

try {
  console.log('🧹 Deleting all global commands...');
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
  console.log('✅ Successfully deleted all global commands.');
} catch (error) {
  console.error('❌ Failed to delete commands:', error);
}
