// const Identity = require("@dfinity/identity");
// const sha256 = require("sha256");
// const fs = require("fs");
// const Path = require("path");
// const localCanisterIds = require("../../../.dfx/local/canister_ids.json");
// const canisterId = localCanisterIds.erc721.local;
// const fetch = require("isomorphic-fetch");

// const { Secp256k1KeyIdentity } = Identity;
// const declarations = require("../declarations/erc721");

// const parseIdentity = (keyPath) => {
//   const rawKey = fs
//     .readFileSync(Path.join(__dirname, keyPath))
//     .toString()
//     .replace("-----BEGIN EC PRIVATE KEY-----", "")
//     .replace("-----END EC PRIVATE KEY-----", "")
//     .trim();

//   const rawBuffer = Uint8Array.from(rawKey).buffer;

//   const privKey = Uint8Array.from(sha256(rawBuffer, { asBytes: true }));

//   // Initialize an identity from the secret key
//   return Secp256k1KeyIdentity.fromSecretKey(Uint8Array.from(privKey).buffer);
// };

// const { createActor } = declarations;

// const defaultIdentity = parseIdentity("test-ec-secp256k1-priv-key.pem");
// const erc721DefaultActor = createActor(canisterId, {
//   agentOptions: {
//     identity: defaultIdentity,
//     fetch,
//     host: "http://host.docker.internal:8000",
//   },
// });

// // Account that will receive a large balance of ICP for testing from install.sh
// const balanceHolderIdentity = parseIdentity(
//   "test-ec-secp256k1-priv-key-balanceholder.pem"
// );
// const erc721BalanceHolder = createActor(canisterId, {
//   agentOptions: {
//     identity: balanceHolderIdentity,
//     fetch,
//     host: "http://host.docker.internal:8000",
//   },
// });

// module.exports = {
//   erc721DefaultActor,
//   erc721BalanceHolder,
//   erc721CanisterId: canisterId,
// };
