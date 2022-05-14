const Identity = require("@dfinity/identity");
const sha256 = require("sha256");
const fs = require("fs");
const Path = require("path");
const fetch = require("isomorphic-fetch");
const { Secp256k1KeyIdentity } = Identity;

const canisterIds = require("../../../.dfx/local/canister_ids.json");
const solarFlaresCanisterId = canisterIds.SolarFlares.local;
const ledgerCanisterId = canisterIds.ledger.local;
const erc721CanisterId = canisterIds.erc721.local;

const principals = ['swapp', 'ledger', 'user1', 'user2', 'user3'];

const solarFlaresDeclarations = require("../declarations/SolarFlares");
const ledgerDeclarations = require("../declarations/ledger");
const erc721Declarations = require("../declarations/erc721");

const parseIdentity = (keyPath) => {
  const rawKey = fs
    .readFileSync(Path.join(__dirname, keyPath))
    .toString()
    .replace("-----BEGIN EC PRIVATE KEY-----", "")
    .replace("-----END EC PRIVATE KEY-----", "")
    .trim();
  const rawBuffer = Uint8Array.from(rawKey).buffer;
  const privKey = Uint8Array.from(sha256(rawBuffer, { asBytes: true }));
  return Secp256k1KeyIdentity.fromSecretKey(Uint8Array.from(privKey).buffer);
};

const identities = {};

principals.forEach(identityName => {

  const identity = parseIdentity(`./pem/${identityName}.pem`);
  const solarFlaresActor = solarFlaresDeclarations.createActor(solarFlaresCanisterId, {
    agentOptions: {
      identity: identity,
      fetch,
      host: "http://host.docker.internal:8000",
    },
  });

  const ledgerActor = ledgerDeclarations.createActor(ledgerCanisterId, {
    agentOptions: {
      identity: identity,
      fetch,
      host: "http://host.docker.internal:8000",
    },
  });

  const erc721Actor = erc721Declarations.createActor(erc721CanisterId, {
    agentOptions: {
      identity: identity,
      fetch,
      host: "http://host.docker.internal:8000",
    },
  });

  identities[identityName] = {}
  identities[identityName].identity = identity;
  identities[identityName].solarFlaresActor = solarFlaresActor;
  identities[identityName].ledgerActor = ledgerActor;
  identities[identityName].erc721Actor = erc721Actor;

  console.log(identityName, identity.getPrincipal().toText());
});


module.exports = {
  identities,
  solarFlaresCanisterId,
  ledgerCanisterId,
  erc721CanisterId,
};
