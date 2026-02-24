# 🛠️ PDF Tools Kit (Frontend)

**User Interface for PDF Operations**

## 🐳 Self-Hosting (Sovereign Core)

You can host PDFToolskit on your own infrastructure using Docker. This ensures complete data privacy as no files leave your server.

### Prerequisites
- Docker & Docker Compose installed

### Quick Start
```bash
# 1. Clone the repo
git clone https://github.com/your-username/pdftoolskit.git

# 2. Build and Run
docker-compose up -d --build

# 3. Access
Open http://localhost:3000
```

### Manual Build
```bash
docker build -t pdftoolskit .
docker run -p 3000:3000 pdftoolskit
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. a clean, drag-and-drop user experience for processing documents.

## ⚡ Features
*   **Visual Preview:** Thumbnail generation for uploaded PDFs.
*   **Real-time Progress:** Upload and processing status bars.
*   **Responsive:** Optimized for both desktop and mobile workflows.