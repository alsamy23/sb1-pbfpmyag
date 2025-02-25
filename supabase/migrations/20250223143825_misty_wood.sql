/*
  # School Discipline Tracker Schema

  1. New Tables
    - `students`
      - `id` (uuid, primary key)
      - `student_id` (text, unique)
      - `name` (text)
      - `class` (text)
      - `section` (text)
      - `created_at` (timestamp)
    
    - `grievances`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key)
      - `type` (text)
      - `description` (text)
      - `date` (date)
      - `created_at` (timestamp)
      - `created_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text UNIQUE NOT NULL,
    name text NOT NULL,
    class text NOT NULL,
    section text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Create grievances table
CREATE TABLE IF NOT EXISTS grievances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES students(id) NOT NULL,
    type text NOT NULL,
    description text,
    date date DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read students"
    ON students
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to read grievances"
    ON grievances
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert grievances"
    ON grievances
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);