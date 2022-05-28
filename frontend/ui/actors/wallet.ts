import { getCanisterIds } from './dab';
import { canisterId as ledgerCanisterId } from "../declarations/ledger"
import { canisterId as solarFlaresCanisterId } from "../declarations/SolarFlares"
import { StoicIdentity } from "../services/stoicIdentityType";
export { initStoicIdentity } from "../services/stoicIdentityType";
import { Identity, HttpAgent, Agent } from '@dfinity/agent';
import Loader from '../components/Loader';

let dabCanisterIds: string[] = [];

let identity: Identity | null = null; 
let loggedWallet : 'plug' | 'stoic' | null = null;

export function getIdentity() {
  return identity;
}

export function getWallet() {
  return loggedWallet;
}

export function createAgent() {

  const ic = (typeof window !== "undefined") ? (window as any).ic : null;

  let agent: Agent | null = null;

  if (ic && ic.plug && ic.plug.agent) {
    agent = ic.plug.agent;
  } else {
    if (identity) {
      agent = new HttpAgent({
        host: process.env.NEXT_PUBLIC_IC_HOST,
        identity: identity
      });

      if (process.env.NEXT_PUBLIC_ENV != 'prod') {
        agent.fetchRootKey();
      }

      console.log('agent', process.env.NEXT_PUBLIC_IC_HOST, identity)
    }
  }

  return agent;
}

export async function login(wallet: 'plug' | 'stoic'): Promise<string | 'failed' | null> {

  const ic = (typeof window !== "undefined") ? (window as any).ic : null;

  const principalId = await isLogged();

  if (principalId) {
  
    return principalId;
  
  } else if (wallet == 'plug') {

    if (!ic.plug) {
      return 'failed';
    }

    const whitelists: string [] = [ledgerCanisterId ?? '', solarFlaresCanisterId ?? ''];
    if (process.env.NEXT_PUBLIC_ENV != 'prod') {
      whitelists.push(process.env.NEXT_PUBLIC_ERC721_CANISTER_ID ?? '');
    }

    if (dabCanisterIds.length == 0) {
      dabCanisterIds = await getCanisterIds();
    }
    whitelists.push(...dabCanisterIds);

    console.log('process.env.NEXT_PUBLIC_IC_HOST', process.env.NEXT_PUBLIC_IC_HOST)

    const res = await ic.plug.requestConnect({
      whitelist: whitelists,
      host: process.env.NEXT_PUBLIC_IC_HOST,
      timeout: 50000,
    });
    console.log('res', res)

    identity = await ic.plug.agent._identity;

    const logged = ic.plug.isConnected();
    if (logged) {
      localStorage.setItem("_loginType", wallet);
      return (await ic.plug.getPrincipal()).toString() as string
      loggedWallet = wallet;
    }
    return null;

  } else {

    try {

      console.log('StoicIdentity', StoicIdentity)

      const stoicIdentity = await StoicIdentity.connect();

      if (stoicIdentity != null) {
        localStorage.setItem("_loginType", wallet);
        identity = stoicIdentity;
        loggedWallet = wallet;
        return stoicIdentity.getPrincipal().toText()
      } else {
        return 'failed';
      }
    } catch (e) {
      console.log('e', e)
    }

    return null;
  }
  
}

export async function isLogged(): Promise<string | null> {

  const ic = (window as any).ic;

  const wallet = localStorage.getItem("_loginType");

  if (wallet == 'plug' && ic && ic.plug) {
    const logged = await ic.plug.isConnected();
    if (logged) {

      const whitelists: string [] = [ledgerCanisterId ?? '', solarFlaresCanisterId ?? ''];
      if (process.env.NEXT_PUBLIC_ENV != 'prod') {
        whitelists.push(process.env.NEXT_PUBLIC_ERC721_CANISTER_ID ?? '');
      }

      if (dabCanisterIds.length == 0) {
        dabCanisterIds = await getCanisterIds();
      }
      whitelists.push(...dabCanisterIds);
      
      await ic.plug.createAgent({
        whitelist: whitelists,
        host: process.env.NEXT_PUBLIC_IC_HOST,
      })
      loggedWallet = wallet;
      return (await ic.plug.getPrincipal()).toString() as string
    }
  } else if (wallet == 'stoic') {
    const stoicIdentity = await StoicIdentity.load();
    if (stoicIdentity) {
      identity = stoicIdentity;
      loggedWallet = wallet;
      return stoicIdentity.getPrincipal().toText()
    }
  }

  return null;
}

export async function logout() {
  const ic = (window as any).ic;
  if (ic && ic.plug) {
    ic.plug.disconnect();
  }
  StoicIdentity.disconnect();
  localStorage.removeItem("_loginType");
}