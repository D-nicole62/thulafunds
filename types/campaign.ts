export interface Profile {
  id: string
  full_name: string
  avatar_url?: string
  bio?: string
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  title: string
  description: string
  goal_amount: number
  current_amount: number
  on_chain_balance?: number
  image_url?: string
  category: string
  status: 'active' | 'completed' | 'cancelled'
  creator_id: string
  end_date?: string
  deadline?: string
  created_at: string
  updated_at: string
  wallet_address?: string
  contract_address?: string
  milestone_contract_address?: string
  profiles?: Profile
  donations?: Donation[]
  contributions?: Donation[]
  campaign_updates?: CampaignUpdate[]
}

export interface Donation {
  id: string
  campaign_id: string
  contributor_id?: string
  amount: number
  message?: string
  anonymous: boolean
  tx_hash: string
  created_at: string
  profiles?: Profile
}

/** @deprecated Use Donation */
export type Contribution = Donation

export interface CampaignUpdate {
  id: string
  campaign_id: string
  title: string
  content: string
  created_at: string
}

export interface CampaignDetailViewProps {
  campaign: Campaign
  contributions: Contribution[]
  updates: CampaignUpdate[]
  currentUser: Profile | null
}

export interface CampaignHeaderProps {
  campaign: {
    title: string
    description: string
    image_url?: string
    category: string
    created_at: string
    profiles?: Profile
  }
}

export interface CampaignProgressProps {
  campaign: {
    id: string
    current_amount: number
    goal_amount: number
    contract_address?: string
    deadline?: string
    donations?: Donation[]
    contributions?: Donation[]
    created_at: string
  }
  onContributeAction: () => void
}

export interface CampaignCreatorProps {
  creator: Profile
}

export interface CampaignPaymentInfoProps {
  walletAddress?: string
}

export interface CampaignUpdatesProps {
  updates: CampaignUpdate[]
}

export interface RecentContributionsProps {
  contributions: Contribution[]
}

export interface ContributionFormProps {
  campaign: {
    id: string
    title: string
    goal_amount: number
    current_amount: number
    contract_address?: string
    wallet_address?: string
  }
  currentUser: Profile | null
  onCloseAction: () => void
} 