import ExtCore "./Core";
import Nat32 "mo:base/Nat32";
import Result "mo:base/Result";
import Blob "mo:base/Blob";

module {

  public func balance(canisterId: Text, user: Principal, tokenIndex: Nat): async Nat {

    let tokenId = ExtCore.TokenIdentifier.fromText(canisterId, Nat32.fromNat(tokenIndex));

    let canister = actor (canisterId): actor {
      balance: (request : ExtCore.BalanceRequest) -> async ExtCore.BalanceResponse;
    };

    switch (await canister.balance({
      user = #principal(user);
      token = tokenId;
    })) {
      case (#ok balance) {
        return balance;
      };
      case (#err err) {
        return 0;
      }
    }

  };

  public func transfer(canisterId: Text, from: Principal, to: Principal, tokenIndex: Nat): async ExtCore.TransferResponse {

    let tokenId = ExtCore.TokenIdentifier.fromText(canisterId, Nat32.fromNat(tokenIndex));

    let canister = actor(canisterId): actor {
      transfer: (request: ExtCore.TransferRequest) -> async ExtCore.TransferResponse;
    };

    return await canister.transfer({
      from = #principal(from);
      to = #principal(to);
      token = tokenId;
      amount = 1;
      memo = Blob.fromArray([1]);
      notify = false;
      subaccount = null;
    });

  };

}