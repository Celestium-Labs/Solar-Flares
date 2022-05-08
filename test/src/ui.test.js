import { Principal } from "@dfinity/principal";
const { identities, erc721CanisterId, swappCanisterId, ledgerCanisterId } = require("./utils/identity");

const ext = require("./utils/ext");
const { tokenIdentifier, decodeTokenId, principalToAccountIdentifier, fromHexString, toHexString } = ext;

jest.setTimeout(60000);

let E8S = 100000000n
let SWAP_FEE = 2000000n;
let TRANSFER_FEE = 10000n;

const swappCanisterPrincipal = Principal.fromText(swappCanisterId);

xdescribe("Room Tests", () => {

  beforeAll(async () => {
  });

  afterEach(async () => {
  });

  afterAll(async () => {
  });

  it("transfer NFT to a plug wallet", async () => {

    const WALLET_PRINCIPAL_ID_1 = 't4o4v-w2hdc-6x33f-bamx4-tjsqi-snulf-f3zh2-vdtv6-mj43c-kjso6-iqe'

    const tokenIndex = await identities.swapp.erc721Actor.mintNFT({
      'to': { 'principal': Principal.fromText(WALLET_PRINCIPAL_ID_1) },
      'metadata': []
    });

    const accountIdentifier = principalToAccountIdentifier(WALLET_PRINCIPAL_ID_1, 0);
    // console.log('accountIdentifier', accountIdentifier);

    await identities.user1.ledgerActor.transfer({
      to: fromHexString(accountIdentifier),
      amount: { e8s: E8S },
      fee: { e8s: TRANSFER_FEE },
      memo: 1n,
      from_subaccount: [],
      created_at_time: [],
    });

    console.log('issued NFT to plug wallet1: ', tokenIndex)
  });


  it("transfer NFT to a plug wallet 2", async () => {

    const WALLET_PRINCIPAL_ID_1 = 'pblec-idudb-zapy3-hr4c5-jc7uf-egrmy-y7bra-nma6q-cviq3-46zpu-sqe'

    const tokenIndex = await identities.swapp.erc721Actor.mintNFT({
      'to': { 'principal': Principal.fromText(WALLET_PRINCIPAL_ID_1) },
      'metadata': []
    });

    const accountIdentifier = principalToAccountIdentifier(WALLET_PRINCIPAL_ID_1, 0);
    // console.log('accountIdentifier', accountIdentifier);

    await identities.user1.ledgerActor.transfer({
      to: fromHexString(accountIdentifier),
      amount: { e8s: E8S },
      fee: { e8s: TRANSFER_FEE },
      memo: 1n,
      from_subaccount: [],
      created_at_time: [],
    });

    console.log('issued NFT to plug wallet2: ', tokenIndex)
  });

});
