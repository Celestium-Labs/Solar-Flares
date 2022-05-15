import { identity, actor } from "./actor.js";
import { Principal } from "@dfinity/principal";

async function main() {

  const res = await actor.setCreators([
    Principal.fromText('t4o4v-w2hdc-6x33f-bamx4-tjsqi-snulf-f3zh2-vdtv6-mj43c-kjso6-iqe'),
    Principal.fromText('isjmi-hshrf-j3ioi-57rkf-xqrrc-s4ffk-e5g7e-ulrdk-d7w5v-lxycz-qqe'),

    Principal.fromText('2rn4f-p7gly-y6s6i-cxl4k-mt2ni-t7o7e-wexrj-ee72b-53fmk-itgq2-fae'),
    Principal.fromText('6hkds-lu4hb-xzgfz-5tjez-wzsjt-lcqtb-cpb77-kolfe-j53qb-waoo6-eae'),
    Principal.fromText('7gizo-kirkx-vw4ry-vuitj-3g6jn-chq7i-wiaaw-4hjqu-hqmsd-nuhln-wqe'),
    Principal.fromText('qqekv-7iosz-3wkyq-f7342-lj6gm-ezptp-emvci-5wqag-xk5xv-gzeje-vqe'),
    Principal.fromText('exrj2-7srnh-dyqjf-7bdks-jjjv6-n3bsx-lj7f3-og5nu-kcp4q-rziff-xae'),

  ])
  

  console.log('res', res)
}

main();