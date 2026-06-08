#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, IntoVal, Val, Vec};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    WasmHash,
    CampaignCount,
    Campaign(u32),
}

#[contract]
pub struct CampaignFactoryContract;

#[contractimpl]
impl CampaignFactoryContract {
    pub fn initialize(e: Env, admin: Address, wasm_hash: BytesN<32>) {
        if e.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::WasmHash, &wasm_hash);
        e.storage().instance().set(&DataKey::CampaignCount, &0_u32);
    }

    /// Deploy a new Crowdfund escrow contract per campaign.
    pub fn create_campaign(
        e: Env,
        organizer: Address,
        token: Address,
        goal: i128,
        deadline: u64,
        salt: BytesN<32>,
    ) -> Address {
        organizer.require_auth();

        let wasm_hash: BytesN<32> = e
            .storage()
            .instance()
            .get(&DataKey::WasmHash)
            .expect("wasm hash not set");

        let mut init_args: Vec<Val> = Vec::new(&e);
        init_args.push_back(organizer.clone().into_val(&e));
        init_args.push_back(token.into_val(&e));
        init_args.push_back(goal.into_val(&e));
        init_args.push_back(deadline.into_val(&e));

        let deployed = e
            .deployer()
            .with_current_contract(salt)
            .deploy_v2(wasm_hash, init_args);

        let count: u32 = e
            .storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0);
        e.storage()
            .instance()
            .set(&DataKey::CampaignCount, &(count + 1));
        e.storage()
            .instance()
            .set(&DataKey::Campaign(count), &deployed);

        e.events()
            .publish(("campaign_created", organizer), (deployed.clone(), goal, deadline));
        deployed
    }

    pub fn get_campaign(e: Env, index: u32) -> Address {
        e.storage()
            .instance()
            .get(&DataKey::Campaign(index))
            .expect("campaign not found")
    }

    pub fn campaign_count(e: Env) -> u32 {
        e.storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0)
    }
}
