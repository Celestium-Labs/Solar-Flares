import { createActor, canisterId, idlFactory } from "../declarations/ledger"
import { Actor, ActorSubclass, HttpAgent, Agent } from '@dfinity/agent';
import { _SERVICE } from "../declarations/ledger/ledger.did"
import { createAgent } from './wallet';

type Interface = ActorSubclass<_SERVICE>

const options = {
  agentOptions: {
    host: process.env.NEXT_PUBLIC_IC_HOST,
  }
}

export const TRANSFER_FEE = BigInt(process.env.NEXT_PUBLIC_TRANSFER_FEE ?? '');

console.log('TRANSFER_FEE', TRANSFER_FEE)

export default class LedgerActor {

  ic = (window as any).ic;
  actor: Interface | null = null;
  anonymous: Interface | null = null;

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

  async account_balance(accountIndentifier: number[]) {
    if (!this.anonymous) { return null }
    return await this.anonymous.account_balance({ account: accountIndentifier })
  }


  async transfer(to: number[], amount: bigint) {
    if (!this.actor) { return null }
    console.log('transfer_transactipn_fee', to)

    return await this.actor.transfer({
      to: to,
      amount: { e8s: amount },
      fee: { e8s: TRANSFER_FEE },
      memo: BigInt(1),
      from_subaccount: [],
      created_at_time: [],
    })

  }

}

