import L     "../ledger/Ledger";

import CRC32      "./utils/CRC32";
import Hex        "./utils/Hex";
import SHA224     "./utils/SHA224";

import Blob       "mo:base/Blob";
import Nat        "mo:base/Nat";
import Nat64      "mo:base/Nat64";
import Nat8       "mo:base/Nat8";
import Nat32      "mo:base/Nat32";
import Array      "mo:base/Array";
import Text       "mo:base/Text";

import Principal  "mo:base/Principal";
import Result     "mo:base/Result";
import Time       "mo:base/Time";
import Int        "mo:base/Int";

module {

  public let TRANSFER_FEE =   10000;
  public let E8S =   100000000;

  let Ledger = L.Ledger;

  public type TransferSuccess = {
    blockHeight : Nat64;
  };

  public type TransferError = {
    message : ?Text;
    kind : L.TransferError;
  };

  public type TransferResult = Result.Result<TransferSuccess, TransferError>;

  public func transfer(fromSubaccount: ?L.SubAccount, to: L.AccountIdentifier, amount: Nat) : async TransferResult {

    let args: L.TransferArgs = {
      to;
      fee = {e8s = Nat64.fromNat(TRANSFER_FEE); };
      memo = 1;
      from_subaccount = fromSubaccount;
      created_at_time = null;
      amount = {e8s = Nat64.fromNat(amount); };
    };

    let result = await Ledger.transfer(args);
    switch result {
      case (#Ok index) {
        #ok({blockHeight = index});
      };
      case (#Err err) {
        switch err {
          case (#BadFee kind) {
            let expected_fee = kind.expected_fee;
            #err({
              message = ?("Bad Fee. Expected fee of " # Nat64.toText(expected_fee.e8s) # " but got " # Nat64.toText(args.fee.e8s));
              kind = #BadFee({expected_fee});
            });
          };
          case (#InsufficientFunds kind) {
            let balance = kind.balance;
            #err({
              message = ?("Insufficient balance. Current balance is " # Nat64.toText(balance.e8s));
              kind = #InsufficientFunds({balance});
            })
          };
          case (#TxTooOld kind) {
            let allowed_window_nanos = kind.allowed_window_nanos;
            #err({
              message = ?("Error - Tx Too Old. Allowed window of " # Nat64.toText(allowed_window_nanos));
              kind = #TxTooOld({allowed_window_nanos});
            })
          };
          case (#TxCreatedInFuture) {
            #err({
              message = ?"Error - Tx Created In Future";
              kind = #TxCreatedInFuture;
            })
          };
          case (#TxDuplicate kind) {
            let duplicate_of = kind.duplicate_of;
            #err({
              message = ?("Error - Duplicate transaction. Duplicate of " # Nat64.toText(duplicate_of));
              kind = #TxDuplicate({duplicate_of});
            })
          };
        };
      };
    };
  };

  type AccountArgs = {
    account : Principal;
    subaccount: L.SubAccount;
  };
  public type BalanceResult = Result.Result<BalanceSuccess, BalanceError>;

  type BalanceSuccess = {
    balance : Nat;
  };
  type BalanceError = {
    message : ?Text;
    kind : {
      #InvalidToken;
      #InvalidAccount;
      #NotFound;
      #Other;
    };
  };
  public func balance(args : AccountArgs) : async BalanceResult {

    let account = accountIdentifier(args.account, args.subaccount);
    let balance = await Ledger.account_balance({account});
    #ok({
      balance = Nat64.toNat(balance.e8s);
    });
  };

  public func beBytes(n : Nat32) : [Nat8] {
    func byte(n : Nat32) : Nat8 {
      Nat8.fromNat(Nat32.toNat(n & 0xff))
    };
    [byte(n >> 24), byte(n >> 16), byte(n >> 8), byte(n)]
  };

  public func defaultSubaccount() : L.SubAccount {
    Blob.fromArrayMut(Array.init(32, 0 : Nat8))
  };

  public func accountIdentifier(principal : Principal, subaccount : L.SubAccount) : L.AccountIdentifier {
    let hash = SHA224.Digest();
    hash.write([0x0A]);
    hash.write(Blob.toArray(Text.encodeUtf8("account-id")));
    hash.write(Blob.toArray(Principal.toBlob(principal)));
    hash.write(Blob.toArray(subaccount));
    let hashSum = hash.sum();
    let crc32Bytes = beBytes(CRC32.ofArray(hashSum));
    Blob.fromArray(Array.append(crc32Bytes, hashSum))
  };

  public func createSubaccount(ticketId: Text) : L.AccountIdentifier {
    let idHash = SHA224.Digest();
    idHash.write(Blob.toArray(Text.encodeUtf8(ticketId)));
    let hashSum = idHash.sum();
    let crc32Bytes = beBytes(CRC32.ofArray(hashSum));
    Blob.fromArray(Array.append(crc32Bytes, hashSum))
  };

  public func hasTransferred(account: Principal, ticketId: Text, transactionFee: Nat): async Bool {
    switch (await balance({
      account = account;
      subaccount = createSubaccount(ticketId);
    })) {
      case (#ok balance) {
        return balance.balance >= transactionFee - TRANSFER_FEE;
      };
      case (#err err) {
        return false;
      }
    }
  };

  public func distributeICP(ticketId: Text, provider: Principal, developer: Principal, canisterAccount: Principal): async [TransferResult] {
    
    let fromSubaccount   = createSubaccount(ticketId);
    let providerAccount  = accountIdentifier(provider, defaultSubaccount());
    let developerAccount = accountIdentifier(developer, defaultSubaccount());

    switch(await balance({
      account = canisterAccount;
      subaccount = fromSubaccount;
    })) {
      case (#ok balance) {
        let availableICP = balance.balance;
        if (availableICP > TRANSFER_FEE * 2) {
          let amountToProvider = balance.balance * 9 / 10;
          let resultToProvider = await transfer(?fromSubaccount, providerAccount, amountToProvider - TRANSFER_FEE);

          let amountToDeveloper = availableICP - amountToProvider;
          let resultToDeveloper  = await transfer(?fromSubaccount, developerAccount, amountToDeveloper - TRANSFER_FEE);

          return [resultToProvider, resultToDeveloper];
        };
      };
      case (#err err) {};
    };

    return [];
  };

}