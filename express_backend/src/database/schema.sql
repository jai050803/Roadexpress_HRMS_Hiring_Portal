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
    location VARCHAR(100) NOT NULL,
    job_type VARCHAR(50) NOT NULL DEFAULT 'Full-time',
    experience_level VARCHAR(50) NOT NULL DEFAULT 'Mid-Level',
    min_salary NUMERIC(12, 2),
    max_salary NUMERIC(12, 2),
    description TEXT NOT NULL,
    requirements TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_by_id UUID REFERENCES hiring_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hiring_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
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
    file_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    parsed_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hiring_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES hiring_jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES hiring_candidates(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES hiring_resumes(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'APPLIED',
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
    overall_score NUMERIC(5, 2) NOT NULL,
    summary TEXT,
    strengths TEXT[],
    weaknesses TEXT[],
    missing_skills TEXT[],
    recommendations TEXT,
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hiring_interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES hiring_applications(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL DEFAULT 1,
    round_name VARCHAR(100) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 45,
    interviewer_id UUID REFERENCES hiring_users(id) ON DELETE SET NULL,
    interviewer_name VARCHAR(255),
    interviewer_email VARCHAR(255),
    meeting_link VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hiring_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES hiring_interviews(id) ON DELETE CASCADE,
    interviewer_id UUID REFERENCES hiring_users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    technical_skills INTEGER CHECK (technical_skills >= 1 AND technical_skills <= 5),
    communication_skills INTEGER CHECK (communication_skills >= 1 AND communication_skills <= 5),
    problem_solving INTEGER CHECK (problem_solving >= 1 AND problem_solving <= 5),
    recommendation VARCHAR(50) NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hiring_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES hiring_applications(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_id UUID REFERENCES hiring_users(id) ON DELETE SET NULL,
    reason TEXT,
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
