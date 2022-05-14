import { Principal } from "@dfinity/principal";
const { identities, erc721CanisterId, solarFlaresCanisterId, ledgerCanisterId } = require("./utils/identity");

const ext = require("./utils/ext");
const { tokenIdentifier, decodeTokenId, principalToAccountIdentifier, fromHexString, toHexString } = ext;

jest.setTimeout(60000);

function delay(n) {
  return new Promise(function (resolve) {
    setTimeout(resolve, n * 1000);
  });
}

let E8S = 100000000n
let MILLI2NANO = 1000000;
let FIFTEEN_SECS = 20 * 1000;
let TRANSFER_FEE = 10000n;

const solarFlaresCanisterPrincipal = Principal.fromText(solarFlaresCanisterId);

xdescribe("Lottery Tests", () => {

  beforeAll(async () => {
    console.log('aaa', new Date().getTime())
    await identities.swapp.solarFlaresActor.setMinimalDuration(1);
    await identities.swapp.solarFlaresActor.setSettlementBuffer(1);
  });

  afterEach(async () => {
  });

  afterAll(async () => {
  });

  it("Run lottery sccessfully", async () => {

    const tokenIndex1 = await identities.swapp.erc721Actor.mintNFT({
      'to': { 'principal': identities.user1.identity.getPrincipal() },
      'metadata': []
    });

    console.log('tokenIndex1', tokenIndex1)
    const id1 = tokenIdentifier(erc721CanisterId, tokenIndex1);
    console.log('id1', id1)

    let supply = 30n
    let price = E8S * 2n / 100n;
    let activeUntil = (new Date().getTime() + FIFTEEN_SECS) * MILLI2NANO
    let standard = 'EXT'

    const prepareResult = await identities.user1.solarFlaresActor.prepare(supply, price, activeUntil, erc721CanisterId, tokenIndex1, standard)
    console.log('prepareResult', prepareResult)
    const lotteryId = prepareResult.ok;
    expect(lotteryId.length).toEqual(56);

    const transferred = await identities.user1.erc721Actor.transfer({
      'from': { 'principal': identities.user1.identity.getPrincipal() },
      'to': { 'principal': solarFlaresCanisterPrincipal },
      'token': id1,
      'amount': 1n,
      'memo': [1],
      'notify': false,
      'subaccount': [],
    });
    expect(transferred.ok).toEqual(1n);
    console.log('transferred', transferred)

    const createResult = await identities.user1.solarFlaresActor.create()
    console.log('createResult', createResult)
    expect(createResult.ok).toEqual(lotteryId);

    const totalLotteryCount = await identities.user1.solarFlaresActor.getTotalCount()
    console.log('totalLotteryCount', totalLotteryCount.toString())
    const count = parseInt(totalLotteryCount.toString());
    console.log('count', count)

    const lotteries = await identities.user1.solarFlaresActor.getPools(count - 1, count)
    console.log('lotteries', lotteries)
    expect(lotteries.length).toEqual(1);

    const lottery = lotteries[0];
    expect(lottery.id).toEqual(lotteryId);
    expect(lottery.activeUntil).toEqual(BigInt(activeUntil));
    expect(lottery.status).toEqual({ Active: null });
    expect(lottery.tickets.length).toEqual(0);
    expect(lottery.lockedTickets.length).toEqual(0);
    expect(lottery.supply.toString()).toEqual(supply.toString());
    expect(lottery.price.toString()).toEqual(price.toString());
    expect(lottery.token.index.toString()).toEqual(tokenIndex1.toString());
    expect(lottery.token.standard).toEqual('EXT');
    expect(lottery.owner).toEqual(identities.user1.identity.getPrincipal());

    // try to create
    const lockResult1 = await identities.user1.solarFlaresActor.lock(lotteryId, 1)
    console.log(lockResult1)
    expect(lockResult1.err).toEqual({ "CalledByOwner": null });

    let user2Supply = 20n;
    let user3Supply = supply - user2Supply;

    const lockResult2 = await identities.user2.solarFlaresActor.lock(lotteryId, user2Supply)
    console.log('lockResult2', lockResult2)
    const ticket2 = lockResult2.ok.ticket;
    expect(ticket2.count.toString()).toEqual(user2Supply.toString());
    expect(ticket2.participant).toEqual(identities.user2.identity.getPrincipal());

    const lockResult3 = await identities.user3.solarFlaresActor.lock(lotteryId, user3Supply)
    console.log('lockResult3', lockResult3)
    const ticket3 = lockResult3.ok.ticket;
    expect(ticket3.count.toString()).toEqual(user3Supply.toString());
    expect(ticket3.participant).toEqual(identities.user3.identity.getPrincipal());

    const lockResult4 = await identities.user3.solarFlaresActor.lock(lotteryId, 1)
    console.log('lockResult4', lockResult4)
    expect(lockResult4.err).toEqual({ "Full": null });

    await delay(5);

    // TODO: test this in a different function because `settle` can only be called once
    // const settleResult = await identities.swapp.solarFlaresActor.settle(lotteryId)
    // console.log('settleResult', settleResult)
    // expect(settleResult[0]).toEqual({ "InsufficientParticipants": null });

    console.log('ticket2', ticket2)
    {
      const unlockResult = await identities.user2.solarFlaresActor.unlock(lotteryId, "invalid id");
      console.log('unlockResult', unlockResult);
      expect(unlockResult.err).toEqual({ "NotLocked": null });
    }
    {
      const unlockResult = await identities.user2.solarFlaresActor.unlock(lotteryId, ticket2.ticketId);
      console.log('unlockResult', unlockResult);
      expect(unlockResult.err).toEqual({ "Unpaied": null });
    }

    // make payments

    {
      const to = principalToAccountIdentifier(solarFlaresCanisterId, ticket2.payeeSubAccount);
      console.log('to', to)
      const transferredBlock2 = await identities.user2.ledgerActor.transfer({
        to: to,
        amount: { e8s: ticket2.count * lottery.price },
        fee: { e8s: TRANSFER_FEE },
        memo: 1n,
        from_subaccount: [],
        created_at_time: [],
      });
      expect(transferredBlock2.Ok).toBeGreaterThan(0n);

      const unlockResult2 = await identities.user2.solarFlaresActor.unlock(lotteryId, ticket2.ticketId);
      console.log('unlockResult2', unlockResult2);

      var unlocked = false;
      unlockResult2.ok.tickets.forEach(ticket => {
        if (ticket.ticketId == ticket2.ticketId) {
          unlocked = true;
        }
      })
      expect(unlocked).toEqual(true);

      unlocked = true;
      unlockResult2.ok.lockedTickets.forEach(ticket => {
        if (ticket.ticket.ticketId == ticket2.ticketId) {
          unlocked = false;
        }
      })
      expect(unlocked).toEqual(true);
    }

    {
      const to = principalToAccountIdentifier(solarFlaresCanisterId, ticket3.payeeSubAccount);
      console.log('to', to)
      const transferredBlock3 = await identities.user3.ledgerActor.transfer({
        to: to,
        amount: { e8s: ticket3.count * lottery.price },
        fee: { e8s: TRANSFER_FEE },
        memo: 1n,
        from_subaccount: [],
        created_at_time: [],
      });
      console.log('transferredBlock3', transferredBlock3)
      expect(transferredBlock3.Ok).toBeGreaterThan(0n);

      const unlockResult3 = await identities.user3.solarFlaresActor.unlock(lotteryId, ticket3.ticketId);
      console.log('unlockResult3', unlockResult3);

      var unlocked = false;
      unlockResult3.ok.tickets.forEach(ticket => {
        if (ticket.ticketId == ticket2.ticketId) {
          unlocked = true;
        }
      })
      expect(unlocked).toEqual(true);

      unlocked = true;
      unlockResult3.ok.lockedTickets.forEach(ticket => {
        if (ticket.ticket.ticketId == ticket2.ticketId) {
          unlocked = false;
        }
      })
      expect(unlocked).toEqual(true);
    }

    // setlement
    const lotteryResult = await identities.swapp.solarFlaresActor.getPool(lotteryId);
    console.log('lotteryResult', lotteryResult)

    {
      const lottery = lotteryResult[0];
      expect(lottery.id).toEqual(lotteryId);
      expect(lottery.activeUntil).toEqual(BigInt(activeUntil));
      expect(JSON.stringify(lottery.status).indexOf('Selected') > -1).toEqual(true);
      expect(lottery.tickets.length).toEqual(2);
      expect(lottery.lockedTickets.length).toEqual(0);
      expect(lottery.supply.toString()).toEqual(supply.toString());
      expect(lottery.price.toString()).toEqual(price.toString());
      expect(lottery.token.index.toString()).toEqual(tokenIndex1.toString());
      expect(lottery.token.standard).toEqual('EXT');
      expect(lottery.owner).toEqual(identities.user1.identity.getPrincipal());
    }

  });

  it("Failed to execute lottery because of insufficient participants", async () => {

    const tokenIndex1 = await identities.swapp.erc721Actor.mintNFT({
      'to': { 'principal': identities.user1.identity.getPrincipal() },
      'metadata': []
    });

    console.log('tokenIndex1', tokenIndex1)
    const id1 = tokenIdentifier(erc721CanisterId, tokenIndex1);
    console.log('id1', id1)

    let supply = 30n
    let price = E8S * 2n / 100n;
    let activeUntil = (new Date().getTime() + FIFTEEN_SECS) * MILLI2NANO
    let standard = 'EXT'

    const prepareResult = await identities.user1.solarFlaresActor.prepare(supply, price, activeUntil, erc721CanisterId, tokenIndex1, standard)
    console.log('prepareResult', prepareResult)
    const lotteryId = prepareResult.ok;
    expect(lotteryId.length).toEqual(56);

    const transferred = await identities.user1.erc721Actor.transfer({
      'from': { 'principal': identities.user1.identity.getPrincipal() },
      'to': { 'principal': solarFlaresCanisterPrincipal },
      'token': id1,
      'amount': 1n,
      'memo': [1],
      'notify': false,
      'subaccount': [],
    });
    expect(transferred.ok).toEqual(1n);
    console.log('transferred', transferred)

    const createResult = await identities.user1.solarFlaresActor.create()
    console.log('createResult', createResult)
    expect(createResult.ok).toEqual(lotteryId);

    const totalLotteryCount = await identities.user1.solarFlaresActor.getTotalCount()
    console.log('totalLotteryCount', totalLotteryCount.toString())
    const count = parseInt(totalLotteryCount.toString());
    console.log('count', count)

    const lotteries = await identities.user1.solarFlaresActor.getPools(count - 1, count)
    console.log('lotteries', lotteries)
    expect(lotteries.length).toEqual(1);

    const lottery = lotteries[0];
    expect(lottery.id).toEqual(lotteryId);
    expect(lottery.activeUntil).toEqual(BigInt(activeUntil));
    expect(lottery.status).toEqual({ Active: null });
    expect(lottery.tickets.length).toEqual(0);
    expect(lottery.lockedTickets.length).toEqual(0);
    expect(lottery.supply.toString()).toEqual(supply.toString());
    expect(lottery.price.toString()).toEqual(price.toString());
    expect(lottery.token.index.toString()).toEqual(tokenIndex1.toString());
    expect(lottery.token.standard).toEqual('EXT');
    expect(lottery.owner).toEqual(identities.user1.identity.getPrincipal());

    let user2Supply = 20n;
    let user3Supply = 1n;

    const lockResult2 = await identities.user2.solarFlaresActor.lock(lotteryId, user2Supply)
    console.log('lockResult2', lockResult2)
    const ticket2 = lockResult2.ok.ticket;
    expect(ticket2.count.toString()).toEqual(user2Supply.toString());
    expect(ticket2.participant).toEqual(identities.user2.identity.getPrincipal());

    const lockResult3 = await identities.user3.solarFlaresActor.lock(lotteryId, user3Supply)
    console.log('lockResult3', lockResult3)
    const ticket3 = lockResult3.ok.ticket;
    expect(ticket3.count.toString()).toEqual(user3Supply.toString());
    expect(ticket3.participant).toEqual(identities.user3.identity.getPrincipal());

    const lockResult4 = await identities.user3.solarFlaresActor.lock(lotteryId, 1)
    console.log('lockResult4', lockResult4)
    const ticket4 = lockResult4.ok.ticket;
    expect(ticket4.count.toString()).toEqual(user3Supply.toString());
    expect(ticket4.participant).toEqual(identities.user3.identity.getPrincipal());

    await delay(5);

    // payment

    {
      const to = principalToAccountIdentifier(solarFlaresCanisterId, ticket2.payeeSubAccount);
      console.log('to', to)
      const transferredBlock2 = await identities.user2.ledgerActor.transfer({
        to: to,
        amount: { e8s: ticket2.count * lottery.price },
        fee: { e8s: TRANSFER_FEE },
        memo: 1n,
        from_subaccount: [],
        created_at_time: [],
      });
      expect(transferredBlock2.Ok).toBeGreaterThan(0n);

      const unlockResult2 = await identities.user2.solarFlaresActor.unlock(lotteryId, ticket2.ticketId);
      console.log('unlockResult2', unlockResult2);

      var unlocked = false;
      unlockResult2.ok.tickets.forEach(ticket => {
        if (ticket.ticketId == ticket2.ticketId) {
          unlocked = true;
        }
      })
      expect(unlocked).toEqual(true);

      unlocked = true;
      unlockResult2.ok.lockedTickets.forEach(ticket => {
        if (ticket.ticket.ticketId == ticket2.ticketId) {
          unlocked = false;
        }
      })
      expect(unlocked).toEqual(true);
    }

    {
      const to = principalToAccountIdentifier(solarFlaresCanisterId, ticket3.payeeSubAccount);
      console.log('to', to)
      const transferredBlock3 = await identities.user3.ledgerActor.transfer({
        to: to,
        amount: { e8s: ticket3.count * lottery.price },
        fee: { e8s: TRANSFER_FEE },
        memo: 1n,
        from_subaccount: [],
        created_at_time: [],
      });
      console.log('transferredBlock3', transferredBlock3)
      expect(transferredBlock3.Ok).toBeGreaterThan(0n);

      const unlockResult3 = await identities.user3.solarFlaresActor.unlock(lotteryId, ticket3.ticketId);
      console.log('unlockResult3', unlockResult3);

      var unlocked = false;
      unlockResult3.ok.tickets.forEach(ticket => {
        if (ticket.ticketId == ticket2.ticketId) {
          unlocked = true;
        }
      })
      expect(unlocked).toEqual(true);

      unlocked = true;
      unlockResult3.ok.lockedTickets.forEach(ticket => {
        if (ticket.ticket.ticketId == ticket2.ticketId) {
          unlocked = false;
        }
      })
      expect(unlocked).toEqual(true);
    }

    const lotteryResult = await identities.swapp.solarFlaresActor.getPool(lotteryId);
    console.log('lotteryResult', lotteryResult)
    {
      const lottery = lotteryResult[0];
      expect(JSON.stringify(lottery.status).indexOf('InsufficientParticipants') > -1).toEqual(true);
    }

    const owner = await identities.swapp.erc721Actor.bearer(id1);
    console.log('owner', owner)
    const ownerExpected = toHexString(principalToAccountIdentifier(identities.user1.identity.getPrincipal().toString(), null));
    console.log('ownerExpected', ownerExpected)
    expect(owner.ok).toEqual(ownerExpected);

    const refund2 = await identities.user2.solarFlaresActor.refundICP(lotteryId, ticket2.ticketId);
    console.log('refund2', refund2);
    expect(refund2[0].ok).toEqual(expect.anything());

    const refund3 = await identities.user3.solarFlaresActor.refundICP(lotteryId, ticket3.ticketId);
    console.log('refund3', refund3);
    expect(refund3[0].ok).toEqual(expect.anything());

    // make a payment to the locked ticket
    {
      const to = principalToAccountIdentifier(solarFlaresCanisterId, ticket4.payeeSubAccount);
      console.log('to', to)
      const transferredBlock4 = await identities.user3.ledgerActor.transfer({
        to: to,
        amount: { e8s: ticket4.count * lottery.price },
        fee: { e8s: TRANSFER_FEE },
        memo: 1n,
        from_subaccount: [],
        created_at_time: [],
      });
      expect(transferredBlock4.Ok).toBeGreaterThan(0n);

      // an locked ticket also can be refunded
      const refund = await identities.user3.solarFlaresActor.refundICP(lotteryId, ticket4.ticketId);
      console.log('refund', refund);
      expect(refund[0].ok).toEqual(expect.anything());

    }

  });

});

