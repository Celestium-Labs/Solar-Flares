import { createActor, canisterId, idlFactory } from "../declarations/SolarFlares"
import { Actor, ActorSubclass } from '@dfinity/agent';
import { _SERVICE, Pool as Pool1 } from "../declarations/SolarFlares/SolarFlares.did"
import { createAgent } from './wallet';

type Interface = ActorSubclass<_SERVICE>

export type Pool = Pool1;

const options = {
  agentOptions: {
    host: process.env.NEXT_PUBLIC_IC_HOST,
  }
}

export default class SolarFlaresActor {

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

  async lock(poolId: string, count: number) {
    if (!this.actor) { return null }
    return await this.actor.lock(poolId, BigInt(count));
  }

  async unlock(poolId: string, ticketId: string) {
    if (!this.actor) { return null }
    return await this.actor.unlock(poolId, ticketId);
  }

  async refundICP(poolId: string, ticketId: string) {
    if (!this.actor) { return null }
    return await this.actor.refundICP(poolId, ticketId);
  }

  async getPools(since: number, to: number) {
    if (!this.anonymous) { return null }
    return await this.anonymous.getPools(BigInt(since), BigInt(to));
  }

  async getPool(id: string) {
    if (!this.anonymous) { return null }
    return await this.anonymous.getPool(id);
  }

  async getTotalCount() {
    if (!this.anonymous) { return null }
    return await this.anonymous.getTotalCount();
  }

  async getPreparation() {
    if (!this.actor) { return null }
    return await this.actor.getPreparation();
  }

  async cancelPreparation() {
    if (!this.actor) { return null }
    return await this.actor.cancelPreparation();
  }

  async getCreators() {
    if (!this.anonymous) { return null }
    return await this.anonymous.getCreators();
  }

  async getTimestamp() {
    if (!this.anonymous) { return null }
    return await this.anonymous.getTimestamp();
  }
}

