import { Secp256k1KeyIdentity } from "@dfinity/identity";
import sha256 from "sha256";
import fs from "fs";
import Path from "path";
import fetch from "isomorphic-fetch";

const canisterIds = JSON.parse(fs.readFileSync('../canister_ids.json', 'utf8'));

const solarFlaresCanisterId = canisterIds.SolarFlares.ic;
console.log('solarFlaresCanisterId', solarFlaresCanisterId)

import { createActor } from "./declarations/SolarFlares/index.js";

const parseIdentity = (keyPath) => {
  const rawKey = fs
    .readFileSync(keyPath)
    .toString()
    .replace("-----BEGIN EC PRIVATE KEY-----", "")
    .replace("-----END EC PRIVATE KEY-----", "")
    .trim();
  const rawBuffer = Uint8Array.from(rawKey).buffer;
  const privKey = Uint8Array.from(sha256(rawBuffer, { asBytes: true }));
  return Secp256k1KeyIdentity.fromSecretKey(Uint8Array.from(privKey).buffer);
};

export const identity = parseIdentity(`../test/src/utils/pem/swapp.pem`);
export const actor = createActor(solarFlaresCanisterId, {
  agentOptions: {
    identity: identity,
    fetch,
    host: "https://ic0.app",
  },
});