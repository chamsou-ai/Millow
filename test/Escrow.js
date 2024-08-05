const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  let realEstate, buyer, seller, inspector, lender, escrow;

  beforeEach(async () => {
    [buyer, seller, inspector, lender] = await ethers.getSigners();

    const RealEstate = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstate.deploy();
    console.log(realEstate.address);
    let transaction = await realEstate
      .connect(seller)
      .mint(
        "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"
      );
    await transaction.wait();
    const Escrow = await ethers.getContractFactory("Escrow");

    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      lender.address,
      inspector.address
    );
    // Approve NFT
    transaction = await realEstate.connect(seller).approve(escrow.address, 1);
    await transaction.wait();
    // List NFT
    transaction = await escrow
      .connect(seller)
      .list(1, buyer.address, tokens(10), tokens(5));
    await transaction.wait();
  });
  describe("Deployments", () => {
    it("Returns NFT Address", async () => {
      const result = await escrow.nftAddress();
      await expect(result).to.be.equal(realEstate.address);
    });
    it("Returns seller", async () => {
      const result = await escrow.seller();
      await expect(result).to.be.equal(seller.address);
    });
    it("Returns inspector", async () => {
      const result = await escrow.inspector();
      await expect(result).to.be.equal(inspector.address);
    });
    it("Returns lender", async () => {
      const result = await escrow.lender();
      await expect(result).to.be.equal(lender.address);
    });
  });
  describe("Listing", () => {
    it("Updates as Listed", async () => {
      const result = await escrow.isListed(1);
      expect(result).to.be.equal(true);
    });
    it("Update Ownerships", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
    });

    it("Returns buyer", async () => {
      const result = await escrow.buyer(1);
      expect(result).to.be.equal(buyer.address);
    });
    it("Returns purchase price", async () => {
      const result = await escrow.purchasePrice(1);
      expect(result).to.be.equal(tokens(10));
    });
    it("Returns escrowAmount", async () => {
      const result = await escrow.escrowAmount(1);
      expect(result).to.be.equal(tokens(5));
    });
  });
  describe("Deposits", () => {
    it("Updates contract balance", async () => {
      const transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transaction.wait();
      const result = await escrow.getBalance();
      expect(result).to.be.equal(tokens(5));
    });
  });

  describe("Inspection", () => {
    it("Updates Inspection status", async () => {
      const transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transaction.wait();
      const result = await escrow.inspectionPaseed(1);
      expect(result).to.be.equal(true);
    });
  });

  describe("Approve", () => {
    it("Updates approval", async () => {
      let transaction = await escrow.connect(buyer).approveSale(1);
      await transaction.wait();
      transaction = await escrow.connect(seller).approveSale(1);
      await transaction.wait();
      transaction = await escrow.connect(lender).approveSale(1);
      await transaction.wait();

      expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
      expect(await escrow.approval(1, seller.address)).to.be.equal(true);
      expect(await escrow.approval(1, lender.address)).to.be.equal(true);
    });
  });

  describe("Sale", () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transaction.wait();
      transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transaction.wait();
      transaction = await escrow.connect(buyer).approveSale(1);
      await transaction.wait();
      transaction = await escrow.connect(seller).approveSale(1);
      await transaction.wait();
      transaction = await escrow.connect(lender).approveSale(1);
      await transaction.wait();

      await lender.sendTransaction({ to: escrow.address, value: tokens(5) });


      transaction = await escrow.connect(seller).finalizeSale(1);
      await transaction.wait();
    });
    it("Updates balance", async () => {
      expect(await escrow.getBalance()).to.be.equal(0);
    });
    it("Updates the ownership" , async()=>{
      expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address)
    })
  });
});
