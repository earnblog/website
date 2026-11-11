---
title: 'CoreWeave''s Revenue Grew 168% and Its Backlog Hit $132.5 Billion, So Everyone Says "AI Compute Is Sold Out Through 2027." But Last Quarter It Paid Four Times Its Operating Profit in Interest: Renting Compute Is Not a Tech Business, It''s a Spread Business!'
date: 2026-11-11
category: ai-compute
description: 'After the close on Tuesday, November 10 (US Eastern), CoreWeave reported revenue up 168% year over year, raised full-year guidance and a $132.5 billion backlog, and "compute is sold out through 2027" became the easy takeaway. Yet in the same report, net interest expense was four times operating income, and that same morning a hot CPI print had pushed the two-year Treasury yield up 0.17 percentage points. This piece argues that renting compute is not a tech business but a spread business: the contract locks the price you sell at, while the price of the money you buy keeps floating.'
cover: /covers/2026-11-11-compute-is-a-spread.svg
coverCaption: 'Cover: on a dark ink background, a row of gold server racks sits at one end of a seesaw, weighed against a signal-red weight labeled "rates"; the fulcrum is a blue contract. Bottom line in gold: "Sell compute, earn the spread."'
price: 9
---

Tuesday, November 10, after the US close. CoreWeave, the company that rents out AI compute for a living, reported its third quarter: revenue up 168% from a year earlier, full-year revenue guidance raised, and $132.5 billion of signed-but-not-yet-delivered contracts sitting in the backlog. Analysts said its capacity is "effectively sold out through much of 2027," and the stock jumped after hours. The takeaway that night fit in one line: **AI demand isn't the problem. Compute is scarce.**

That line isn't wrong. But scroll a few rows down the same income statement, and one number dwarfs operating profit. It isn't depreciation, and it isn't power. It's interest. And that very morning, October CPI ran hot, core prices refused to cool for a third straight month, and the bond market pulled a December rate hike a step closer on the spot. On one side, orders locked in by contract. On the other, a rate that reprices every day. **So which side is this company's real business on?**

Let me put the conclusion up front; every section below explains it: **renting compute is not a tech business. It's a spread business.**

## 1. The backlog is demand, and it's also collateral

Start with the plainest arithmetic. This quarter CoreWeave earned $207 million of operating income. In the same quarter it paid $846 million in net interest. **For every dollar of operating profit, it first hands four dollars to the people who lent it money.** And the company guided next quarter's interest bill to roughly $1.1 billion, still climbing.

Why is interest so much bigger than profit? Because the model is, at bottom, a chain: customers sign multi-year compute contracts → the company takes those contracts to banks and bond investors and borrows against them → the borrowed money buys GPUs and builds data halls → the halls switch on and customers pay rent → the rent pays interest first, and only what's left is profit.

In that chain, the $132.5 billion backlog plays two roles. To the stock market, it's proof of demand. To creditors, it's collateral. **The backlog doesn't just say "someone wants compute." It says "someone will stand behind this loan."** That's why borrowings on the balance sheet more than doubled in the first nine months of this year.

That explains why the interest bill is large. It doesn't explain the other thing: if revenue grew by more than one and a half times, why is profit still being eaten by interest?

## 2. The selling price is locked; the buying price is not

The answer hides in a maturity mismatch between two kinds of contracts.

On the side where compute is sold, price is fixed: customers sign for three years, five years, so much per GPU-hour, in black and white. On the side where money is bought, price floats: every new dollar borrowed is priced at that day's rate, and every old bond that matures is rolled at that day's rate.

So CoreWeave's profit isn't "compute price minus cost." It's a locked-in rental yield minus a floating cost of funds. **It doesn't earn money on compute. It earns money on the gap between two prices.** That gap is the spread.

The rate market squeezed that gap on the very same day. The two-year Treasury yield, per the US Treasury, jumped 0.17 percentage points on Tuesday to close at 4.73%. That's far from CoreWeave's own borrowing cost, which sits well above Treasuries. But every borrowing rate stands on the Treasury foundation. **Raise the foundation an inch, and the financing cost of the whole building rises an inch.**

