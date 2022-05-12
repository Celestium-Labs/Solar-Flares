import { SignIdentity, PublicKey } from '@dfinity/agent';
// ic-stoic-identity is not typed
// @ts-ignore
import { StoicIdentity as StoicIdentityImport } from './stoicIdentity';
export { init as initStoicIdentity } from './stoicIdentity';

/** This is easier than creating a global .d.ts file... unless you're into that :P */
export const StoicIdentity: StoicIdentityType = StoicIdentityImport as any;

interface StoicIdentityType extends SignIdentity {
    connect(): Promise<StoicIdentityType>;
    load(host?: string): Promise<StoicIdentityType | undefined>;
    getPublicKey(): PublicKey;
    accounts(): string;
    disconnect(): void
}