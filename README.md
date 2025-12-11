[![RankIt CI/CD Pipeline](https://github.com/swe-students-fall2025/5-final-ajj/actions/workflows/backend-ci-cd.yml/badge.svg)](https://github.com/swe-students-fall2025/5-final-ajj/actions/workflows/backend-ci-cd.yml)

# RankIt

**RankIt** is a collaborative ranking web application where users can create or join groups, add items, vote, and generate ordered lists based on aggregate group rankings.  
The platform helps teams, friends, clubs, and communities create consensus-driven tier lists or priority lists effortlessly.

---

# 📖 Project Overview

RankIt enables groups of users to collaboratively determine the best ordering of a set of items. Typical use cases include:

- Ranking restaurants for a meetup  
- Prioritizing tasks as a team  
- Creating tier lists (movies, albums, games, etc.)  
- Voting on options for events or decisions  

### Core Features

- User authentication  
- Create or join groups  
- Add new items to group rankings  
- Vote on or reorder items  
- View dynamic, aggregately computed leaderboard lists  
- Optional admin controls for group creators  

---

# 🏗 Architecture Summary

RankIt uses a two-subsystem architecture:

1. **Backend Subsystem (Python/Flask)**  
   Provides REST API endpoints, authentication, ranking logic, and group/item management.

2. **Database Subsystem (MongoDB)**  
   Stores users, groups, items, and ranking metadata.

Both subsystems run in Docker and communicate over an internal Docker network.  
Deployment is handled through CI/CD pipelines using GitHub Actions and DigitalOcean.

---

# 🐳 Docker Image

The official, production-ready Docker image is available on Docker Hub:

👉 **Docker Hub Image:** https://hub.docker.com/r/asimd0/rankit-app  
👉 **Image Name:** `asimd0/rankit-app`

You may use this directly in DigitalOcean, Docker Compose, or any container platform.

---

# 👥 Team Members

> **TODO: Fill in names + GitHub links**
- Jeffrey Chen — https://github.com/jzc719  
- Asim Dulgeroglu — https://github.com/ad6943  
- Jordan Lee — https://github.com/jjl9930  

---

# 🚀 Quick Start

## Prerequisites

- Docker + Docker Compose  
- Git  
- (Optional) Python 3.11+ with Pipenv  

---

# 🐳 Run with Docker (Recommended)

Clone the repository:

```sh
git clone <YOUR_REPO_URL>
cd rankit
```

Create a `.env` file:

```sh
cp .env.example .env
```

Start all services:

```sh
docker compose up --build
```

Open the app:

👉 **http://localhost:5000**

---

# 🖥 Run Locally (Development Mode)

1. Create a Python environment:

```sh
cd backend
pipenv install
pipenv shell
```

2. Set environment variable:

```sh
export USE_MOCK_DB=1
```

3. Start Flask:

```sh
python app.py
```

---

# ⚙️ Configuration

Copy the example env file:

```sh
cp .env.example .env
```

### Required Variables

| Variable | Description | Example |
|---------|-------------|---------|
| MONGO_URI | MongoDB connection | mongodb://admin:adminpassword@mongodb:27017/ranking_app?authSource=admin |
| MONGO_DB | Database name | ranking_app |
| SECRET_KEY | Flask session secret | your-secret-key |
| PORT | API port | 5000 |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| USE_MOCK_DB | Use in-memory DB | 0 |
| FLASK_ENV | Environment mode | development |

---

# 🧰 Development Workflow

### Format & Lint

```sh
pipenv install black flake8
black .
flake8
```

### Tests

```sh
pytest -q
```

Coverage:

```sh
coverage run -m pytest
coverage report
```

---

# ☁️ Deployment Pipeline

1. GitHub Actions builds Docker images  
2. Tests ensure ≥80% backend coverage  
3. Images pushed to Docker Hub  
4. DigitalOcean pulls updated images  
5. App becomes publicly accessible  

### Pull the live image manually:

```sh
docker pull asimd0/rankit-app
```

---

# 📄 .env.example

```env
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=adminpassword
MONGO_DB=ranking_app

MONGO_URI=mongodb://admin:adminpassword@mongodb:27017/ranking_app?authSource=admin

SECRET_KEY=replace_with_random_secret_key
PORT=5000
```

---

# ✅ Notes

- Replace TODO sections before publishing  
- Add deployment specifics once finalized  

