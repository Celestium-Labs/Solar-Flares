import { Principal } from '@dfinity/principal';
import { getNFTActor, getAllNFTS, getCachedUserNFTs, NFTDetails, TokenRegistry } from '@psychedelic/dab-js'
import { Actor, HttpAgent } from '@dfinity/agent';

const options = {
  agentOptions: {
    host: process.env.NEXT_PUBLIC_IC_HOST,
  }
}

const nftCollections: { [name: string]: string } = {};

export async function getCachedNFTs(principal: string, refresh: boolean) {
  const collections = await getCachedUserNFTs({userPID: principal, refresh: refresh})
  const nfts: NFTDetails[] = []
  collections.forEach(c => {
    c.tokens.forEach(token => {
      return nfts.push(token);
    })
  })
  return nfts;
}

export async function getCanisterIds() {
  const nfts = await getAllNFTS()

  nftCollections[process.env.NEXT_PUBLIC_ERC721_CANISTER_ID ?? ''] = 'test nft';
  nfts.forEach(nft => {
    nftCollections[nft.principal_id.toString()] = nft.name;
  })

  return nfts.map(nft => nft.principal_id.toString())
}


export async function getNFTDetail(canisterId: string, standard: 'EXT', index: number) {

  if (Object.keys(nftCollections).length == 0) {
    await getCanisterIds();
  }

  const agent = new HttpAgent(options.agentOptions);

  const actor = getNFTActor({
    canisterId: canisterId,
    agent: agent as any,
    standard: standard
  });

  const details = await actor.details(index);
  details.name = nftCollections[details.canister];
  return details;
}

// export async function getAllNFTs(principal: string) {
//   const ic = (window as any).ic;
  
//   console.log('ic', ic)
//   console.log('ic plug', ic.plug)
//   console.log('ic plug agent', ic.plug.agent)

//   // const agent = await ic.plug.createAgent({
//   //   whitelist: ['aipdg-waaaa-aaaah-aaq5q-cai'],
//   //   host: process.env.NEXT_PUBLIC_IC_HOST,
//   // })

//   const agent = new HttpAgent(options.agentOptions);

//   const nnsCanisterId = 'aipdg-waaaa-aaaah-aaq5q-cai';
//   const nnsMetadata = await getAllNFTS();
//   console.log('nnsMetadata, nnsMetadata', nnsMetadata);

//   // const test = await getAllUserNFTs({user: principal})
//   // console.log('getAllUserNFTs', test);

//   const cached = await getCachedUserNFTs({userPID: principal, refresh: false})
//   console.log('cached', cached);

//   return 

//   // console.log('in', agent)
//   // console.log('in2', ic.plug.agent)
//   // console.log('principal', principal, typeof principal)

//   // if (ic && ic.plug && principal) {

//   //   return await getAllUserNFTs({
//   //     agent: ic.plug.agent,
//   //     user: principal
//   //   });
//   // } else {
//   //   alert('No plug wallet found.')
//   //   return;
//   // }
// }