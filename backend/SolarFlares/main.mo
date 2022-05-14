import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Cycles "mo:base/ExperimentalCycles";
import EXT "./ext/EXT";
import Error "mo:base/Error";
import HashMap "mo:base/HashMap";
import Hex "./utils/Hex";
import ICP "./ICPLedger";
import Int "mo:base/Int";
import Nat8 "mo:base/Nat8";
import Iter "mo:base/Iter";
import L "../ledger/Ledger";
import Nat "mo:base/Nat";
import Int8 "mo:base/Int8";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Random "mo:base/Random";
import Result "mo:base/Result";
import SHA224 "./utils/SHA224";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Debug "mo:base/Debug";

shared({caller = actorOwner}) actor class SolarFlares() = this {

  type Token = {
    canisterId: Text;
    index: Nat;
    standard: Text;
  };

  type Ticket = {
    ticketId: Text;
    participant: Principal;
    payeeSubAccount: L.SubAccount;
    count: Nat;
  };

  type LockedTicket = {
    ticket: Ticket;
    expiredAt: Int;
  };

  type PoolStatus = {
    #Active;
    #Selected: {
      winner: Principal;
    };
    #InsufficientParticipants;
  };

  type Pool = {
    id: Text;
    supply: Nat;
    price: Nat;
    activeUntil: Int;
    owner: Principal;
    token: Token;
    tickets: [Ticket];
    lockedTickets: [LockedTicket];
    status: PoolStatus;
    createdAt: Int;
  };

  let ONE_MUNITE = 1000_000_000 * 60; // 1 sec * 60
  let ONE_HOUR = ONE_MUNITE * 60; // 1 min * 60
  let ONE_DAY = ONE_HOUR * 24; // 1 hour * 24

  // our principal id
  private stable var ownerPrincipal = actorOwner;

  // # of preparetions
  private stable var preparationCount = 0;
  // # of pools
  private stable var poolCount = 0;

  // how long a pool longs at least
  private stable var minimalDuration = ONE_DAY;

  // a buffer duration until a settlement starts after a pool ends
  private stable var settlementBuffer = ONE_HOUR;

  // for upgrade
  private stable var poolEntries : [(Text, Pool)] = [];
  private stable var poolIdsByOwnerEntries: [(Principal, [Text])] = [];
  private stable var nftsEntries: [(Text, Text)] = [];
  private stable var poolIdsEntries : [(Int, Text)] = [];
  private stable var preparationsEntries : [(Principal, Pool)] = [];
  private stable var creators : [Principal] = [];

  // to store all pools
  private let pools : HashMap.HashMap<Text, Pool> = HashMap.fromIter<Text, Pool>(poolEntries.vals(), 0, Text.equal, Text.hash);
  // to store tokens
  private let nfts : HashMap.HashMap<Text, Text> = HashMap.fromIter<Text, Text>(nftsEntries.vals(), 0, Text.equal, Text.hash);
  // to store pools per owner
  private let poolIdsByOwner : HashMap.HashMap<Principal, [Text]> = HashMap.fromIter<Principal, [Text]>(poolIdsByOwnerEntries.vals(), 0, Principal.equal, Principal.hash);
  // to store pools ids
  private let poolIds : HashMap.HashMap<Int, Text> = HashMap.fromIter<Int, Text>(poolIdsEntries.vals(), 0, Int.equal, Int.hash);
  // to store prepared pool
  private let preparations : HashMap.HashMap<Principal, Pool> = HashMap.fromIter<Principal, Pool>(preparationsEntries.vals(), 0, Principal.equal, Principal.hash);

  //
  // prepare a pool
  //
  type PrepareSuccess = Text;
  type PrepareError = {
    #InvalidSupply;
    #InvalidPrice;
    #InvalidActiveUntil;
    #NotOwned;
    #AlreadyExists;
    #NotAllowed;
  };
  type PrepareResult = Result.Result<PrepareSuccess, PrepareError>;
  public shared({caller}) func prepare(supply: Nat, price: Nat, activeUntil: Nat, canisterId: Text, tokenIndex: Nat, standard: Text): async PrepareResult {

    // see if the caller can prepare a pool
    var allowed = creators.size() == 0;
    for (principal in creators.vals()) {
      if (principal == caller) { allowed := true; };
    };

    if (allowed == false) {
      return #err(#NotAllowed);
    };

    // see if there is a prepared pool
    switch (preparations.get(caller)) {
      case (?pool) {
        return #err(#AlreadyExists);
      };
      case null {};
    };

    // check the ownership of the token
    let balance = await EXT.balance(canisterId, caller, tokenIndex);
    if (balance != 1) {
      return #err(#NotOwned);
    };

    // check if the token has already been registered or not
    let tokenId = canisterId # "-" # Nat.toText(tokenIndex);
    switch (nfts.get(tokenId)) {
      case null { };
      case (?poolId) {
        return #ok(poolId);
      };
    };

    let canisterAccount = Principal.fromActor(this);

    // simple validation    
    if (supply > 100) {
      return #err(#InvalidSupply);
    } else if (price < ICP.TRANSFER_FEE * 100) {
      // must be equal or grather than 0.01 ICP
      return #err(#InvalidPrice);
    } else if (activeUntil - Time.now() < minimalDuration) {
      // The pool must long a certain duration at least
      return #err(#InvalidActiveUntil);
    };

    // Generate a poolId
    let now = Time.now();
    let hash = SHA224.Digest();
    hash.write(Blob.toArray(Text.encodeUtf8(Int.toText(preparationCount))));
    hash.write(Blob.toArray(Text.encodeUtf8("-")));
    hash.write(Blob.toArray(Text.encodeUtf8(Int.toText(now))));
    hash.write(Blob.toArray(Text.encodeUtf8("-")));
    hash.write(Blob.toArray(Principal.toBlob(caller)));
    let id = Hex.encode(hash.sum());
    preparationCount += 1;

    preparations.put(caller, {
      id;
      supply;
      price;
      activeUntil;
      owner = caller;
      token = {
        canisterId;
        index = tokenIndex;
        standard;
      };
      tickets = [];
      lockedTickets = [];
      status = #Active;
      createdAt = Time.now();
    });

    return #ok(id);
  };

  // 
  // create a pool
  //
  type CreateSuccess = Text;
  type CreateError = {
    #NotTransferred;
    #NotExists;
  };
  type CreateResult = Result.Result<CreateSuccess, CreateError>;
  public shared({caller}) func create(): async CreateResult {

    switch (preparations.get(caller)) {

      case (?pool) {

        let canisterAccount = Principal.fromActor(this);
        // check the ownership of the token
        let balance = await EXT.balance(pool.token.canisterId, canisterAccount, pool.token.index);
        if (balance != 1) {
          return #err(#NotTransferred);
        };

        // Associate a pool index with a pool id
        poolIds.put(poolCount, pool.id);
        poolCount += 1;

        pools.put(pool.id, pool);
        preparations.delete(caller);

        // Check if the pool creator owns existing rooms. If they do, append the pool ID to the existing array of pools. If not, create
        // an array of owned pools for the pool creator.
        switch (poolIdsByOwner.get(caller)) {
          case (?poolIds) {
            let appended : Buffer.Buffer<Text> = Buffer.Buffer(0);
            for (poolId in poolIds.vals()) {
              appended.add(poolId);
            };
            appended.add(pool.id);
            poolIdsByOwner.put(caller, appended.toArray());
          };
          case null {
            poolIdsByOwner.put(caller, [pool.id]);
          };
        };

        return #ok(pool.id);

      };
      case null {

        return #err(#NotExists);

      };
    }

  };

  // 
  // lock a ticket
  //
  type LockSuccess = LockedTicket;
  type LockError = {
    #PoolNotFound;
    #CalledByOwner;
    #Full;
    #Ended;
  };
  type LockResult = Result.Result<LockSuccess, LockError>;
  public shared({caller}) func lock(poolId: Text, count: Nat): async LockResult {

    switch (pools.get(poolId)) {
      case null { 
        return #err(#PoolNotFound);
      };
      case (?pool) {

        if (caller == pool.owner) {
          return #err(#CalledByOwner);
        };

        // check if the count is valid
        let issued = getTicketCount(pool, true);
        if (issued + count > pool.supply) {
          return #err(#Full);
        };

        // check if it's still active ot not
        if (Time.now() > pool.activeUntil) {
          return #err(#Ended);
        };

        var lockedTicket: ?LockedTicket = null;

        for (ticket in pool.lockedTickets.vals()) {
        
          // if the caller matches the participant of a ticket & the ticket is still valid, returns the ticket
          if (ticket.ticket.participant == caller and Time.now() < ticket.expiredAt) {
            lockedTicket := ?ticket;
          }
        };

        switch (lockedTicket) {

          case (?t) {
            return #ok(t);
          };
          
          case null {
            let ticketId = poolId # "-" # Principal.toText(caller) # Int.toText(Time.now());

            let lockedTicket = {
              ticket = {
                ticketId = ticketId;
                participant = caller;
                payeeSubAccount = ICP.createSubaccount(ticketId);
                count = count;
              };
              expiredAt = Time.now() + ONE_MUNITE * 3; // A participant must execute payment in 3 mins otherwise it will get expired
            };

            let appendedLockedTickets : Buffer.Buffer<LockedTicket> = Buffer.Buffer(0);
            for (ticket in pool.lockedTickets.vals()) {
              appendedLockedTickets.add(ticket);
            };
            appendedLockedTickets.add(lockedTicket);

            pools.put(poolId, {
              id = pool.id;
              supply = pool.supply;
              price = pool.price;
              activeUntil = pool.activeUntil;
              owner = pool.owner;
              token = pool.token;
              tickets = pool.tickets;
              lockedTickets = appendedLockedTickets.toArray();
              status = pool.status;
              createdAt = pool.createdAt;
            });
            return #ok(lockedTicket);
          };
        }
      };
    };

  };

  // 
  // unlock a ticket (this function is called after a payment is made)
  //
  type UnLockSuccess = Pool;
  type UnLockError = {
    #PoolNotFound;
    #NotLocked;
    #Expired;
    #Unpaied;
  };
  type UnLockResult = Result.Result<UnLockSuccess, UnLockError>;
  public shared({caller}) func unlock(poolId: Text, ticketId: Text): async UnLockResult {

    let canisterAccount = Principal.fromActor(this);

    switch (pools.get(poolId)) {
      case null { 
        return #err(#PoolNotFound);
      };
      case (?pool) {

        var unlocked: ?Ticket = null; 
        let lockedTickets : Buffer.Buffer<LockedTicket> = Buffer.Buffer(0);
        var error: UnLockError = #NotLocked;
        
        for (locketTicket in pool.lockedTickets.vals()) {
          let ticket = locketTicket.ticket;
          var found = false;
          if (ticket.participant == caller and ticket.ticketId == ticketId) {

            if (locketTicket.expiredAt < Time.now()) {
              // the ticket is expired
              error := #Expired;
            } else if (await ICP.hasTransferred(canisterAccount, ticket.ticketId, pool.price * ticket.count)) {
              // the payment was made successfully
              unlocked := ?ticket;
              found := true;
            } else {
              // the payment was not made or insifficient
              error := #Unpaied;
            }

          };
          if (found == false and Time.now() < locketTicket.expiredAt) {
            // if the ticket is not unlocked and it's not expired yet, keep it locked
            lockedTickets.add(locketTicket);
          }
        };

        switch (unlocked) {
          case (null) {
            return #err(error);
          };
          case (?ticket) {

            let appendedTickets : Buffer.Buffer<Ticket> = Buffer.Buffer(0);
            for (ticket in pool.tickets.vals()) {
              appendedTickets.add(ticket);
            };
            appendedTickets.add(ticket);

            let newPool: Pool = {
              id = pool.id;
              supply = pool.supply;
              price = pool.price;
              activeUntil = pool.activeUntil;
              owner = pool.owner;
              token = pool.token;
              tickets = appendedTickets.toArray();
              lockedTickets = lockedTickets.toArray();
              status = pool.status;
              createdAt = pool.createdAt;
            };

            pools.put(poolId, newPool);
            return #ok(newPool);
          }
        };

      };
    };
  };

  // 
  // refund ICP
  //
  public shared({caller}) func refundICP(poolId: Text, ticketId: Text): async ?ICP.TransferResult {
    switch (pools.get(poolId)) {
      case null { 
        return null;
      };
      case (?pool) {

        Debug.print("IN");

        var allTickets : Buffer.Buffer<Ticket> = Buffer.Buffer(0);
        // purchased tickets can be refuneded only when the pool has not been sold out
        if (pool.status == #InsufficientParticipants) {
          for (ticket in pool.tickets.vals()) {
            allTickets.add(ticket);
          };
        };

        // locked tickets can be refuneded after the pool has ended
        if (pool.status != #Active) {
          for (ticket in pool.lockedTickets.vals()) {
            allTickets.add(ticket.ticket);
          };
        };

        for (ticket in allTickets.vals()) {
          Debug.print("ticket");
  
          if (ticket.participant == caller and ticket.ticketId == ticketId) {
            Debug.print("found");

            let canisterAccount = Principal.fromActor(this);

            let balance = await ICP.balance({account = canisterAccount; subaccount = ticket.payeeSubAccount});

            switch (balance) {
              case (#err err) {
                return null;
              };
              case (#ok balance) {
                Debug.print(Nat.toText(balance.balance));

                let amount = balance.balance;

                if (amount > ICP.TRANSFER_FEE) {

                  let to  = ICP.accountIdentifier(caller, ICP.defaultSubaccount());
                  let res = await ICP.transfer(?ticket.payeeSubAccount, to, amount - ICP.TRANSFER_FEE);
                  return ?res;

                } else {
                  return null;
                }
              
              };
            }

          }
        };
        return null;
      };
    };
  };

  // set an owner of this canister
  public shared({caller}) func setOwner(owner: Principal): async () {
    if (ownerPrincipal != caller) {
      throw Error.reject("This method can be called only by the owner.");
    };
    ownerPrincipal := owner;
  };

  // The following two functions are not necessary, but are kept for the sake of unit tests
  public shared({caller}) func setMinimalDuration(duration: Nat): async () {
    if (ownerPrincipal != caller) {
      throw Error.reject("This method can be called only by the owner.");
    };
    minimalDuration := duration;
  };

  public shared({caller}) func setSettlementBuffer(buffer: Nat): async () {
    if (ownerPrincipal != caller) {
      throw Error.reject("This method can be called only by the owner.");
    };
    settlementBuffer := buffer;
  };

  // get a pool count
  public func getTotalCount(): async Nat {
    return poolCount;
  };

  // get pool
  public shared({caller}) func getPool(id: Text): async ?Pool {

    switch (pools.get(id)) {
      case null { return null; };
      case (?pool) {

        if (pool.activeUntil < Time.now() and pool.status == #Active) {
          // settle
          ignore await settle(pool.id);
          return pools.get(id);
        } else {
          // active or ended
          return ?pool;
        }
      };
    };
  };

  // get pools
  public shared({caller}) func getPools(since: Nat, to: Nat): async [Pool] {

    if (to <= since) {
      throw Error.reject("`to` must be grather than `since`.");
    } else if (Nat.sub(to, since) > 100) {
      throw Error.reject("You can't fetch more than 100 items at once.");
    };
    
    let arr : Buffer.Buffer<Pool> = Buffer.Buffer(0);
    for (i in Iter.range(since, to)) {
      let poolId = poolIds.get(i);
      switch (poolId) {
        case null { };
        case (?poolId) {
          let pool = pools.get(poolId);
          switch (pool) {
            case null {};
            case (?pool) {
              arr.add(pool);
            };
          };
        };
      };
    };
    return arr.toArray();
  };

  // get a prepared pool
  public shared({caller}) func getPreparation(): async ?Pool {
    return preparations.get(caller);
  };

  // cancel a prepared pool
  public shared({caller}) func cancelPreparation(): async Bool {
    switch (preparations.get(caller)) {
      case null { return false; };
      case (?pool) {

        // Transfer back the nft to the owner;
        let balance = await EXT.balance(pool.token.canisterId, Principal.fromActor(this), pool.token.index);
        if (balance == 1) {
          ignore await EXT.transfer(pool.token.canisterId, Principal.fromActor(this), pool.owner, pool.token.index);
        };

        preparations.delete(caller);
        return true;

      };
    };
  };

  public shared({caller}) func setCreators(_creators: [Principal]): async () {
    if (ownerPrincipal != caller) {
      throw Error.reject("This method can be called only by the owner.");
    };
    creators := _creators;
  };

  public func getCreators(): async [Principal] {
    return creators;
  };

  public func getTimestamp(): async Int {
    return Time.now();
  };

  private func getTicketCount(pool: Pool, includeLockedTickets: Bool): Nat {

    var count = 0;

    for (ticket in pool.tickets.vals()) {
      count += ticket.count;
    };

    if (includeLockedTickets) {

      for (locketTicket in pool.lockedTickets.vals()) {
        // Ignore expired ones
        if (Time.now() < locketTicket.expiredAt) {
          count += locketTicket.ticket.count;
        }
      };
    };

    return count;
  };


  // 
  // settle a pool
  //
  private func settle(poolId: Text): async ?PoolStatus {

    Debug.print("settle " # poolId);

    switch (pools.get(poolId)) {
      case null { 
        return null;
      };
      case (?pool) {

        let now = Time.now();

        if (pool.activeUntil + settlementBuffer < now) {

          if (pool.status != #Active) {

            // Already finished
            Debug.print("Already finished");
            return ?pool.status;

          } else if (getTicketCount(pool, false) < pool.supply) {

            // Transfer back the nft to the owner;
            ignore await EXT.transfer(pool.token.canisterId, Principal.fromActor(this), pool.owner, pool.token.index);
            // Remove from the token list
            let tokenId = pool.token.canisterId # "-" # Nat.toText(pool.token.index);
            nfts.delete(tokenId);

            pools.put(poolId, {
              id = pool.id;
              supply = pool.supply;
              price = pool.price;
              activeUntil = pool.activeUntil;
              owner = pool.owner;
              token = pool.token;
              tickets = pool.tickets;
              lockedTickets = pool.lockedTickets;
              status = #InsufficientParticipants;
              createdAt = pool.createdAt;
            });
            Debug.print("Insufficient Participants");

            return ?#InsufficientParticipants;

          } else {

            // Select winner;
            var participants : Buffer.Buffer<Principal> = Buffer.Buffer(0);
            for (ticket in pool.tickets.vals()) {
              for (i in Iter.range(0, ticket.count)) {
                participants.add(ticket.participant);
              }
            };
            let candidates = participants.toArray();

            // create an entropy for random value generation
            let hash = SHA224.Digest();
            hash.write(Blob.toArray(Text.encodeUtf8(Int.toText(Time.now()))));
            hash.write(Blob.toArray(Text.encodeUtf8(Int.toText(candidates.size()))));
            let hashSum = hash.sum();
            let entropy = Blob.fromArray(hashSum);

            let sourceNumber = Random.Finite(entropy).range(Nat8.fromNat(candidates.size()));

            switch (sourceNumber) {
              case null {
                throw Error.reject("Failed to select a winner.");
              };
              case (?sourceNumber) {

                let index = sourceNumber % candidates.size();

                // TODO: remove these
                Debug.print("candidate length");
                Debug.print(Nat.toText(candidates.size()));
                Debug.print("sourceNumber");
                Debug.print(Nat.toText(sourceNumber));
                Debug.print("index");
                Debug.print(Nat.toText(index));
                
                let winner = candidates[index];
                // Transfer the nft to a winner;
                ignore await EXT.transfer(pool.token.canisterId, Principal.fromActor(this), winner, pool.token.index);
                // Remove from the token list
                let tokenId = pool.token.canisterId # "-" # Nat.toText(pool.token.index);
                nfts.delete(tokenId);

                pools.put(poolId, {
                  id = pool.id;
                  supply = pool.supply;
                  price = pool.price;
                  activeUntil = pool.activeUntil;
                  owner = pool.owner;
                  token = pool.token;
                  tickets = pool.tickets;
                  lockedTickets = pool.lockedTickets;
                  status = #Selected({winner});
                  createdAt = pool.createdAt;
                });
                Debug.print("Selected");
                return ?#Selected({winner});
              };
            }
          }

        } else {
          return ?pool.status;
        }

      };
    };
  };

  // Internal cycle management - good general case
  public func acceptCycles() : async () {
    let available = Cycles.available();
    let accepted = Cycles.accept(available);
    assert (accepted == available);
  };

  public query func availableCycles() : async Nat {
    return Cycles.balance();
  };

  // upgrade
  system func preupgrade() {
    preparationsEntries := Iter.toArray(preparations.entries());
    poolEntries := Iter.toArray(pools.entries());
    poolIdsByOwnerEntries := Iter.toArray(poolIdsByOwner.entries());
    nftsEntries := Iter.toArray(nfts.entries());
    poolIdsEntries := Iter.toArray(poolIds.entries());
  };

  system func postupgrade() {
    preparationsEntries := [];
    poolEntries := [];
    poolIdsByOwnerEntries := [];
    nftsEntries := [];
    poolIdsEntries := [];
  };

}