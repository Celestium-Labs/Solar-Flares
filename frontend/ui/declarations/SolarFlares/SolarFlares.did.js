export const idlFactory = ({ IDL }) => {
  const CreateSuccess = IDL.Text;
  const CreateError = IDL.Variant({
    'NotTransferred' : IDL.Null,
    'NotExists' : IDL.Null,
  });
  const CreateResult = IDL.Variant({
    'ok' : CreateSuccess,
    'err' : CreateError,
  });
  const PoolStatus = IDL.Variant({
    'InsufficientParticipants' : IDL.Null,
    'Active' : IDL.Null,
    'Selected' : IDL.Record({ 'winner' : IDL.Principal }),
  });
  const Token = IDL.Record({
    'index' : IDL.Nat,
    'standard' : IDL.Text,
    'canisterId' : IDL.Text,
  });
  const SubAccount = IDL.Vec(IDL.Nat8);
  const Ticket = IDL.Record({
    'count' : IDL.Nat,
    'ticketId' : IDL.Text,
    'participant' : IDL.Principal,
    'payeeSubAccount' : SubAccount,
  });
  const LockedTicket = IDL.Record({ 'ticket' : Ticket, 'expiredAt' : IDL.Int });
  const Pool = IDL.Record({
    'id' : IDL.Text,
    'activeUntil' : IDL.Int,
    'status' : PoolStatus,
    'token' : Token,
    'tickets' : IDL.Vec(Ticket),
    'owner' : IDL.Principal,
    'createdAt' : IDL.Int,
    'lockedTickets' : IDL.Vec(LockedTicket),
    'supply' : IDL.Nat,
    'price' : IDL.Nat,
  });
  const LockSuccess = IDL.Record({ 'ticket' : Ticket, 'expiredAt' : IDL.Int });
  const LockError = IDL.Variant({
    'Ended' : IDL.Null,
    'CalledByOwner' : IDL.Null,
    'Full' : IDL.Null,
    'PoolNotFound' : IDL.Null,
  });
  const LockResult = IDL.Variant({ 'ok' : LockSuccess, 'err' : LockError });
  const PrepareSuccess = IDL.Text;
  const PrepareError = IDL.Variant({
    'InvalidActiveUntil' : IDL.Null,
    'NotAllowed' : IDL.Null,
    'InvalidPrice' : IDL.Null,
    'AlreadyExists' : IDL.Null,
    'NotOwned' : IDL.Null,
    'InvalidSupply' : IDL.Null,
  });
  const PrepareResult = IDL.Variant({
    'ok' : PrepareSuccess,
    'err' : PrepareError,
  });
  const TransferSuccess = IDL.Record({ 'blockHeight' : IDL.Nat64 });
  const Tokens = IDL.Record({ 'e8s' : IDL.Nat64 });
  const BlockIndex = IDL.Nat64;
  const TransferError__1 = IDL.Variant({
    'TxTooOld' : IDL.Record({ 'allowed_window_nanos' : IDL.Nat64 }),
    'BadFee' : IDL.Record({ 'expected_fee' : Tokens }),
    'TxDuplicate' : IDL.Record({ 'duplicate_of' : BlockIndex }),
    'TxCreatedInFuture' : IDL.Null,
    'InsufficientFunds' : IDL.Record({ 'balance' : Tokens }),
  });
  const TransferError = IDL.Record({
    'kind' : TransferError__1,
    'message' : IDL.Opt(IDL.Text),
  });
  const TransferResult = IDL.Variant({
    'ok' : TransferSuccess,
    'err' : TransferError,
  });
  const UnLockSuccess = IDL.Record({
    'id' : IDL.Text,
    'activeUntil' : IDL.Int,
    'status' : PoolStatus,
    'token' : Token,
    'tickets' : IDL.Vec(Ticket),
    'owner' : IDL.Principal,
    'createdAt' : IDL.Int,
    'lockedTickets' : IDL.Vec(LockedTicket),
    'supply' : IDL.Nat,
    'price' : IDL.Nat,
  });
  const UnLockError = IDL.Variant({
    'PoolNotFound' : IDL.Null,
    'NotLocked' : IDL.Null,
    'Unpaied' : IDL.Null,
    'Expired' : IDL.Null,
  });
  const UnLockResult = IDL.Variant({
    'ok' : UnLockSuccess,
    'err' : UnLockError,
  });
  const SolarFlares = IDL.Service({
    'acceptCycles' : IDL.Func([], [], []),
    'availableCycles' : IDL.Func([], [IDL.Nat], ['query']),
    'cancelPreparation' : IDL.Func([], [IDL.Bool], []),
    'create' : IDL.Func([], [CreateResult], []),
    'getCreators' : IDL.Func([], [IDL.Vec(IDL.Principal)], []),
    'getPool' : IDL.Func([IDL.Text], [IDL.Opt(Pool)], []),
    'getPools' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(Pool)], []),
    'getPreparation' : IDL.Func([], [IDL.Opt(Pool)], []),
    'getTimestamp' : IDL.Func([], [IDL.Int], []),
    'getTotalCount' : IDL.Func([], [IDL.Nat], []),
    'lock' : IDL.Func([IDL.Text, IDL.Nat], [LockResult], []),
    'prepare' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat, IDL.Text, IDL.Nat, IDL.Text],
        [PrepareResult],
        [],
      ),
    'refundICP' : IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(TransferResult)], []),
    'setMinimalDuration' : IDL.Func([IDL.Nat], [], []),
    'setOwner' : IDL.Func([IDL.Principal], [], []),
    'setSettlementBuffer' : IDL.Func([IDL.Nat], [], []),
    'unlock' : IDL.Func([IDL.Text, IDL.Text], [UnLockResult], []),
  });
  return SolarFlares;
};
export const init = ({ IDL }) => { return []; };
