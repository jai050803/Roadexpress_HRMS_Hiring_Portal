CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS hiring_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'recruiter',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hiring_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    employment_type VARCHAR(50) DEFAULT 'full_time',
    work_mode VARCHAR(50) DEFAULT 'onsite',
    education_qualification TEXT,
    min_experience_years INTEGER DEFAULT 0,
    required_skills TEXT[],
    responsibilities_text TEXT,
    salary_band VARCHAR(100),
    min_salary NUMERIC(12, 2),
    max_salary NUMERIC(12, 2),
    description TEXT,
    requirements TEXT,
    jd_text TEXT,
    application_deadline TIMESTAMP WITH TIME ZONE,
    max_applications INTEGER,
    applications_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    linkedin_post_copy TEXT,
    linkedin_posted BOOLEAN NOT NULL DEFAULT false,
    linkedin_posted_at TIMESTAMP WITH TIME ZONE,
    created_by_id UUID REFERENCES hiring_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hiring_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    location VARCHAR(100),
    current_title VARCHAR(150),
    total_experience_years NUMERIC(4, 1) DEFAULT 0,
    skills TEXT[],
    linkedin_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hiring_resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES hiring_candidates(id) ON DELETE CASCADE,
    application_id UUID,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(1000),
    original_filename VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER NOT NULL,
    file_size_bytes INTEGER,
    file_hash VARCHAR(64),
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    parse_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    parsed_text TEXT,
    parsed_json JSONB,
    parse_error TEXT,
    parsed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hiring_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES hiring_jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES hiring_candidates(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES hiring_resumes(id) ON DELETE SET NULL,
    reference_number VARCHAR(50) UNIQUE,
    source VARCHAR(50) NOT NULL DEFAULT 'portal',
    status VARCHAR(50) NOT NULL DEFAULT 'APPLIED',
    current_status VARCHAR(50) NOT NULL DEFAULT 'APPLIED',
    match_score NUMERIC(5, 2),
    recruiter_notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_job_candidate UNIQUE (job_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS hiring_screening_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES hiring_applications(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    overall_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    matched_skills TEXT[],
    missing_skills TEXT[],
    strengths TEXT[],
    weaknesses TEXT[],
    llm_rationale TEXT,
    summary TEXT,
    recommendations TEXT,
    hard_filter_passed BOOLEAN NOT NULL DEFAULT true,
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hiring_interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES hiring_applications(id) ON DELETE CASCADE,
    job_role_id UUID REFERENCES hiring_jobs(id) ON DELETE SET NULL,
    round_number INTEGER NOT NULL DEFAULT 1,
    round_name VARCHAR(100) NOT NULL DEFAULT 'Technical Round',
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 45,
    mode VARCHAR(20) NOT NULL DEFAULT 'video',
    location TEXT,
    meeting_link VARCHAR(500),
    interviewer_id UUID REFERENCES hiring_users(id) ON DELETE SET NULL,
    interviewer_name VARCHAR(255),
    interviewer_email VARCHAR(255),
    interviewer_ids UUID[],
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    cancellation_reason TEXT,
    hr_notes TEXT,
    created_by_id UUID REFERENCES hiring_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hiring_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES hiring_interviews(id) ON DELETE CASCADE,
    interviewer_id UUID REFERENCES hiring_users(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES hiring_users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    technical_skills INTEGER CHECK (technical_skills >= 1 AND technical_skills <= 5),
    technical_rating INTEGER CHECK (technical_rating >= 1 AND technical_rating <= 5),
    communication_skills INTEGER CHECK (communication_skills >= 1 AND communication_skills <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    problem_solving INTEGER CHECK (problem_solving >= 1 AND problem_solving <= 5),
    culture_rating INTEGER CHECK (culture_rating >= 1 AND culture_rating <= 5),
    recommendation VARCHAR(50),
    decision VARCHAR(50),
    comments TEXT,
    strengths TEXT,
    concerns TEXT,
    additional_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hiring_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES hiring_applications(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    from_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50),
    changed_by_id UUID REFERENCES hiring_users(id) ON DELETE SET NULL,
    changed_by_type VARCHAR(20) NOT NULL DEFAULT 'hr',
    reason TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hiring_jobs_status ON hiring_jobs(status);
CREATE INDEX IF NOT EXISTS idx_hiring_jobs_dept ON hiring_jobs(department);
CREATE INDEX IF NOT EXISTS idx_hiring_candidates_email ON hiring_candidates(email);
CREATE INDEX IF NOT EXISTS idx_hiring_apps_job_id ON hiring_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_hiring_apps_candidate_id ON hiring_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hiring_apps_status ON hiring_applications(status);
CREATE INDEX IF NOT EXISTS idx_hiring_interviews_app_id ON hiring_interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_hiring_status_history_app_id ON hiring_status_history(application_id);
