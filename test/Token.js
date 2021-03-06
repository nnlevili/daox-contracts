"use strict";
const Token = artifacts.require("./Token/Token.sol");
const helper = require("./helpers/helper");
let token = null;

contract("Token", accounts => {
    const [owner, user1, user2, user3] = [accounts[0], accounts[1], accounts[2], accounts[3]];
    const [tokensAmount1, tokensAmount2, tokensAmount3] = [100, 500, 10000];

    beforeEach(async () => token = await Token.new("TEST TOKEN", "TTK"));

    it("Should be mintable by owner", async () => {
        await token.mint.sendTransaction(user1, tokensAmount1, {from : owner});
        const user1Balance = await token.balanceOf.call(user1);

        assert.equal(tokensAmount1, user1Balance, "Not correct user1 balance");
    });

    it("Should be not mintable by unknown account", () => helper.handleErrorTransaction(() => token.mint.sendTransaction(user1, tokensAmount1, {from : user2})));

    it("Should be burnable by owner", async () => {
        await token.mint.sendTransaction(user1, tokensAmount2, {from: owner});
        assert.equal(tokensAmount2, await token.balanceOf.call(user1), "User1 didn't receive tokens");
        assert.equal(tokensAmount2, await token.totalSupply.call(), "Total supply was not changed after minting");

        await token.burn.sendTransaction(user1, {from : owner});
        assert.equal(0, await token.balanceOf.call(user1), "Tokens was not burned");
        assert.equal(0, await token.totalSupply.call(), "Total supply was not changed after token burning");
    });

    it("Should be not burnable by unknown account", async () => {
        await token.mint.sendTransaction(user1, tokensAmount2, {from: owner});
        assert.equal(tokensAmount2, await token.balanceOf.call(user1), "User1 didn't receive tokens");
        assert.equal(tokensAmount2, await token.totalSupply.call(), "Total supply was not changed after minting");

        return helper.handleErrorTransaction(() => token.burn.sendTransaction(user1, {from : user1}));
    });

    it("Should be holdable by owner", async () => {
        await token.mint.sendTransaction(user1, tokensAmount2, {from: owner});
        const holdTime = 60 * 1000;

        assert.equal(tokensAmount2, await token.balanceOf.call(user1), "User1 didn't receive tokens");
        assert.equal(tokensAmount2, await token.totalSupply.call(), "Total supply was not changed after minting");
        assert.equal(0, (await token.held.call(user1)).toNumber(), "Hold time is not zero");

        await token.hold.sendTransaction(user1, holdTime, {from: owner});
        const block = await helper.getLatestBlock(web3);

        assert.equal(block.timestamp + holdTime, (await token.held.call(user1)).toNumber(), "Hold time was not calculated correct");
    });

    it("Should be not holdable by unknown account", async () => {
        await token.mint.sendTransaction(user1, tokensAmount2, {from: owner});
        const holdTime = 60 * 1000;

        assert.equal(tokensAmount2, await token.balanceOf.call(user1), "User1 didn't receive tokens");
        assert.equal(tokensAmount2, await token.totalSupply.call(), "Total supply was not changed after minting");
        assert.equal(0, (await token.held.call(user1)).toNumber(), "Hold time is not zero");

        const block = await helper.getLatestBlock(web3);

        return helper.handleErrorTransaction(() => token.hold.sendTransaction(user1, holdTime, {from: user1}));
    });

    it("Should not transfer tokens when holded", async () => {
        await token.mint.sendTransaction(user1, tokensAmount2, {from: owner});
        const holdTime = 60 * 1000;

        assert.equal(tokensAmount2, await token.balanceOf.call(user1), "User1 didn't receive tokens");
        assert.equal(tokensAmount2, await token.totalSupply.call(), "Total supply was not changed after minting");
        assert.equal(0, (await token.held.call(user1)).toNumber(), "Hold time is not zero");

        await token.hold.sendTransaction(user1, holdTime, {from: owner});

        await helper.handleErrorTransaction(() => token.transfer.sendTransaction(user2, tokensAmount2, {from: user1}));

        await helper.rpcCall(web3, "evm_increaseTime", [holdTime]);
        await helper.rpcCall(web3, "evm_mine", null);
        const block = await helper.getLatestBlock(web3);

        await token.transfer.sendTransaction(user2, tokensAmount2, {from: user1});

        assert.equal(0, (await token.balanceOf.call(user1)).toNumber(), "Tokens was not transfered");
        assert.equal(tokensAmount2, (await token.balanceOf.call(user2)).toNumber(), "Tokens was not transfered");
        assert.isTrue(block.timestamp >= (await token.held.call(user1)).toNumber(), "Held time is not correct");
    });

    it("Should transfer tokens when not holded", async () => {
        await token.mint.sendTransaction(user1, tokensAmount3, {from: owner});

        assert.equal(tokensAmount3, await token.balanceOf.call(user1), "User1 didn't receive tokens");
        assert.equal(tokensAmount3, await token.totalSupply.call(), "Total supply was not changed after minting");

        await token.transfer.sendTransaction(user2, tokensAmount2, {from: user1});

        assert.equal(tokensAmount3 - tokensAmount2, (await token.balanceOf.call(user1)).toNumber(), "Tokens was not transfered");
        assert.equal(tokensAmount2, (await token.balanceOf.call(user2)).toNumber(), "Tokens was not transfered");
    });

    it("Should not allow by unknown account", async () => {
        await token.mint.sendTransaction(user1, tokensAmount2, {from: owner});
        assert.equal(tokensAmount2, await token.balanceOf.call(user1), "User1 didn't receive tokens");
        assert.equal(tokensAmount2, await token.totalSupply.call(), "Total supply was not changed after minting");

        return helper.handleErrorTransaction(() => token.allowAndTransfer.sendTransaction(user1, {from : user1}));
    });
    
});