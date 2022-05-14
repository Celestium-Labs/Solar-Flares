import { Principal } from "@dfinity/principal";
const { identities, erc721CanisterId, ledgerCanisterId } = require("./utils/identity");

const ext = require("./utils/ext");
const { tokenIdentifier, decodeTokenId, principalToAccountIdentifier, fromHexString, toHexString } = ext;

jest.setTimeout(60000);

let E8S = 100000000n
let SWAP_FEE = 2000000n;
let TRANSFER_FEE = 10000n;

xdescribe("Room Tests", () => {

  beforeAll(async () => {
  });

  afterEach(async () => {
  });

  afterAll(async () => {
  });

  it("transfer NFT to a plug wallet", async () => {

    const WALLET_PRINCIPAL_ID_1 = 't4o4v-w2hdc-6x33f-bamx4-tjsqi-snulf-f3zh2-vdtv6-mj43c-kjso6-iqe'

    for (let i = 0; i < 20; i++) {
      const tokenIndex = await identities.swapp.erc721Actor.mintNFT({
        'to': { 'principal': Principal.fromText(WALLET_PRINCIPAL_ID_1) },
        'metadata': []
      })
      console.log('issued NFT to plug wallet1: ', tokenIndex)
    }

    const accountIdentifier = principalToAccountIdentifier(WALLET_PRINCIPAL_ID_1, 0);
    console.log('accountIdentifier', accountIdentifier);

    const res = await identities.user1.ledgerActor.transfer({
      to: accountIdentifier,
      amount: { e8s: E8S * 10n },
      fee: { e8s: TRANSFER_FEE },
      memo: 1n,
      from_subaccount: [],
      created_at_time: [],
    });
    console.log('tranres', res)

    // const a = Principal.fromText("t4o4v-w2hdc-6x33f-bamx4-tjsqi-snulf-f3zh2-vdtv6-mj43c-kjso6-iqe");
    // await identities.swapp.solarFlaresActor.setCreators([a]);
    // console.log('creators', (await identities.swapp.solarFlaresActor.getCreators())[0].toString())

  });


  it("transfer NFT to a plug wallet 2", async () => {

    const WALLET_PRINCIPAL_ID_1 = 'pblec-idudb-zapy3-hr4c5-jc7uf-egrmy-y7bra-nma6q-cviq3-46zpu-sqe'

    const tokenIndex = await identities.swapp.erc721Actor.mintNFT({
      'to': { 'principal': Principal.fromText(WALLET_PRINCIPAL_ID_1) },
      'metadata': []
    });

    const accountIdentifier = principalToAccountIdentifier(WALLET_PRINCIPAL_ID_1, 0);
    console.log('accountIdentifier', accountIdentifier);

    const res = await identities.user1.ledgerActor.transfer({
      to: accountIdentifier,
      amount: { e8s: E8S * 10n },
      fee: { e8s: TRANSFER_FEE },
      memo: 1n,
      from_subaccount: [],
      created_at_time: [],
    });
    console.log('tranres', res)

    console.log('issued NFT to plug wallet2: ', tokenIndex)
  });

});
