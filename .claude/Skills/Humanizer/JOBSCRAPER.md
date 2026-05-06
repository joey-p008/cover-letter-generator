# Skill: Job Posting Scraper

## Purpose
This skill enables Claude Code to systematically analyze job postings and extract structured recruiting and skills data from them. The goal is to convert unstructured job descriptions into clean, organized information that can be used for resume tailoring, interview prep, application tracking, or labor market analysis.

---

## When To Use
Use this skill whenever:
- A user pastes a job posting
- A webpage/file contains a job description
- The task involves extracting qualifications, requirements, technical skills, or compensation details
- The user wants structured job application data

Examples:
- "Analyze this job posting"
- "Extract the skills from this role"
- "Summarize the requirements"
- "Tailor my resume to this JD"
- "Create a tracker from these listings"

---

## Extraction Rules

### 1. Basic Job Information
Extract the following fields when available:

- Company
- Position Title
- Department / Team
- Location
- Employment Type
  - Full-time
  - Part-time
  - Contract
  - Internship
  - Temporary
- Remote / Hybrid / On-site
- Date Posted
- Salary / Compensation
- Visa Sponsorship Information
- Security Clearance Requirements
- Experience Level
- Years of Experience Required
- Job ID / Requisition Number

If information is missing, explicitly label it as:
`Not Specified`

---

## 2. Skills Extraction

Carefully analyze:
- Qualifications
- Requirements
- Preferred Qualifications
- Basic Qualifications
- What You'll Need
- Nice to Have
- Responsibilities
- Technologies Used
- Tools / Platforms

Extract ONLY hard skills, technical competencies, tools, certifications, frameworks, methodologies, and measurable business skills.

DO NOT extract:
- vague soft skills
- generic personality traits
- filler phrases

Examples to ignore:
- "team player"
- "strong communicator"
- "motivated"
- "fast learner"

---

## 3. Skill Categorization

Organize extracted skills into:

### Required Skills
Skills explicitly required for the role.

Indicators:
- "required"
- "must have"
- "minimum qualifications"
- "mandatory"
- "need to have"

### Preferred Skills
Skills listed as preferred but not mandatory.

Indicators:
- "preferred"
- "nice to have"
- "ideal candidate"
- "desired"
- "plus"

### Bonus Skills
Additional technologies, certifications, domain expertise, or differentiators that may strengthen candidacy but are not central requirements.

Indicators:
- indirectly referenced tools
- exposure to adjacent technologies
- optional certifications
- industry/domain familiarity

---

## 4. Hard Skill Detection Rules

Methodically identify and normalize:

### Programming Languages
Examples:
- Python
- SQL
- R
- Java
- JavaScript
- C++
- Scala

### Data & Analytics Tools
Examples:
- Tableau
- Power BI
- Excel
- Sigma
- Looker
- SAS
- SPSS

### Cloud & Infrastructure
Examples:
- AWS
- Azure
- GCP
- Snowflake
- Databricks
- Kubernetes
- Docker

### Business / Operations Tools
Examples:
- Salesforce
- Retool
- Jira
- SAP
- Workday

### AI / ML Skills
Examples:
- Machine Learning
- NLP
- TensorFlow
- PyTorch
- LLMs
- Feature Engineering

### Statistical / Analytical Methods
Examples:
- Regression
- Forecasting
- A/B Testing
- Hypothesis Testing
- Time Series Analysis

### Certifications
Examples:
- CPA
- PMP
- AWS Certified Solutions Architect
- Lean Six Sigma

---

## 5. Output Format

Return results in clean markdown.

Example structure:

# Job Posting Summary

## Basic Information
- Company:
- Position Title:
- Location:
- Employment Type:
- Date Posted:
- Salary:
- Experience Level:

---

## Required Skills
- SQL
- Python
- Tableau
- Forecasting
- A/B Testing

---

## Preferred Skills
- Snowflake
- Databricks
- AWS
- Machine Learning

---

## Bonus Skills
- Healthcare industry experience
- Salesforce
- Agile methodology

---

## Additional Notes
- Visa sponsorship available: Yes/No/Not Specified
- Remote flexibility:
- Key business domain:
- Main responsibilities summary:

---

## Extraction Standards

- Be exhaustive but precise
- Normalize duplicate technologies
  - Example: "MS Excel" → "Excel"
- Preserve capitalization for official technologies
- Do not hallucinate missing information
- Prefer explicit evidence from the posting
- Infer categorization conservatively
- If a skill appears multiple times, include it once

---

## Goal
Transform messy job descriptions into structured, recruiter-quality datasets optimized for:
- resume tailoring
- interview preparation
- application tracking
- skill gap analysis
- labor market research
