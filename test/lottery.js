const { expectRevert, time } = require('@openzeppelin/test-helpers');
const Lottery = artifacts.require('Lottery.sol');

const balances = async addresses => {
    const balanceResults = await Promise.all(addresses.map(address =>
        web3.eth.getBalance(address)
    ));
    return balanceResults.map(balance => web3.utils.toBN(balance));
};

contract('Lottery', (accounts) => {
    let lottery;
    beforeEach(async () => {
        lottery = await Lottery.new(2);
    });

    it('Should NOT create bet if not admin', async () => {
        expectRevert(
            lottery.createBet(2, 5, { from: accounts[2] }),
            'only admin'
        )
        //console.log('state:', await lottery.currentState());
    });

    it('Should NOT create bet if state not idle', async () => {
        await lottery.createBet(5, 5, { from: accounts[0] });
        expectRevert(
            lottery.createBet(5, 5, { from: accounts[0] }),
            'current state does not allow this'
        );
    });

    it('Should create a bet', async () => {
        await lottery.createBet(3, 5, { from: accounts[0] });
        const betCount = await lottery.betCount();
        const betSize = await lottery.betSize();
        const currentState = await lottery.currentState();
        assert(betCount.toNumber() === 3);
        assert(betSize.toNumber() === 5);
        assert(currentState.toNumber() === 1);
    });

    it('Should NOT bet if not in state BETTING', async () => {
        expectRevert(
            lottery.bet(),
            'current state does not allow this'
        );
    });

    it('Should NOT bet if not sending exact bet amount', async () => {
        await lottery.createBet(2, 50);
        expectRevert(
            lottery.bet({ value: 40 }),
            'can only bet exactly the bet size'
        );
        expectRevert(
            lottery.bet({ value: 60 }),
            'can only bet exactly the bet size'
        );
    });

    // To be further reviewed
    it('Should bet', async () => {
        const players = [accounts[1], accounts[2], accounts[3]];
        await lottery.createBet(3, web3.utils.toWei('1', 'ether'));

        const balancesBefore = await balances(players);
        const txs = await Promise.all(players.map(player => lottery.bet({
            value: web3.utils.toWei('1', 'ether'),
            from: player,
            gasPrice: 1
        })));
        const balancesAfter = await balances(players);
        const result = players.some((_player, i) => {
            const gasUsed = web3.utils.toBN(txs[i].receipt.gasUsed);
            const expected = web3.utils.toBN(web3.utils.toWei('1.94', 'ether'));
            return balancesAfter[i].sub(balancesBefore[i]).add(gasUsed).eq(expected);
        });
        assert(result === true);
    });

    it('Should NOT cancel if not betting', async () => {
        expectRevert(
            lottery.cancel(),
            'current state does not allow this'
        );
    });

      it('Should NOT cancel if not admin', async () => {
        await lottery.createBet(3, 100);
        expectRevert(
            lottery.cancel({from: accounts[2]}),
            'only admin'
        );
      });

      it('Should cancel', async () => {
        await lottery.createBet(3, 100);
        const stateBefore = await lottery.currentState();
        await lottery.cancel({from: accounts[0]});
        const stateAfter = await lottery.currentState();
        assert(stateBefore.toNumber() === 1);
        assert(stateAfter.toNumber() === 0);
      });
});
