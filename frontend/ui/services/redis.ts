import Redis from "ioredis";

// type NFT = {
//   name: string;
//   index: string;
//   url: string;
//   price: string;
//   activeUntil: string;
// }

// class Connector {

//   private static _instance: Connector;

//   client: Redis  
  
//   private constructor() {
//     this.client = new Redis(process.env.REDIS_ENDPOINT ?? '');
//   }

//   public static get instance(): Connector {

//     if (!this._instance) {
//       this._instance = new Connector();
//     }

//     return this._instance;
//   }

//   async fetchNFT(poolId: string) {
//     const res = await this.client.get(poolId);

//     if (res) {
//       return JSON.parse(res) as NFT
//     } else {
//       return null;
//     }
//   };

//   async setNFT(poolId: string, nft: NFT) {
//     this.client.set(poolId, JSON.stringify(nft))
//     this.client.lpush("nfts", poolId);
//   }

//   async getNFTs() {
//     const nfts = this.client.lrange("nfts", 0, -1);

//   }

// }


// export default Connector.instance;