require("source-map-support").install();
require("dotenv").config();
import Beastie from "./beastie";

const beastie = Beastie.create();

beastie.then(() => {
  console.log("BeastieBot is alive! RAWR");
});
