import { identity, actor } from "./actor.js";
import { Principal } from "@dfinity/principal";

console.log(identity, actor)

async function main() {

  const res = await actor.setOwner([
    Principal.fromText('sajsc-opcbj-2kasj-vyxv5-j5adf-6h3j4-zr6st-jjdxk-u6xw2-qzl2k-iqe'),
  ])

  console.log('res', res)
}

main();