import { identity, actor } from "./actor.js";
import { Principal } from "@dfinity/principal";

async function main() {

  const res = await actor.setCreators([
    Principal.fromText('t4o4v-w2hdc-6x33f-bamx4-tjsqi-snulf-f3zh2-vdtv6-mj43c-kjso6-iqe'),
    Principal.fromText('2rn4f-p7gly-y6s6i-cxl4k-mt2ni-t7o7e-wexrj-ee72b-53fmk-itgq2-fae'),
    Principal.fromText('6hkds-lu4hb-xzgfz-5tjez-wzsjt-lcqtb-cpb77-kolfe-j53qb-waoo6-eae'),
  ])

  console.log('res', res)
}

main();