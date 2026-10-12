# AI-Powered Document Intelligence & Approval Platform — Frontend

A modern web application for AI-powered document processing and approval management. The frontend provides an intuitive interface for document uploads, workflow tracking, approval management, and document-specific AI question answering.

## Overview

Built with Next.js, TypeScript, and Tailwind CSS, the application enables users to interact with document processing workflows, monitor document statuses, review extracted information, and manage approval activities through a centralized dashboard.

## Key Features

- **Authentication:** User registration and login with JWT-based backend authentication.
- **Role-Based Access Control (RBAC):** Interface for administrators, managers, and employees, with role-appropriate operations.
- **Document Management:** Upload documents and monitor their processing and approval statuses.
- **Approval Workflow:** Review pending documents and track approval or rejection decisions.
- **AI Document Assistant:** Ask document-specific questions and retrieve context-aware answers using RAG.
- **Dashboard:** View document statistics, processing stages, and recent document activity.
- **Audit & Tracking:** Access workflow information and approval history where supported by the backend.
- **Responsive UI:** Responsive layouts built with Tailwind CSS.

## Application Image
![image alt](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/b4782a1cc3063b21cf5f443583bfb9f936b9cb57/register-image.png)
![image alt](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/c9876ec21475f6d824e2bdfb880e227ad756b0c7/login-image.png)
![image alt](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/8e7323cd21a877965db641e75cf7e650921b44d2/dashboard-image.png)
![image alt](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/a56f7041596dc0511480c88c32ac094405e169d7/document-list-image.png)
![image alt](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/7d2a0cc46e5697377ce66f34d764a1bab6564fa7/document_upload-image.png)
![image alt](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/1c2f3c57fedf695146d771fe99406a52b39a1927/dashboard_Q-A-image.png)
![image alt](https://github.com/Madesh-cse/AI-Document-Approval-system-frontend/blob/19b86913833e4aae6b5e1cf5804cad511f630acd/dashboard_audit-image.png)

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend framework |
| TypeScript | Type-safe development |
| Tailwind CSS | Styling and responsive layouts |
| Zustand | Client-side state management |
| Lucide React | Interface icons |
| FastAPI | Backend API integration |
| JWT | Authentication integration |

## Application Modules

- Dashboard
- Authentication and registration
- Document upload and management
- Pending approvals
- Approved and rejected documents
- Document Q&A assistant
- Audit logs
- Settings

## Project Structure

```text
frontend/
├── app/
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   ├── documents/
│   └── ...
├── components/
├── store/
├── lib/
├── public/
├── package.json
└── README.md
```

*Directory names are illustrative. Update them to match the actual repository.*

## Getting Started

### Prerequisites

- Node.js
- npm
- Running backend API

### 1. Clone the Repository

```bash
git clone https://github.com/Madesh-cse/AI-Document-Approval-system-frontend
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file and configure the API URL expected by your application.

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

Ensure the variable name matches the one used in your frontend code.

### 4. Run the Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Backend Integration

The frontend communicates with the FastAPI backend for authentication, document operations, processing workflows, approval management, and document Q&A.

**Related repositories:**

- Frontend Demo: https://drive.google.com/file/d/1QCYanANUBEmQn6LIpcwOEvcEy43g9GKv/view?usp=drive_link
- Backend Repository: https://github.com/Madesh-cse/AI-Document-Approval-system-backend

## Future Enhancements

- Improved document preview and extraction review.
- Enhanced workflow analytics and filtering.
- Additional accessibility and UI improvements.
- Expanded frontend testing.