None of this is new. Aircraft lessors, railroads, the telecoms that laid fiber twenty-odd years ago: all signed contracts first, borrowed second, built assets third, and lived off the spread. The mechanism is everywhere; what's different about CoreWeave is one parameter: **its assets age the fastest.** A plane flies for twenty-five years, fiber sits in the ground for thirty, and a GPU's economic life is a few years. How fast the asset depreciates decides how much time the spread has to earn back the principal.

If the only problem were a slightly narrower spread, it wouldn't matter much. The real trouble is that this chain spins on its own.

## 3. A flywheel uphill, a noose downhill

Put this chain inside reflexivity, and it becomes a flywheel.

**When rates fall and the stock rises:** ① funding gets cheaper, so the same contract supports more borrowing; ② more borrowing builds more data halls, and revenue grows faster; ③ faster growth lifts the stock, and a pricier stock lets the company issue converts and new shares for cheaper money. **Growth itself lowers the cost of funding, and cheaper funding manufactures more growth.** Left foot on right foot, climbing higher with every step.

**Flip it, when rates rise and the stock falls:** ①′ new money gets more expensive, and the same contract supports less borrowing; ②′ but the data halls already promised to customers must still be built, so capex can't stop; ③′ a falling stock makes new equity more dilutive and converts harder to sell, so the gap gets plugged with pricier debt. **Now growth no longer lowers the cost of funding; it amplifies it.** The flywheel still spins, just backwards. The same wheel is an engine uphill and a noose downhill.

<figure class="bls-diagram"><img src="/diagrams/2026-11-11-spread-flywheel.svg" alt="Diagram: on the left, a blue loop where falling rates mean more borrowing, more data halls, faster revenue, a rising stock and cheaper money; on the right, a red loop where rising rates mean pricier new money, capex that can't stop, a falling stock, more dilutive issuance and more expensive money"/><figcaption>Diagram: the same financing chain is a self-reinforcing flywheel when rates fall and a self-tightening noose when rates rise. (Labels in Chinese.)</figcaption></figure>

Notice that the company recently launched an at-the-market program that lets it sell new shares into the market at any time, alongside a fresh convertible bond. Neither move is right or wrong in itself. They simply show that **the flywheel has to be fed continuously, and the price of what it's fed is set by rates and the share price, not by demand for compute.**

## 4. What to watch, and when this framework breaks

So when you read a company like this, "how fast is revenue growing" and "how big is the backlog" are only half the story. The other half is a race between two numbers: the growth rate of operating profit each quarter versus the growth rate of interest expense. When the first wins, the spread is widening and the flywheel turns up. When the second wins, the spread is narrowing, and however well the compute sells, the company is working for its creditors.

This framework has edges. If GPU rental prices themselves rise, with demand so tight that customers pay more on new contracts, then the locked side widens too, and the spread can absorb higher rates. Conversely, if a new chip generation makes rents on older GPUs fall faster than expected, then the spread's problem isn't rates at all; it's that the collateral itself is losing value. Either case matters more than rates alone.

## 5. The demand is real; the ledger is a different book

In the end, the demand for compute is real, and the orders are real. But between demand and profit sits an entire chain of borrowed money. The market sees rows of servers lighting up in data halls. It doesn't see that behind every server stands a creditor charging interest by the day.

In a complex system, the noisiest layer is rarely the decisive one. AI is the story of this era; interest rates are its foundation. However fast the story is written, it is written on that foundation, and when the foundation rises an inch, every page of the story has to be recalculated.

**Renting compute is not a tech business. It's a spread business.** Grasp that, and you understand why, on the same night, a company that beat on revenue can rally and then give it back: the market is reading two ledgers, one called demand and one called interest.

<p class="kicker">What you sell is compute; what you earn is the spread. Demand is written in the contract, destiny in the interest rate.</p>
