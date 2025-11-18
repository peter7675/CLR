-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('patient', 'researcher', 'admin');

-- Create enum for trial status
CREATE TYPE trial_status AS ENUM ('recruiting', 'active', 'completed', 'suspended', 'terminated', 'withdrawn');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  location_city TEXT,
  location_country TEXT,
  disease_of_interest TEXT,
  additional_conditions TEXT[],
  specialties TEXT[],
  interests TEXT[],
  orcid TEXT,
  open_for_collaboration BOOLEAN DEFAULT false,
  institution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Experts table (auto-populated from searches)
CREATE TABLE experts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  affiliation TEXT,
  profile_url TEXT,
  specialties TEXT[],
  interests TEXT[],
  location TEXT,
  email TEXT,
  publications JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Publications table
CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  authors TEXT[],
  journal TEXT,
  year INTEGER,
  doi TEXT,
  link TEXT,
  abstract TEXT,
  ai_summary TEXT,
  disease_keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clinical trials table
CREATE TABLE clinical_trials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nct_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  status trial_status,
  phase TEXT,
  condition TEXT[],
  intervention TEXT[],
  eligibility TEXT,
  location TEXT,
  sponsor TEXT,
  contact_email TEXT,
  link TEXT,
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum threads table
CREATE TABLE forum_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  disease TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum posts table
CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites table
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'expert', 'publication', 'clinical_trial'
  item_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

-- Meeting requests table
CREATE TABLE meeting_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  researcher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expert_id UUID REFERENCES experts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'admin_escalated'
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaborations table (researcher to researcher)
CREATE TABLE collaborations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  collaborator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, collaborator_id)
);

-- Search history (for improving recommendations)
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  search_type TEXT NOT NULL, -- 'expert', 'publication', 'clinical_trial'
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_disease ON users(disease_of_interest);
CREATE INDEX idx_experts_specialties ON experts USING GIN(specialties);
CREATE INDEX idx_publications_keywords ON publications USING GIN(disease_keywords);
CREATE INDEX idx_clinical_trials_nct ON clinical_trials(nct_id);
CREATE INDEX idx_clinical_trials_status ON clinical_trials(status);
CREATE INDEX idx_clinical_trials_condition ON clinical_trials USING GIN(condition);
CREATE INDEX idx_forum_threads_disease ON forum_threads(disease);
CREATE INDEX idx_forum_posts_thread ON forum_posts(thread_id);
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_meeting_requests_patient ON meeting_requests(patient_id);
CREATE INDEX idx_meeting_requests_researcher ON meeting_requests(researcher_id);
CREATE INDEX idx_collaborations_users ON collaborations(requester_id, collaborator_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view researcher profiles" ON users
  FOR SELECT USING (role = 'researcher');

-- RLS Policies for experts table (public read)
CREATE POLICY "Anyone can view experts" ON experts
  FOR SELECT USING (true);

-- RLS Policies for publications table (public read)
CREATE POLICY "Anyone can view publications" ON publications
  FOR SELECT USING (true);

-- RLS Policies for clinical_trials table (public read)
CREATE POLICY "Anyone can view clinical trials" ON clinical_trials
  FOR SELECT USING (true);

-- RLS Policies for forum_threads table
CREATE POLICY "Anyone can view forum threads" ON forum_threads
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create threads" ON forum_threads
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- RLS Policies for forum_posts table
CREATE POLICY "Anyone can view forum posts" ON forum_posts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON forum_posts
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- RLS Policies for favorites table
CREATE POLICY "Users can view their own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for meeting_requests table
CREATE POLICY "Users can view their own meeting requests" ON meeting_requests
  FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = researcher_id);

CREATE POLICY "Patients can create meeting requests" ON meeting_requests
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Researchers can update meeting requests" ON meeting_requests
  FOR UPDATE USING (auth.uid() = researcher_id);

-- RLS Policies for collaborations table
CREATE POLICY "Users can view their own collaborations" ON collaborations
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = collaborator_id);

CREATE POLICY "Researchers can create collaboration requests" ON collaborations
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Collaborators can update collaboration status" ON collaborations
  FOR UPDATE USING (auth.uid() = collaborator_id);

-- RLS Policies for search_history table
CREATE POLICY "Users can view their own search history" ON search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create search history" ON search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experts_updated_at BEFORE UPDATE ON experts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publications_updated_at BEFORE UPDATE ON publications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_trials_updated_at BEFORE UPDATE ON clinical_trials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_threads_updated_at BEFORE UPDATE ON forum_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at BEFORE UPDATE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_requests_updated_at BEFORE UPDATE ON meeting_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaborations_updated_at BEFORE UPDATE ON collaborations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
