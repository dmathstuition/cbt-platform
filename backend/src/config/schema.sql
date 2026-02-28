-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SCHOOLS TABLE
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) CHECK (role IN ('super_admin','school_admin','teacher','student','parent')) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, school_id)
);

-- SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLASSES TABLE
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  subject_id UUID REFERENCES subjects(id),
  type VARCHAR(50) CHECK (type IN ('mcq','true_false','fill_blank','theory')) NOT NULL,
  body TEXT NOT NULL,
  options JSONB,
  marks DECIMAL(5,2) DEFAULT 1,
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy','medium','hard')) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXAMS TABLE
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  title VARCHAR(300) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('objective','theory','mixed')) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  pass_mark DECIMAL(5,2) DEFAULT 50,
  total_marks DECIMAL(8,2) DEFAULT 0,
  status VARCHAR(50) CHECK (status IN ('draft','scheduled','active','completed')) DEFAULT 'draft',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXAM SESSIONS TABLE (each student attempt)
CREATE TABLE IF NOT EXISTS exam_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id),
  status VARCHAR(50) CHECK (status IN ('in_progress','submitted','timed_out')) DEFAULT 'in_progress',
  score DECIMAL(8,2),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_remaining_sec INTEGER,
  activity_log JSONB DEFAULT '[]'
);

-- RESPONSES TABLE (each answer given)
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  answer JSONB,
  is_correct BOOLEAN,
  marks_awarded DECIMAL(5,2) DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);
 