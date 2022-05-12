import { createActor, canisterId, idlFactory } from "../declarations/lottery"
import { Actor, ActorSubclass } from '@dfinity/agent';
import { _SERVICE, Lottery__1 } from "../declarations/lottery/lottery.did"
import { createAgent } from './wallet';

type Interface = ActorSubclass<_SERVICE>

export type Lottery = Lottery__1;

const options = {
  agentOptions: {
    host: process.env.NEXT_PUBLIC_IC_HOST,
  }
}

export default class LotteryActor {

  ic = (window as any).ic;
  actor: Interface | null = null;
  anonymous: Interface | null = null;
  canisterId = canisterId ?? '';

  constructor() {
  }

  async createActor() {

    this.anonymous = await createActor(canisterId ?? '', options) as Interface

    let agent = createAgent();
    if (!agent) { return }
    this.actor = Actor.createActor(idlFactory, {
      agent: agent,
      canisterId: canisterId ?? '',
    })
  }

  async prepare(supply: number, price: number, activeUntil: Date, canisterId: string, tokenIndex: number, standard: string) {
    if (!this.actor) { return null }
    console.log('activeUntil', BigInt(activeUntil.getTime()) * BigInt(1000000))
    return await this.actor.prepare(BigInt(supply), BigInt(price), BigInt(activeUntil.getTime()) * BigInt(1000000), canisterId, BigInt(tokenIndex), standard);
  }

  async create() {
    if (!this.actor) { return null }
    return await this.actor.create();
  }

  async lock(lotteryId: string, count: number) {
    if (!this.actor) { return null }
    return await this.actor.lock(lotteryId, BigInt(count));
  }

  async unlock(lotteryId: string, ticketId: string) {
    if (!this.actor) { return null }
    return await this.actor.unlock(lotteryId, ticketId);
  }

  async refundICP(lotteryId: string, ticketId: string) {
    if (!this.actor) { return null }
    return await this.actor.refundICP(lotteryId, ticketId);
  }

  async getLotteries(since: number, to: number) {
    if (!this.anonymous) { return null }
    return await this.anonymous.getLotteries(BigInt(since), BigInt(to));
  }

  async getLottery(id: string) {
    if (!this.anonymous) { return null }
    return await this.anonymous.getLottery(id);
  }

  async getTotalCount() {
    if (!this.anonymous) { return null }
    return await this.anonymous.getTotalCount();
  }

  async getPreparation() {
    if (!this.actor) { return null }
    return await this.actor.getPreparation();
  }
}

