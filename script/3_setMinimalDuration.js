import { identity, actor } from "./actor.js";
import { Principal } from "@dfinity/principal";

async function main() {

  let ONE_SEC = 1000_000_000; // 1 sec
  let ONE_MUNITE = ONE_SEC * 60; // 1 sec * 60
  let ONE_HOUR = ONE_MUNITE * 60; // 1 min * 60
  let ONE_DAY = ONE_HOUR * 24; // 1 hour * 24

  const res1 = await actor.setMinimalDuration(ONE_DAY * 2);
  const res2 = await actor.setMaximumDuration(ONE_DAY * 15);

  console.log('res', res1, res2)
}

main();