import type { Principal } from '@dfinity/principal';
export type BlockIndex = bigint;
export type CreateError = { 'NotTransferred' : null } |
  { 'NotExists' : null };
export type CreateResult = { 'ok' : CreateSuccess } |
  { 'err' : CreateError };
export type CreateSuccess = string;
export type LockError = { 'Ended' : null } |
  { 'CalledByOwner' : null } |
  { 'Full' : null } |
  { 'LotteryNotFound' : null };
export type LockResult = { 'ok' : LockSuccess } |
  { 'err' : LockError };
export interface LockSuccess { 'ticket' : Ticket, 'expiredAt' : bigint }
export interface LockedTicket { 'ticket' : Ticket, 'expiredAt' : bigint }
export interface Lottery {
  'acceptCycles' : () => Promise<undefined>,
  'availableCycles' : () => Promise<bigint>,
  'cancelPreparation' : () => Promise<boolean>,
  'create' : () => Promise<CreateResult>,
  'getCreators' : () => Promise<Array<Principal>>,
  'getLotteries' : (arg_0: bigint, arg_1: bigint) => Promise<Array<Lottery__1>>,
  'getLottery' : (arg_0: string) => Promise<[] | [Lottery__1]>,
  'getPreparation' : () => Promise<[] | [Lottery__1]>,
  'getTimestamp' : () => Promise<bigint>,
  'getTotalCount' : () => Promise<bigint>,
  'lock' : (arg_0: string, arg_1: bigint) => Promise<LockResult>,
  'prepare' : (
      arg_0: bigint,
      arg_1: bigint,
      arg_2: bigint,
      arg_3: string,
      arg_4: bigint,
      arg_5: string,
    ) => Promise<PrepareResult>,
  'refundICP' : (arg_0: string, arg_1: string) => Promise<
      [] | [TransferResult]
    >,
  'setMinimalDuration' : (arg_0: bigint) => Promise<undefined>,
  'setOwner' : (arg_0: Principal) => Promise<undefined>,
  'setSettlementBuffer' : (arg_0: bigint) => Promise<undefined>,
  'unlock' : (arg_0: string, arg_1: string) => Promise<UnLockResult>,
}
export type LotteryStatus = { 'InsufficientParticipants' : null } |
  { 'Active' : null } |
  { 'Selected' : { 'winner' : Principal } };
export interface Lottery__1 {
  'id' : string,
  'activeUntil' : bigint,
  'status' : LotteryStatus,
  'token' : Token,
  'tickets' : Array<Ticket>,
  'owner' : Principal,
  'createdAt' : bigint,
  'lockedTickets' : Array<LockedTicket>,
  'supply' : bigint,
  'price' : bigint,
}
export type PrepareError = { 'InvalidActiveUntil' : null } |
  { 'NotAllowed' : null } |
  { 'InvalidPrice' : null } |
  { 'AlreadyExists' : null } |
  { 'NotOwned' : null } |
  { 'InvalidSupply' : null };
export type PrepareResult = { 'ok' : PrepareSuccess } |
  { 'err' : PrepareError };
export type PrepareSuccess = string;
export type SubAccount = Array<number>;
export interface Ticket {
  'count' : bigint,
  'ticketId' : string,
  'participant' : Principal,
  'payeeSubAccount' : SubAccount,
}
export interface Token {
  'index' : bigint,
  'standard' : string,
  'canisterId' : string,
}
export interface Tokens { 'e8s' : bigint }
export interface TransferError {
  'kind' : TransferError__1,
  'message' : [] | [string],
}
export type TransferError__1 = {
    'TxTooOld' : { 'allowed_window_nanos' : bigint }
  } |
  { 'BadFee' : { 'expected_fee' : Tokens } } |
  { 'TxDuplicate' : { 'duplicate_of' : BlockIndex } } |
  { 'TxCreatedInFuture' : null } |
  { 'InsufficientFunds' : { 'balance' : Tokens } };
export type TransferResult = { 'ok' : TransferSuccess } |
  { 'err' : TransferError };
export interface TransferSuccess { 'blockHeight' : bigint }
export type UnLockError = { 'NotLocked' : null } |
  { 'Unpaied' : null } |
  { 'LotteryNotFound' : null } |
  { 'Expired' : null };
export type UnLockResult = { 'ok' : UnLockSuccess } |
  { 'err' : UnLockError };
export interface UnLockSuccess {
  'id' : string,
  'activeUntil' : bigint,
  'status' : LotteryStatus,
  'token' : Token,
  'tickets' : Array<Ticket>,
  'owner' : Principal,
  'createdAt' : bigint,
  'lockedTickets' : Array<LockedTicket>,
  'supply' : bigint,
  'price' : bigint,
}
export interface _SERVICE extends Lottery {}
