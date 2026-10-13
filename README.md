# AI-Powered Document Intelligence & Approval Platform — Frontend

A modern, responsive web application for AI-powered document processing and approval management. The frontend enables users to upload documents, monitor AI processing, review approval workflows, and interact with a document-specific AI assistant through a centralized dashboard.

## Overview

Built with Next.js, TypeScript, and Tailwind CSS, the frontend provides an interface for interacting with the document intelligence backend.

Users can register and log in, access role-appropriate document operations, monitor document statuses, review extracted information, approve or reject pending documents, and ask context-aware questions about document contents.

The application integrates with a FastAPI backend for authentication, document management, AI processing, workflow execution, and retrieval-augmented question answering. Zustand manages client-side state where required.

## Key Features

### 1. Authentication & User Access

- User registration and login.
- Integration with backend JWT authentication.
- Authenticated access to application features.
- Role-aware interface for administrators, managers, and employees.
- Access to document operations according to backend permissions.

### 2. Dashboard & Overview

- Centralized dashboard for document management.
- Summary cards for document statistics.
- Overview of document lifecycle stages.
- Recent document activity.
- Navigation to documents, approvals, AI assistance, audit logs, and settings.

### 3. Document Management

- Document upload interface.
- Document listing and status tracking.
- Access to document information and processing results.
- Visibility into document lifecycle states.
- Integration with backend APIs for document operations.

### 4. AI-Powered Processing Interface

- Access to AI-processed document information.
- Visibility into classification and extraction results where provided by the backend.
- Processing status tracking.
- Presentation of validation outcomes and unsupported-document errors.
- Interface for following documents through processing and review.

### 5. Approval Workflow Management

- Dedicated pending approvals view.
- Review of documents awaiting decisions.
- Approval and rejection actions for authorized users.
- Rejection reason submission.
- Tracking of approved and rejected documents.
- Synchronization of workflow status with the backend.

### 6. Document AI Assistant

- Document-specific question-and-answer interface.
- Integration with the backend's RAG-based question-answering APIs.
- Context-aware responses based on retrieved document information.
- Conversation history and message state management.
- Suggested questions to help users explore document contents.
- Presentation of source information where returned by the backend.

### 7. Audit Logs & Workflow Tracking

- Interface for viewing audit and workflow information.
- Navigation to document activity and approval records.
- Visibility into supported workflow events.
- Integration with backend audit data where available.

### 8. State Management & API Integration

- Zustand-based client-side state management.
- Integration with FastAPI endpoints.
- Management of document-specific chat messages and loading states.
- Handling of API responses, errors, and processing states.
- Synchronization of frontend views with backend operations.

### 9. Responsive User Interface

- Responsive layouts using Tailwind CSS.
- Reusable interface components.
- Navigation sidebar and dashboard header.
- Interactive forms, status indicators, and action controls.
- Lucide React icons for consistent interface design.

## Application Screenshots

### Registration

![Registration page](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/b4782a1cc3063b21cf5f443583bfb9f936b9cb57/register-image.png)

### Login

![Login page](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/c9876ec21475f6d824e2bdfb880e227ad756b0c7/login-image.png)

### Dashboard

![Dashboard](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/8e7323cd21a877965db641e75cf7e650921b44d2/dashboard-image.png)

### Document Management

![Document list](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/a56f7041596dc0511480c88c32ac094405e169d7/document-list-image.png)

### Document Upload

![Document upload](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/7d2a0cc46e5697377ce66f34d764a1bab6564fa7/document_upload-image.png)

### Document Q&A Assistant

![Document Q&A](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/1c2f3c57fedf695146d771fe99406a52b39a1927/dashboard_Q-A-image.png)

### Audit Logs

![Audit logs](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/19b86913833e4aae6b5e1cf5804cad511f630acd/dashboard_audit-image.png)

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend framework |
| React | Component-based user interface |
| TypeScript | Type-safe development |
| Tailwind CSS | Styling and responsive layouts |
| Zustand | Client-side state management |
| Lucide React | Interface icons |
| FastAPI | Backend API integration |
| JWT | Authentication integration |
| REST APIs | Communication with backend services |

## Application Modules

The frontend is organized around the following application modules:

