import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Sms2 } from "../target/types/sms2";

describe("sms2", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Sms2 as Program<Sms2>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