xdescribe("preparation test", () => {

  beforeAll(async () => {
  });

  afterEach(async () => {
  });

  afterAll(async () => {
  });

  it("get refund", async () => {

    const tokenIndex1 = await identities.swapp.erc721Actor.mintNFT({
      'to': { 'principal': identities.user1.identity.getPrincipal() },
      'metadata': []
    });

    console.log('tokenIndex1', tokenIndex1)
    const id1 = tokenIdentifier(erc721CanisterId, tokenIndex1);
    console.log('id1', id1)

    let supply = 30n
    let price = E8S * 2n / 100n;
    let activeUntil = (new Date().getTime() + FIFTEEN_SECS) * MILLI2NANO
    let standard = 'EXT'

    const prepareResult = await identities.user1.solarFlaresActor.prepare(supply, price, activeUntil, erc721CanisterId, tokenIndex1, standard)
    console.log('prepareResult', prepareResult)
    const lotteryId = prepareResult.ok;
    expect(lotteryId.length).toEqual(56);

    const transferred = await identities.user1.erc721Actor.transfer({
      'from': { 'principal': identities.user1.identity.getPrincipal() },
      'to': { 'principal': solarFlaresCanisterPrincipal },
      'token': id1,
      'amount': 1n,
      'memo': [1],
      'notify': false,
      'subaccount': [],
    });
    expect(transferred.ok).toEqual(1n);
    console.log('transferred', transferred)

    const preparationResult = await identities.user1.solarFlaresActor.getPreparation()
    console.log('preparationResult', preparationResult)
    expect(preparationResult[0].id).toEqual(lotteryId);

    {
      const owner = await identities.swapp.erc721Actor.bearer(id1);
      console.log('owner', owner)
      const ownerExpected = toHexString(principalToAccountIdentifier(solarFlaresCanisterPrincipal.toString(), null));
      console.log('ownerExpected', ownerExpected)
      expect(owner.ok).toEqual(ownerExpected);
    }

    const cancelled = await identities.user1.solarFlaresActor.cancelPreparation()
    console.log('cancelled', cancelled)
    expect(cancelled).toEqual(true);

    {
      const owner = await identities.swapp.erc721Actor.bearer(id1);
      console.log('owner', owner)
      const ownerExpected = toHexString(principalToAccountIdentifier(identities.user1.identity.getPrincipal().toString(), null));
      console.log('ownerExpected', ownerExpected)
      expect(owner.ok).toEqual(ownerExpected);
    }

    {
      const preparationResult = await identities.user1.solarFlaresActor.getPreparation()
      console.log('preparationResult', preparationResult)
      expect(preparationResult[0]).toEqual(undefined);
    }

  });

});

