# AI-Powered Document Intelligence & Approval Platform

An AI-powered document management platform that automates document classification, information extraction, validation, and approval workflows using LLMs, agentic AI, and Retrieval-Augmented Generation (RAG). The system combines automated processing with Human-in-the-Loop (HITL) review, role-based access control, and audit logging to support secure and transparent document management.

## Overview

Traditional document approval processes often involve manual data extraction, repetitive validation, and time-consuming approval coordination.

This platform addresses these challenges by integrating AI-driven document processing with structured approval workflows. It enables users to upload documents, extract relevant information, validate processing results, retrieve document-specific information through an AI assistant, and manage approval decisions through a human review process.

## Key Features

### AI-Powered Document Processing
- Document classification and supported document type detection.
- Structured information extraction from uploaded documents.
- Validation of extracted information before further processing.
- Automated routing through document processing and approval stages.

### Agentic AI Workflows
- LangGraph-based orchestration of document processing stages.
- Structured workflow transitions for processing, review, approval, and rejection.
- Integration of automated processing with human decision-making.

### Guardrails and Validation
- Validation checks for unsupported document types and processing inputs.
- Guardrails to help identify invalid or unsuitable documents.
- Controlled workflow transitions based on processing and validation results.

### Human-in-the-Loop Approval
- Human review of AI-processed documents before final approval decisions.
- Approval and rejection workflows for authorized reviewers.
- Approval status tracking throughout the document lifecycle.

### RAG-Powered Document Q&A
- Document content indexing using ChromaDB.
- Retrieval of relevant document content for user queries.
- Context-aware responses based on document-specific information.
- Integration of LangChain for retrieval and LLM-based question answering.

### Authentication and Role-Based Access Control
- JWT-based user authentication.
- Role-based access for administrators, managers, and employees.
- Controlled access to document operations based on user roles.

### Document Lifecycle and Audit Tracking
- Document status tracking across processing and approval stages.
- Approval history and workflow monitoring.
- Audit logging to support transparency and accountability.

### Cloud Storage and Integrations
- AWS S3 integration for persistent document storage.
- Docker-based containerization.
- MCP-based Google Calendar integration for scheduling approval reviews.

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL, SQLAlchemy |
| LLM Integration | OpenAI |
| AI Frameworks | LangChain, LangGraph |
| Retrieval-Augmented Generation | RAG, ChromaDB |
| AI Safety and Reliability | Validation Guardrails, Human-in-the-Loop |
| Tool Integration | Model Context Protocol (MCP), Google Calendar |
| Cloud Storage | AWS S3 |
| Containerization | Docker |
| Authentication | JWT, Role-Based Access Control |

## System Workflow

1. **Document Upload:** A user uploads a document through the application.
2. **Classification:** The AI workflow identifies the document category and checks whether the document type is supported.
3. **Information Extraction:** Relevant fields are extracted into a structured format.
4. **Validation and Guardrails:** Validation checks are applied to processing results before the workflow proceeds.
5. **Content Indexing:** Document content is prepared and indexed in ChromaDB for retrieval.
6. **Approval Scheduling:** An approval review can be scheduled through the MCP-based Google Calendar integration.
7. **Human Review:** An authorized reviewer examines the processed document and approves or rejects it.
8. **Status and Audit Tracking:** The application maintains document status and relevant approval records.
9. **Document Q&A:** Users can ask document-specific questions and receive answers grounded in retrieved content.

## Architecture Overview

```text
                 Frontend
           Next.js + TypeScript
                     |
                     v
                FastAPI API
                     |
          Authentication & RBAC
                     |
                     v
          Document Processing
                     |
              LangGraph Workflow
                     |
        +------------+------------+
        |            |            |
        v            v            v
   Classification  Extraction  Validation
        |            |            |
        +------------+------------+
                     |
                     v
            Document Indexing
                  ChromaDB
                     |
                     v
             Human-in-the-Loop
               Review & Decision
                     |
              Approval Tracking

       Supporting Integrations
       PostgreSQL | AWS S3
       OpenAI | MCP | Google Calendar
```