- Dashboard
- User registration and login
- Document upload
- Document listing and management
- Pending approvals
- Approved documents
- Rejected documents
- Document AI assistant
- Audit logs
- Settings

The available actions and displayed information depend on the backend APIs and the user's permissions.

## Project Structure

The following structure is representative. Refer to the repository for the exact directory layout.

```text
AI-Document-Approval-system-frontend/
├── app/
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   └── documents/
├── components/
├── store/
├── lib/
├── public/
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js compatible with the project dependencies.
- npm.
- Access to the running FastAPI backend.
- Required backend environment variables and services configured separately.

### 1. Clone the Repository

```bash
git clone https://github.com/Madesh-cse/AI-Document-Approval-system-frontend.git
cd AI-Document-Approval-system-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the frontend project root.

Configure the API base URL using the variable name expected by the application. For example:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

Ensure this matches the environment variable used by your API client. If your code uses a different variable name, use that name instead.

For a deployed frontend, configure the variable to point to the actual backend API URL.

**Security:** Never expose secret API keys, database credentials, AWS credentials, or backend signing secrets through `NEXT_PUBLIC_` environment variables.

### 4. Start the Development Server

```bash
npm run dev
```

Open the application at:

http://localhost:3000

### 5. Connect to the Backend

Ensure the FastAPI backend is running and accessible. Confirm that:

- The configured API URL is correct.
- Backend authentication endpoints are available.
- CORS permits the frontend origin.
- Required database, OpenAI, and S3 configuration is available on the backend.
- The backend exposes the document, approval, and Q&A endpoints used by the frontend.

## Backend Integration

The frontend communicates with the FastAPI backend for authentication, document operations, AI processing, approval workflows, and document-specific question answering.

The frontend is responsible for presenting data and collecting user actions. Document processing, authorization enforcement, persistence, vector retrieval, and workflow decisions are handled by the backend.

**Related repository:**

- Backend Repository: [AI-Powered Document Intelligence & Approval Platform — Backend](https://github.com/Madesh-cse/AI-Document-Approval-system-backend)

## Security Considerations

- Protect authenticated pages and handle expired sessions appropriately.
- Treat frontend role-based visibility as a user experience feature, not a replacement for backend authorization.
- Validate form inputs before submitting API requests.
- Display API errors without exposing internal server details.
- Avoid storing sensitive credentials in frontend code.
- Keep backend secrets and service credentials on the server.
- Configure CORS and allowed origins appropriately.
- Handle loading, failure, and unauthorized states consistently.

## Current Scope & Limitations

- AI processing and RAG answers depend on backend services.
- Available actions depend on the authenticated user's role and backend authorization.
- Document persistence is managed by backend storage services rather than frontend state.
- Audit history and document details depend on the information returned by backend endpoints.
- A working frontend requires a reachable backend and correctly configured environment variables.

## Future Enhancements

- Improved document previews and extraction review interfaces.
- Enhanced workflow analytics and filtering.
- More detailed document comparison and validation views.
- Additional accessibility improvements.
- Expanded frontend unit and integration testing.
- Improved error reporting and user feedback.
- Enhanced loading states and performance optimization.

## Learning Outcomes

This project demonstrates practical experience with:

- Building responsive applications using Next.js and React.
- Type-safe frontend development with TypeScript.
- Styling responsive interfaces with Tailwind CSS.
- Client-side state management with Zustand.
- Integrating JWT authentication with backend APIs.
- Developing interfaces for AI-powered document workflows.
- Connecting frontend experiences to RAG-based question answering.
- Building approval management and document tracking interfaces.
- Handling asynchronous API requests and error states.

## Project Links

- **Frontend Repository:** [AI Document Approval System — Frontend](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend)
- **Backend Repository:** [AI Document Approval System — Backend](https://github.com/Madesh-cse/AI-Document-Approval-system-backend)
- **Demo:** [View Project Demo](https://drive.google.com/file/d/1QCYanANUBEmQn6LIpcwOEvcEy43g9GKv/view?usp=drive_link)

---

**Project:** AI-Powered Document Intelligence & Approval Platform

**Focus:** Document management UI, AI processing workflows, approval interfaces, RAG-powered document Q&A, role-aware access, and backend integration.