xdescribe("refund ICP", () => {

  beforeAll(async () => {
  });

  afterEach(async () => {
  });

  afterAll(async () => {
  });

  it("refund", async () => {

    const tokenIndex1 = await identities.swapp.erc721Actor.mintNFT({
      'to': { 'principal': identities.user1.identity.getPrincipal() },
      'metadata': []
    });

    console.log('tokenIndex1', tokenIndex1)
    const id1 = tokenIdentifier(erc721CanisterId, tokenIndex1);
    console.log('id1', id1)

    let supply = 30n
    let price = E8S * 2n / 100n;
    let activeUntil = (new Date().getTime() + FIFTEEN_SECS) * MILLI2NANO
    let standard = 'EXT'

    const prepareResult = await identities.user1.solarFlaresActor.prepare(supply, price, activeUntil, erc721CanisterId, tokenIndex1, standard)
    console.log('prepareResult', prepareResult)
    const lotteryId = prepareResult.ok;
    expect(lotteryId.length).toEqual(56);

    const transferred = await identities.user1.erc721Actor.transfer({
      'from': { 'principal': identities.user1.identity.getPrincipal() },
      'to': { 'principal': solarFlaresCanisterPrincipal },
      'token': id1,
      'amount': 1n,
      'memo': [1],
      'notify': false,
      'subaccount': [],
    });
    expect(transferred.ok).toEqual(1n);
    console.log('transferred', transferred)

    const createResult = await identities.user1.solarFlaresActor.create()
    console.log('createResult', createResult)
    expect(createResult.ok).toEqual(lotteryId);

    const totalLotteryCount = await identities.user1.solarFlaresActor.getTotalCount()
    console.log('totalLotteryCount', totalLotteryCount.toString())
    const count = parseInt(totalLotteryCount.toString());
    console.log('count', count)

    const lotteries = await identities.user1.solarFlaresActor.getPools(count - 1, count)
    console.log('lotteries', lotteries)
    expect(lotteries.length).toEqual(1);

    const lottery = lotteries[0];
    expect(lottery.id).toEqual(lotteryId);
    expect(lottery.activeUntil).toEqual(BigInt(activeUntil));
    expect(lottery.status).toEqual({ Active: null });
    expect(lottery.tickets.length).toEqual(0);
    expect(lottery.lockedTickets.length).toEqual(0);
    expect(lottery.supply.toString()).toEqual(supply.toString());
    expect(lottery.price.toString()).toEqual(price.toString());
    expect(lottery.token.index.toString()).toEqual(tokenIndex1.toString());
    expect(lottery.token.standard).toEqual('EXT');
    expect(lottery.owner).toEqual(identities.user1.identity.getPrincipal());

    // try to create
    const lockResult1 = await identities.user1.solarFlaresActor.lock(lotteryId, 1)
    console.log(lockResult1)
    expect(lockResult1.err).toEqual({ "CalledByOwner": null });

    let user2Supply = 2n;
    let user3Supply = 3n;
    let user3Supply2 = 4n;

    const lockResult2 = await identities.user2.solarFlaresActor.lock(lotteryId, user2Supply)
    console.log('lockResult2', lockResult2)
    const ticket2 = lockResult2.ok.ticket;
    expect(ticket2.count.toString()).toEqual(user2Supply.toString());
    expect(ticket2.participant).toEqual(identities.user2.identity.getPrincipal());

    const lockResult3 = await identities.user3.solarFlaresActor.lock(lotteryId, user3Supply)
    console.log('lockResult3', lockResult3)
    const ticket3 = lockResult3.ok.ticket;
    expect(ticket3.count.toString()).toEqual(user3Supply.toString());
    expect(ticket3.participant).toEqual(identities.user3.identity.getPrincipal());

    const lockResult4 = await identities.user3.solarFlaresActor.lock(lotteryId, user3Supply2)
    console.log('lockResult4', lockResult4)
    const ticket4 = lockResult4.ok.ticket;
    // Cannot create a new ticket until the previous one is unlocked
    expect(ticket4.ticketId).toEqual(ticket3.ticketId);
    expect(ticket4.count.toString()).toEqual(user3Supply.toString());
    expect(ticket4.participant).toEqual(identities.user3.identity.getPrincipal());

    console.log('ticket2', ticket2)
    {
      const unlockResult = await identities.user2.solarFlaresActor.unlock(lotteryId, "invalid id");
      console.log('unlockResult', unlockResult);
      expect(unlockResult.err).toEqual({ "NotLocked": null });
    }
    {
      const unlockResult = await identities.user2.solarFlaresActor.unlock(lotteryId, ticket2.ticketId);
      console.log('unlockResult', unlockResult);
      expect(unlockResult.err).toEqual({ "Unpaied": null });
    }

    // make payments

    {
      // successful
      const to = principalToAccountIdentifier(solarFlaresCanisterId, ticket2.payeeSubAccount);
      console.log('to', to)
      const transferredBlock2 = await identities.user2.ledgerActor.transfer({
        to: to,
        amount: { e8s: ticket2.count * lottery.price },
        fee: { e8s: TRANSFER_FEE },
        memo: 1n,
        from_subaccount: [],
        created_at_time: [],
      });
      expect(transferredBlock2.Ok).toBeGreaterThan(0n);

      const unlockResult2 = await identities.user2.solarFlaresActor.unlock(lotteryId, ticket2.ticketId);
      console.log('unlockResult2', unlockResult2);

      var unlocked = false;
      unlockResult2.ok.tickets.forEach(ticket => {
        if (ticket.ticketId == ticket2.ticketId) {
          unlocked = true;
        }
      })
      expect(unlocked).toEqual(true);

      unlocked = true;
      unlockResult2.ok.lockedTickets.forEach(ticket => {
        if (ticket.ticket.ticketId == ticket2.ticketId) {
          unlocked = false;
        }
      })
      expect(unlocked).toEqual(true);
    }

    {
      // failed to unlock
      const to = principalToAccountIdentifier(solarFlaresCanisterId, ticket3.payeeSubAccount);
      console.log('to', to)
      const transferredBlock3 = await identities.user3.ledgerActor.transfer({
        to: to,
        amount: { e8s: ticket3.count * lottery.price },
        fee: { e8s: TRANSFER_FEE },
        memo: 1n,
        from_subaccount: [],
        created_at_time: [],
      });
      console.log('transferredBlock3', transferredBlock3)
      expect(transferredBlock3.Ok).toBeGreaterThan(0n);

      const unlockResult3 = await identities.user3.solarFlaresActor.unlock(lotteryId, ticket3.ticketId);
      console.log('unlockResult3', unlockResult3);

      var unlocked = false;
      unlockResult3.ok.tickets.forEach(ticket => {
        if (ticket.ticketId == ticket2.ticketId) {
          unlocked = true;
        }
      })
      expect(unlocked).toEqual(true);
    }

    {
      // no transfer for ticket 4
    }

    await delay(10);

    // setlement
    const lotteryResult = await identities.swapp.solarFlaresActor.getPool(lotteryId);
    console.log('lotteryResult', lotteryResult)

    const refund2 = await identities.user2.solarFlaresActor.refundICP(lotteryId, ticket2.ticketId);
    console.log('refund2', refund2)

  });

});


// xdescribe("function test", () => {

//   beforeAll(async () => {
//   });

//   afterEach(async () => {
//   });

//   afterAll(async () => {
//   });

//   it("getPools", async () => {
//     await expect(identities.user1.solarFlaresActor.getPools(0, 51)).rejects.toThrow();
//     await expect(identities.user1.solarFlaresActor.getPools(10, 2)).rejects.toThrow();
//     const lotteries = await identities.user1.solarFlaresActor.getPools(0, 2)
//     expect(lotteries).toEqual(expect.anything());
//   });

// });
