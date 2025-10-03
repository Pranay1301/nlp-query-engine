# NLP Query Engine for Employee Data

![Dashboard Screenshot](images/Dashboard.png)

This project is a full-stack web application that provides a natural language interface for querying employee data. It can connect to any SQL database, automatically discover its schema, and combine this structured data with information from unstructured documents (like PDFs and DOCX files) to answer complex user questions.

The core challenge, as outlined in the AI Engineering assignment, was to build a system that is not hard-coded to any specific database structure, making it dynamically adaptable and robust.

---

## Application

- [**View the Live Application Here**](https://ae6x6hz3w6.skywork.website/)


---

## ✨ Key Features

* **🧠 Dynamic Schema Discovery**: Automatically analyzes the schema (tables, columns, relationships) of any connected PostgreSQL, MySQL, or SQLite database without prior knowledge.
* **📄 Unstructured Data Ingestion**: Supports bulk drag-and-drop upload for PDF, DOCX, TXT, and CSV files.
* **✂️ Intelligent Content Chunking**: Semantically chunks documents to preserve context, such as keeping resume sections or contract clauses intact.
* **Hybrid Query Engine**: Classifies natural language queries to determine if they require searching the SQL database, unstructured documents, or a combination of both.
* **🔍 Vector & SQL Search**:
    * Generates SQL queries from natural language questions.
    * Performs semantic vector search to find the most relevant document snippets.
* **⚡ Performance Optimized**: Implements caching for repeated queries, connection pooling, and result pagination to ensure fast response times (<2 seconds) under concurrent load.
* **📊 Rich User Interface**: A clean, responsive dashboard for connecting data, running queries, and visualizing results and system metrics.

---

## 🖼️ Application Screenshots

### Login Interface
![Login Interface Screenshot](images/Login%20Interface.png)

### Data Ingestion Dashboard
![Data Ingestion Screenshot](images/Dashboard.png)

### Query Interface
![Query Interface Screenshot](images/Querry%20Dashboard.png)

### Metrics Dashboard
![Metrics Dashboard Screenshot](images/Matrics.png)

---

## 🛠️ Tech Stack

* **Frontend**:
    * React & Vite
    * TypeScript
    * Tailwind CSS for styling
    * `shadcn/ui` for UI components
* **Backend**:
    * Supabase for the entire backend infrastructure.
    * **Database**: Supabase PostgreSQL with the `pgvector` extension.
    * **Serverless Functions**: Supabase Edge Functions (Deno/TypeScript) for all backend logic.
* **Authentication**: Supabase Auth

---

## 🚀 Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

* [Node.js](https://nodejs.org/) (v18 or later) and npm
* [Git](https://git-scm.com/)
* A [Supabase](https://supabase.com/) account (free tier is sufficient)
* [Supabase CLI](https://supabase.com/docs/guides/cli) installed and authenticated

### 1. Backend Setup (Supabase)

1.  **Clone the Repository**:
    ```bash
    git clone [https://github.com/your-username/nlp-query-engine.git](https://github.com/your-username/nlp-query-engine.git)
    cd nlp-query-engine
    ```

2.  **Create a New Supabase Project**:
    * Go to your [Supabase Dashboard](https://app.supabase.com/) and create a new project.
    * Save your **Project URL**, **anon key**, and **service\_role key**.

3.  **Link Your Local Project to Supabase**:
    * Navigate to the Supabase directory inside the `backend` folder.
    * Run the link command and provide your project reference ID.
    ```bash
    cd backend/supabase
    supabase link --project-ref YOUR_PROJECT_ID
    ```

4.  **Push Database Migrations**:
    * This will set up all the required tables and functions on your Supabase instance.
    ```bash
    supabase db push
    ```

5.  **Set Up
