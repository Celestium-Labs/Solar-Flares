import { Actor, ActorSubclass } from '@dfinity/agent';
import { idlFactory } from "../../declarations/erc721"
import { _SERVICE } from "../../declarations/erc721/erc721.did"
import { Principal } from '@dfinity/principal';
import { createAgent } from '../wallet';
import { principalToAccountIdentifier } from '../../utils/ext'

type ERC721Actor = ActorSubclass<_SERVICE>

export default class EXTNftActor {

  canisterId: string;
  actor: ERC721Actor | null = null;

  constructor(canisterId: string) {
    this.canisterId = canisterId;
  }

  async createAgent() {
    let agent = createAgent();
    if (!agent) { return }
    this.actor = Actor.createActor(idlFactory, {
      agent: agent,
      canisterId: this.canisterId,
    })
  }

  async approveSwapp(tokenIndex: number) {
    return null;

    // if (!this.actor) { return null }

    // const spender = Principal.fromText(process.env.NEXT_PUBLIC_SWAPP_CANISTER_ID ?? '');

    // return await this.actor.approve({
    //     'token': tokenIdentifier(this.canisterId, tokenIndex),
    //     'subaccount': [],
    //     'allowance': BigInt(1),
    //     'spender': spender
    //   });
  }

  async transfer(tokenIndex: number, from: string, to: string) {

    if (!this.actor) { return null }

    const fromUser = Principal.fromText(from);
    const toUser = Principal.fromText(to);
    const id = tokenIdentifier(this.canisterId, tokenIndex); 
    
    return await this.actor.transfer({
      'to' : { 'principal' : toUser },
      'token' : id,
      'notify' : false,
      'from' : { 'principal' : fromUser },
      'memo' : [1],
      'subaccount' : [],
      'amount' : BigInt(1),
      });
  }

  async approve(tokenIndex: number, to: string) {

    return null
  }

  async details(tokenIndex: number) {

    if (!this.actor) { return null }
    console.log(this.canisterId, tokenIndex)
    console.log('tokenID', tokenIdentifier(this.canisterId, tokenIndex))
    return await this.actor.details(tokenIdentifier(this.canisterId, tokenIndex))
  }


  async list(tokenIndex: number) {

    if (!this.actor) { return null }
    return await this.actor.list({
      token: tokenIdentifier(this.canisterId, tokenIndex),
      from_subaccount: [],
      price: []
    })
  }

  async lock(tokenIndex: number, price: bigint, to: string) {

    if (!this.actor) { return null }
    
    const toAccountIdentifier = principalToAccountIdentifier(to, null);

    const _getRandomBytes = () => {
      var bs = [];
      for (var i = 0; i < 32; i++) {
        bs.push(Math.floor(Math.random() * 256));
      }
      return bs;
    };

    const a = await this.actor.details(tokenIdentifier(this.canisterId, tokenIndex))
    
    return await this.actor.lock(
      tokenIdentifier(this.canisterId, tokenIndex),
      price,
      toAccountIdentifier,
      _getRandomBytes()
    );
  }

  async settle(tokenIndex: number) {

    if (!this.actor) { return null }
    
    return await this.actor.settle(
      tokenIdentifier(this.canisterId, tokenIndex),
    );
  }

}

const to32bits = (num: number) => {
  let b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, num);
  return Array.from(new Uint8Array(b));
}

const tokenIdentifier = (canisterId: string, index: number) => {
  const padding = new Buffer("\x0Atid");
  const array = new Uint8Array([
      ...Array.from(Uint8Array.from(padding)),
      ...Array.from(Principal.fromText(canisterId).toUint8Array()),
      ...to32bits(index),
  ]);
  return Principal.fromUint8Array(array).toText();
};