*This diagram illustrates the logical workflow at a high level; it is not intended to represent every internal service connection.*

## Project Structure

The project is organized into separate frontend and backend applications.

```text
AI-Powered-Document-Approval-Platform/
|
├── frontend/
│   ├── app/
│   ├── components/
│   ├── store/
│   ├── lib/
│   └── package.json
│
└── backend/
    ├── app/
    │   ├── api/
    │   ├── models/
    │   ├── schemas/
    │   ├── services/
    │   └── core/
    ├── mcp/
    ├── uploads/
    ├── requirements.txt
    └── main.py
```

*The structure is illustrative. Adjust directory names to match the actual repository layout.*

## Getting Started

### Prerequisites

- Node.js and npm
- Python
- PostgreSQL
- OpenAI API key
- AWS account and S3 bucket for cloud storage
- Google Calendar credentials for calendar integration
- Docker (optional, depending on the deployment setup)

### 1. Clone the Repositories

Clone the frontend and backend repositories separately.

```bash
git clone <frontend-repository-url>
git clone <backend-repository-url>
```

### 2. Configure the Backend

Navigate to the backend directory and create a virtual environment.

```bash
cd backend
python -m venv venv
```

Activate the environment on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file using the configuration required by the backend.

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/DATABASE_NAME
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
OPENAI_API_KEY=your-openai-api-key

AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-s3-bucket-name
```

Add any additional AWS credentials and Google Calendar settings required by the implementation. Use IAM roles or another secure AWS credential mechanism where appropriate.

**Security:** Never commit API keys, credentials, production secrets, or populated `.env` files to GitHub.

Start the backend using the command appropriate for your application entry point. For example:

```bash
uvicorn main:app --reload
```

If the entry point is inside a Python package, adjust the module path accordingly.

FastAPI interactive API documentation is typically available at:

```text
http://127.0.0.1:8000/docs
```

### 3. Configure the Frontend

Navigate to the frontend directory and install dependencies.

```bash
cd frontend
npm install
```

Configure the backend API URL using the environment variable expected by the frontend. For example, if the application uses `NEXT_PUBLIC_API_URL`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

Start the development server:

```bash
npm run dev
```

Open the application at:

```text
http://localhost:3000
```

### 4. Optional Docker Setup

Docker can be used to containerize the application and its supporting services. Configure the required environment variables, database connection, persistent storage, and service dependencies before starting the containers.

Use the repository's Dockerfile or Docker Compose configuration if provided.

## Security Considerations

- Keep API keys and credentials in environment variables or a secrets manager.
- Enforce role-based authorization on the backend, not only in the frontend.
- Validate uploaded files, including file types and size limits.
- Apply appropriate access policies to stored documents in AWS S3.
- Treat AI-extracted information as untrusted until validated.
- Require authorized human review for decisions that need manual approval.
- Restrict document retrieval to content the requesting user is authorized to access.

## Future Enhancements

- Add support for additional document formats and extraction strategies.
- Expand document-level permissions and organization-based access controls.
- Improve evaluation of extraction accuracy and RAG response quality.
- Introduce richer audit reports and approval analytics.
- Add automated testing and monitoring for processing workflows.
- Extend cloud deployment and production observability.

## Learning Outcomes

This project demonstrates practical application of:

- Full-stack development using Next.js and FastAPI.
- REST API development and relational database integration.
- LLM integration and structured information extraction.
- Agentic workflow orchestration using LangGraph.
- Retrieval-Augmented Generation using ChromaDB.
- Validation guardrails and Human-in-the-Loop workflows.
- Authentication, RBAC, cloud storage, and external tool integration.

## Project Links

- **Frontend Demo:** [Add frontend demo URL]
- **Frontend Repository:** [Add frontend GitHub URL]
- **Backend Repository:** [Add backend GitHub URL]

## License

Add an appropriate open-source license if you intend to distribute this project publicly.
