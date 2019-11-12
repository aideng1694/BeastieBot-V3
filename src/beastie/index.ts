import tmi from "tmi.js";
import Twitter from "twitter";
import Discord from "discord.js";
import config from "../config";
import beastieOptions from "./beastieOptions";
import Webhooks from "../webhooks";
import twitterOptions from "../twitter/twitterOptions";
import { getBroadcasterId } from "../utils";
import { updateChattersAwesomeness, initStream } from "../utils";
import {
  awesomenessInterval,
  awesomenessIntervalAmount,
  discordInterval
} from "../utils/values";
import { determineBeastieResponse } from "./events/message";
import handleFollow from "../webhooks/events/follow";
import handleStreamChange from "../webhooks/events/streamChange";
import handleSubscribe from "../webhooks/events/subscribe";
import { handleDiscordReady } from "../discord";

interface StateType {
  isStreaming: boolean;
  curStreamId: number;
}

export default class BeastieBot {
  state: StateType;

  tmiClient: tmi.Client;
  webhooks: Webhooks;
  twitterClient: Twitter;
  discordClient: any;

  broadcasterUsername: string;
  broadcasterId: number;

  discordGuildId: string;
  discordWelcomeChId: string;
  discordAnnouncementsChId: string;

  awesomenessInterval: NodeJS.Timeout;
  awesomenessIntervalAmount: number;

  discordInterval: NodeJS.Timeout;

  private constructor() {}

  initTmi() {
    const tmiClient = new tmi.Client(beastieOptions);

    tmiClient.on("message", (channel, tags, message, self) => {
      if (!self) this.onTwitchMessage(tags, message);
    });

    tmiClient.on("connected", () => {
      this.onConnect("twitch");
    });

    tmiClient.on("disconnected", () => {
      console.log("BEASTIE HAS BEEN DISCONNECTED FROM TWITCH");
      this.onDisconnect("twitch");
    });

    process.on("SIGINT", () => {
      console.log("SHUTTING DOWN ON SIGINT");
      this.onDisconnect("twitch");
    });

    console.log("tmi init finished");
    return tmiClient;
  }

  initWebhooks() {
    const webhooks = new Webhooks();
    webhooks.connect(this.broadcasterId);
    webhooks.on("stream", this.onStreamChange.bind(this));
    webhooks.on("follow", this.onFollow.bind(this));
    //webhooks.on('subscribe', this.onSubscribe.bind(this))

    console.log("webhooks init finished");
    return webhooks;
  }

  initTwitter() {
    const twitterClient = new Twitter(twitterOptions);

    console.log("twitter init finished");
    return twitterClient;
  }

  initDiscord() {
    const discordClient = new Discord.Client();

    discordClient.on("ready", this.onDiscordReady.bind(this));

    discordClient.on("disconnect", () => {
      console.log("BEASTIE HAS BEEN DISCONNECTED FROM DISCORD");
      this.onDisconnect("discord");
    });

    discordClient.on("guildMemberAdd", this.onDiscordGuildMemberAdd.bind(this));

    console.log(`discord init finished`);
    return discordClient;
  }

  initState = async () => {
    const stream = await initStream();

    console.log("state init finished");
    return {
      ...this.state,
      isStreaming: stream.live,
      curStream: stream.id
    };
  };

  public static async create() {
    const beastie = new BeastieBot();

    beastie.state = {
      isStreaming: false,
      curStreamId: 0
    };

    beastie.awesomenessIntervalAmount = awesomenessIntervalAmount;

    beastie.tmiClient = beastie.initTmi();
    beastie.broadcasterId = await getBroadcasterId(config.BROADCASTER_USERNAME);

    beastie.webhooks = beastie.initWebhooks();
    beastie.twitterClient = beastie.initTwitter();
    beastie.discordClient = beastie.initDiscord();

    beastie.state = await beastie.initState();
    console.log("init finished");
    return beastie;
  }

  public async start() {
    await this.tmiClient.connect();
    await this.discordClient.login(config.DISCORD_TOKEN);
    //this.onConnect('discord');
    this.toggleStreamIntervals(this.state.isStreaming);
  }

  private toggleStreamIntervals(live) {
    if (live) {
      console.log("We are LIVE!");

      if (this.awesomenessInterval === undefined)
        this.awesomenessInterval = setInterval(async () => {
          updateChattersAwesomeness(this.awesomenessIntervalAmount);
        }, awesomenessInterval);

      if (this.discordInterval === undefined)
        this.discordInterval = setInterval(async () => {
          console.log(
            "DISCORD LINK: posted server link with short pitch of community!"
          );
        }, discordInterval);
    } else {
      clearInterval(this.awesomenessInterval);
      clearInterval(this.discordInterval);
    }
  }

  private onConnect(client) {
    const msg = `Hello team! I have awoken :D RAWR`;

    if (client === "twitch") this.twitchSay(msg);
    else if (client === "discord")
      this.discordSay(this.discordAnnouncementsChId, msg);
  }

  private onDisconnect(client) {
    const msg = `Goodbye team :) rawr`;

    if (client === "twitch") this.twitchSay(msg);
    else if (client === "discord")
      this.discordSay(this.discordAnnouncementsChId, msg);
  }

  private twitchSay(msg) {
    this.tmiClient.say(config.BROADCASTER_USERNAME, msg);
  }

  private discordSay(channel, msg) {
    this.discordClient.channels.get(channel).send(msg, {});
  }

  private onTwitchMessage(tags, message) {
    const response = determineBeastieResponse(tags, message);
    if (response) this.twitchSay(response);
  }

  private onStreamChange(payload) {
    const stream = payload.data[0];
    const response = handleStreamChange(
      stream,
      this.state.curStreamId,
      this.twitterClient
    );

    this.state.isStreaming = response.live;
    this.state.curStreamId = response.streamId;

    this.toggleStreamIntervals(this.state.isStreaming);
    this.twitchSay(response.msg);
    this.discordSay(this.discordAnnouncementsChId, response.msg);
  }

  private onFollow(payload) {
    const response = handleFollow(payload);
    this.twitchSay(response);
  }

  private onSubscribe(payload) {
    const response = handleSubscribe(payload);
    this.twitchSay(response);
  }

  private onDiscordReady() {
    const response = handleDiscordReady(this.discordClient);

    this.discordGuildId = response.discordGuildId;
    this.discordWelcomeChId = response.discordWelcomeChId;
    this.discordAnnouncementsChId = response.discordAnnouncementsChId;
  }

  private onDiscordGuildMemberAdd(member) {
    this.discordSay(
      this.discordWelcomeChId,
      `Welcome to our Discord guild ${member.user}! RAWR`
    );
  }
}

// add !awesomeness/!points command
// add !uptime/!stream/!streaminfo command
// install aws-sdk on desktop
// test local dynamodb on desktop
// create postToDiscord for when we go LIVE
// figure out why beastie's discordClient login() is not awaiting properly
