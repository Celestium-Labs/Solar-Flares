import { identity, actor } from "./actor.js";
import { Principal } from "@dfinity/principal";

async function main() {

  const res = await actor.setCreators([
    Principal.fromText('t4o4v-w2hdc-6x33f-bamx4-tjsqi-snulf-f3zh2-vdtv6-mj43c-kjso6-iqe'),
  ])

  console.log('res', res)
}

main();