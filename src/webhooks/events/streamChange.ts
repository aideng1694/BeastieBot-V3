import { postToTwitter } from "../../twitter";
import { POST_EVENT } from "../../utils/values";

const handleStreamChange = (stream, curStreamId, twitterClient) => {
  console.log(stream);
  const live: boolean = stream.type ? stream.type === "live" : false;
  const streamId: number = stream.id ? stream.id : 0;

  if (streamId !== 0 && streamId !== curStreamId) {
    postToTwitter(POST_EVENT.LIVE, twitterClient, streamId);
    // postToDiscord(POST_EVENT.LIVE, discordClient)
  }

  const msg: string = `Our stream info has changed! :O`;

  return { live, streamId, msg };
};

export default handleStreamChange;
