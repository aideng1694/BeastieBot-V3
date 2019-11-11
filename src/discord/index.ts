export const handleDiscordReady = discordClient => {
  console.log(`Beastie is ready in Discord! RAWR`);
  const discordGuildId = discordClient.guilds.find(g => g.name === "teamTALIMA")
    .id;
  const discordWelcomeChId = discordClient.guilds
    .get(discordGuildId)
    .channels.find(ch => ch.name === "general").id;
  const discordAnnouncementsChId = discordClient.guilds
    .get(discordGuildId)
    .channels.find(ch => ch.name === "announcements").id;
  return { discordGuildId, discordWelcomeChId, discordAnnouncementsChId };
};
