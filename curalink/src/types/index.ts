export type UserRole = 'patient' | 'researcher' | 'admin'

export type TrialStatus =
  | 'recruiting'
  | 'active'
  | 'completed'
  | 'suspended'
  | 'terminated'
  | 'withdrawn'

export interface User {
  id: string
  role: UserRole
  name: string
  email: string
  location_city?: string
  location_country?: string
  disease_of_interest?: string
  additional_conditions?: string[]
  specialties?: string[]
  interests?: string[]
  orcid?: string
  open_for_collaboration?: boolean
  institution?: string
  created_at: string
  updated_at: string
}

export interface Expert {
  id: string
  name: string
  affiliation?: string
  profile_url?: string
  specialties?: string[]
  interests?: string[]
  location?: string
  email?: string
  publications?: any[]
  created_at: string
  updated_at: string
}

export interface Publication {
  id: string
  title: string
  authors?: string[]
  journal?: string
  year?: number
  doi?: string
  link?: string
  abstract?: string
  ai_summary?: string
  disease_keywords?: string[]
  created_at: string
  updated_at: string
}

export interface ClinicalTrial {
  id: string
  nct_id: string
  title: string
  status?: TrialStatus
  phase?: string
  condition?: string[]
  intervention?: string[]
  eligibility?: string
  location?: string
  sponsor?: string
  contact_email?: string
  link?: string
  ai_summary?: string
  created_at: string
  updated_at: string
}

export interface ForumThread {
  id: string
  title: string
  disease: string
  created_by: string
  creator?: User
  post_count?: number
  created_at: string
  updated_at: string
  last_activity: string
}

export interface ForumPost {
  id: string
  thread_id: string
  created_by: string
  creator?: User
  content: string
  created_at: string
  updated_at: string
}

export interface Favorite {
  id: string
  user_id: string
  item_type: 'expert' | 'publication' | 'clinical_trial'
  item_id: string
  created_at: string
}

export interface MeetingRequest {
  id: string
  patient_id: string
  researcher_id?: string
  expert_id?: string
  status: 'pending' | 'accepted' | 'declined' | 'admin_escalated'
  message?: string
  patient?: User
  researcher?: User
  expert?: Expert
  created_at: string
  updated_at: string
}

export interface Collaboration {
  id: string
  requester_id: string
  collaborator_id: string
  status: 'pending' | 'accepted' | 'declined'
  requester?: User
  collaborator?: User
  created_at: string
  updated_at: string
}

export interface SearchHistory {
  id: string
  user_id: string
  search_type: 'expert' | 'publication' | 'clinical_trial'
  query: string
  filters?: Record<string, any>
  created_at: string
}

// Form types
export interface PatientOnboardingForm {
  name: string
  email: string
  natural_input: string
  disease_of_interest: string
  additional_conditions?: string
  location_city?: string
  location_country?: string
}

export interface ResearcherOnboardingForm {
  name: string
  email: string
  institution: string
  specialties: string[]
  interests: string[]
  orcid?: string
  open_for_collaboration: boolean
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}
