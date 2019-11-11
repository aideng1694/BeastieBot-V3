import { POST_EVENT } from "../utils/values";

const announceStreamOnTwitter = async (client, streamId) => {
  await client.post(
    "statuses/update",
    {
      status: `BeastieBot is rawring because we are LIVE! RAWR https://www.twitch.tv/teamTALIMA#stream-${streamId} #teamTALIMA #GameDev #WebDev`
    },
    (error, tweet, response) => {
      if (error) throw error;
      console.log(tweet); // Tweet body.
      console.log(response); // Raw response object.
    }
  );
};

export const postToTwitter = (event, client, streamId) => {
  switch (event) {
    case POST_EVENT.LIVE:
      announceStreamOnTwitter(client, streamId);
      return;
    case POST_EVENT.NONE:
      // do this
      return;
    default:
      return;
  }
};
