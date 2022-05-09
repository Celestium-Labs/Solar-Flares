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

shared({caller = actorOwner}) actor class Lottery() = this {

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

  type LotteryStatus = {
    #Active;
    #Selected: {
      winner: Principal;
    };
    #InsufficientParticipants;
  };

  type Lottery = {
    id: Text;
    supply: Nat;
    price: Nat;
    activeUntil: Int;
    owner: Principal;
    token: Token;
    tickets: [Ticket];
    lockedTickets: [LockedTicket];
    status: LotteryStatus;
    createdAt: Int;
  };

  let ONE_MUNITE = 1000_000_000 * 60; // 1 sec * 60
  let ONE_HOUR = ONE_MUNITE * 60; // 1 min * 60
  let ONE_DAY = ONE_HOUR * 24; // 1 hour * 24

  // our principal id
  private stable var ownerPrincipal = actorOwner;

  // # of lottteries
  private stable var lotteryCount = 0;

  // how long a lottery is at least
  private stable var minimalDuration = ONE_DAY;

  // a buffer duration until a settlement starts after a lottery ends
  private stable var settlementBuffer = ONE_HOUR;

  // for upgrade
  private stable var lotteryEntries : [(Text, Lottery)] = [];
  private stable var lotteryIdsByOwnerEntries: [(Principal, [Text])] = [];
  private stable var nftsEntries: [(Text, Text)] = [];
  private stable var lotteryIdsEntries : [(Int, Text)] = [];

  // to store all lotteries
  private let lotteries : HashMap.HashMap<Text, Lottery> = HashMap.fromIter<Text, Lottery>(lotteryEntries.vals(), 0, Text.equal, Text.hash);
  // to store tokens
  private let nfts : HashMap.HashMap<Text, Text> = HashMap.fromIter<Text, Text>(nftsEntries.vals(), 0, Text.equal, Text.hash);
  // to store lotteries per owner
  private let lotteryIdsByOwner : HashMap.HashMap<Principal, [Text]> = HashMap.fromIter<Principal, [Text]>(lotteryIdsByOwnerEntries.vals(), 0, Principal.equal, Principal.hash);
  // to store lotteries ids
  private let lotteryIds : HashMap.HashMap<Int, Text> = HashMap.fromIter<Int, Text>(lotteryIdsEntries.vals(), 0, Int.equal, Int.hash);


  // 
  // create a lottery
  //
  type CreateSuccess = Text;
  type CreateError = {
    #InvalidSupply;
    #InvalidPrice;
    #InvalidActiveUntil;
    #NotTransferred;
  };
  type CreateResult = Result.Result<CreateSuccess, CreateError>;
  public shared({caller}) func create(supply: Nat, price: Nat, activeUntil: Nat, canisterId: Text, tokenIndex: Nat, standard: Text): async CreateResult {

    // check if the token has already registered or not
    let tokenId = canisterId # "-" # Nat.toText(tokenIndex);
    switch (nfts.get(tokenId)) {
      case null { };
      case (?lotteryId) {
        return #ok(lotteryId);
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
      // The lottery must long a certain duration at least
      return #err(#InvalidActiveUntil);
    };

    // check the ownership of the token
    let balance = await EXT.balance(canisterId, canisterAccount, tokenIndex);
    if (balance != 1) {
      return #err(#NotTransferred);
    };

    // Generate a lotteryId
    let now = Time.now();
    let hash = SHA224.Digest();
    hash.write(Blob.toArray(Text.encodeUtf8(Int.toText(lotteryCount))));
    hash.write(Blob.toArray(Text.encodeUtf8("-")));
    hash.write(Blob.toArray(Text.encodeUtf8(Int.toText(now))));
    hash.write(Blob.toArray(Text.encodeUtf8("-")));
    hash.write(Blob.toArray(Principal.toBlob(caller)));
    let id = Hex.encode(hash.sum());
    
    lotteryIds.put(lotteryCount, id);
    lotteryCount += 1;

    lotteries.put(id, {
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

    // Check if the lottery creator owns existing rooms. If they do, append the lottery ID to the existing array of lotteries. If not, create
    // an array of owned lotteries for the lottery creator.
    switch (lotteryIdsByOwner.get(caller)) {
      case (?lotteryIds) {
        let appended : Buffer.Buffer<Text> = Buffer.Buffer(0);
        for (lotteryId in lotteryIds.vals()) {
          appended.add(lotteryId);
        };
        appended.add(id);
        lotteryIdsByOwner.put(caller, appended.toArray());
      };
      case null {
        lotteryIdsByOwner.put(caller, [id]);
      };
    };

    return #ok(id);
  };

  // 
  // lock a ticket
  //
  type LockSuccess = LockedTicket;
  type LockError = {
    #LotteryNotFound;
    #CalledByOwner;
    #Full;
    #Ended;
  };
  type LockResult = Result.Result<LockSuccess, LockError>;
  public shared({caller}) func lock(lotteryId: Text, count: Nat): async LockResult {

    switch (lotteries.get(lotteryId)) {
      case null { 
        return #err(#LotteryNotFound);
      };
      case (?lottery) {

        if (caller == lottery.owner) {
          return #err(#CalledByOwner);
        };

        // check if the count is valid
        let issued = getTicketCount(lottery, true);
        if (issued + count > lottery.supply) {
          return #err(#Full);
        };

        // check if it's still active ot not
        if (Time.now() > lottery.activeUntil) {
          return #err(#Ended);
        };

        var lockedTicket: ?LockedTicket = null;

        for (ticket in lottery.lockedTickets.vals()) {
        
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
            let ticketId = lotteryId # "-" # Principal.toText(caller) # Int.toText(Time.now());

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
            for (ticket in lottery.lockedTickets.vals()) {
              appendedLockedTickets.add(ticket);
            };
            appendedLockedTickets.add(lockedTicket);

            lotteries.put(lotteryId, {
              id = lottery.id;
              supply = lottery.supply;
              price = lottery.price;
              activeUntil = lottery.activeUntil;
              owner = lottery.owner;
              token = lottery.token;
              tickets = lottery.tickets;
              lockedTickets = appendedLockedTickets.toArray();
              status = lottery.status;
              createdAt = lottery.createdAt;
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
  type UnLockSuccess = Lottery;
  type UnLockError = {
    #LotteryNotFound;
    #NotLocked;
    #Expired;
    #Unpaied;
  };
  type UnLockResult = Result.Result<UnLockSuccess, UnLockError>;
  public shared({caller}) func unlock(lotteryId: Text, ticketId: Text): async UnLockResult {

    let canisterAccount = Principal.fromActor(this);

    switch (lotteries.get(lotteryId)) {
      case null { 
        return #err(#LotteryNotFound);
      };
      case (?lottery) {

        var unlocked: ?Ticket = null; 
        let lockedTickets : Buffer.Buffer<LockedTicket> = Buffer.Buffer(0);
        var error: UnLockError = #NotLocked;
        
        for (locketTicket in lottery.lockedTickets.vals()) {
          let ticket = locketTicket.ticket;
          var found = false;
          if (ticket.participant == caller and ticket.ticketId == ticketId) {
            if (locketTicket.expiredAt < Time.now()) {
              // the ticket is expired
              error := #Expired;
            } else if (await ICP.hasTransferred(canisterAccount, ticket.ticketId, lottery.price * ticket.count)) {
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
            for (ticket in lottery.tickets.vals()) {
              appendedTickets.add(ticket);
            };
            appendedTickets.add(ticket);

            let newLottery: Lottery = {
              id = lottery.id;
              supply = lottery.supply;
              price = lottery.price;
              activeUntil = lottery.activeUntil;
              owner = lottery.owner;
              token = lottery.token;
              tickets = appendedTickets.toArray();
              lockedTickets = lockedTickets.toArray();
              status = lottery.status;
              createdAt = lottery.createdAt;
            };

            lotteries.put(lotteryId, newLottery);
            return #ok(newLottery);
          }
        };

      };
    };
  };

  // 
  // settle a lottery
  //
  public shared({caller}) func settle(lotteryId: Text): async ?LotteryStatus {

    if (ownerPrincipal != caller) {
      throw Error.reject("This method can be called only by the owner.");
    };

    switch (lotteries.get(lotteryId)) {
      case null { 
        return null;
      };
      case (?lottery) {

        let now = Time.now();

        if (lottery.activeUntil + settlementBuffer < now) {

          if (lottery.status != #Active) {

            // Already finished
            return ?lottery.status;

          } else if (getTicketCount(lottery, false) < lottery.supply) {

            // Transfer back the nft to the owner;
            ignore await EXT.transfer(lottery.token.canisterId, Principal.fromActor(this), lottery.owner, lottery.token.index);
            // Remove from the token list
            let tokenId = lottery.token.canisterId # "-" # Nat.toText(lottery.token.index);
            nfts.delete(tokenId);

            lotteries.put(lotteryId, {
              id = lottery.id;
              supply = lottery.supply;
              price = lottery.price;
              activeUntil = lottery.activeUntil;
              owner = lottery.owner;
              token = lottery.token;
              tickets = lottery.tickets;
              lockedTickets = lottery.lockedTickets;
              status = #InsufficientParticipants;
              createdAt = lottery.createdAt;
            });

            return ?#InsufficientParticipants;

          } else {

            // Select winner;
            var participants : Buffer.Buffer<Principal> = Buffer.Buffer(0);
            for (ticket in lottery.tickets.vals()) {
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
                ignore await EXT.transfer(lottery.token.canisterId, Principal.fromActor(this), winner, lottery.token.index);
                // Remove from the token list
                let tokenId = lottery.token.canisterId # "-" # Nat.toText(lottery.token.index);
                nfts.delete(tokenId);

                lotteries.put(lotteryId, {
                  id = lottery.id;
                  supply = lottery.supply;
                  price = lottery.price;
                  activeUntil = lottery.activeUntil;
                  owner = lottery.owner;
                  token = lottery.token;
                  tickets = lottery.tickets;
                  lockedTickets = lottery.lockedTickets;
                  status = #Selected({winner});
                  createdAt = lottery.createdAt;
                });

                return ?#Selected({winner});
              };
            }
          }

        } else {
          return ?lottery.status;
        }

      };
    };
  };

  // 
  // refund ICP
  //
  public shared({caller}) func refundICP(lotteryId: Text, ticketId: Text): async ?ICP.TransferResult {
    switch (lotteries.get(lotteryId)) {
      case null { 
        return null;
      };
      case (?lottery) {

        // Only lotteries with #InsufficientParticipants allow to refund
        if (lottery.status != #InsufficientParticipants) {
          return null;
        };

        Debug.print("IN");

        // make an array with locked and unlocked tickets
        var allTickets : Buffer.Buffer<Ticket> = Buffer.Buffer(0);
        for (ticket in lottery.tickets.vals()) {
          allTickets.add(ticket);
        };
        for (ticket in lottery.lockedTickets.vals()) {
          allTickets.add(ticket.ticket);
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

  // get a lottery count
  public func getTotalCount(): async Nat {
    return lotteryCount;
  };

  // get lotteries
  public shared({caller}) func getLotteries(since: Nat, to: Nat): async [Lottery] {

    if (to <= since) {
      throw Error.reject("`to` must be grather than `since`.");
    } else if (Nat.sub(to, since) > 50) {
      throw Error.reject("You can't fetch more than 50 items at once.");
    };
    
    let arr : Buffer.Buffer<Lottery> = Buffer.Buffer(0);
    for (i in Iter.range(since, to)) {
      let lotteryId = lotteryIds.get(i);
      switch (lotteryId) {
        case null { };
        case (?lotteryId) {
          let lottery = lotteries.get(lotteryId);
          switch (lottery) {
            case null {};
            case (?lottery) {
              arr.add(lottery);
            };
          };
        };
      };
    };
    return arr.toArray();
  };

  private func getTicketCount(lottery: Lottery, includeLockedTickets: Bool): Nat {

    var count = 0;

    for (ticket in lottery.tickets.vals()) {
      count += ticket.count;
    };

    if (includeLockedTickets) {

      for (locketTicket in lottery.lockedTickets.vals()) {
        // Ignore expired ones
        if (Time.now() < locketTicket.expiredAt) {
          count += locketTicket.ticket.count;
        }
      };
    };

    return count;
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
    lotteryEntries := Iter.toArray(lotteries.entries());
    lotteryIdsByOwnerEntries := Iter.toArray(lotteryIdsByOwner.entries());
    nftsEntries := Iter.toArray(nfts.entries());
    lotteryIdsEntries := Iter.toArray(lotteryIds.entries());
  };

  system func postupgrade() {
    lotteryEntries := [];
    lotteryIdsByOwnerEntries := [];
    nftsEntries := [];
    lotteryIdsEntries := [];
  };

}