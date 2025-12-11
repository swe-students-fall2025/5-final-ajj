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

### Architecture Summary

RankIt uses a two-subsystem architecture:

1. **Backend Subsystem (Python/Flask)**  
   Provides REST API endpoints, authentication, ranking logic, and group/item management.

2. **Database Subsystem (MongoDB)**  
   Stores all persistent data including users, groups, items, and ranking metadata.

Both subsystems run in Docker and communicate over a shared internal Docker network.  
Deployment is handled through CI/CD workflows that push images to Docker Hub and deploy to DigitalOcean.

---

# 👥 Team Members

> **TODO:** Fill in names + GitHub profile links  
> - [Jeffrey Chen](https://github.com/jzc719 "Jeffrey's GitHub profile")  
> - [Asim Dulgeroglu](https://github.com/ad6943 "Asim's GitHub profile")  
> - [Jordan Lee](https://github.com/jjl9930 "Jordan's GitHub profile")   

---


# 🚀 Quick Start

## Prerequisites

Before running RankIt locally or in a containerized environment, ensure you have:

- Docker and Docker Compose
- Git
- (Optional) Python 3.11+ and Pipenv if running without Docker

---

## 🐳 Run with Docker (Recommended)

Clone the repository and navigate into the project:

git clone <YOUR_REPO_URL>
cd rankit

Create a .env file from the example template:

cp .env.example .env

Start all services:

docker compose up --build

Once running, open the application:

http://localhost:5000

Docker will:

- Build the backend image
- Initialize MongoDB inside its own container
- Connect both services over an internal Docker network

---

# 🖥️ Run Locally (Development Mode)

If developing without Docker:

1. Set up a Python environment:

cd backend
pipenv install
pipenv shell

2. Configure development variables (using mock DB if needed):

export USE_MOCK_DB=1

3. Start the Flask development server:

python app.py

Your app will be available at:

http://localhost:5000

---

# ⚙️ Configuration

RankIt uses environment variables to configure secrets and system behavior.

To set them up:

cp .env.example .env

Required Variables:

| Variable   | Description                     | Example |
|------------|---------------------------------|---------|
| MONGO_URI  | MongoDB connection string       | mongodb://admin:adminpassword@mongodb:27017/ranking_app?authSource=admin |
| MONGO_DB   | Database name                   | ranking_app |
| SECRET_KEY | Flask session secret            | your-secret-key |
| PORT       | API server port                 | 5000 |

Optional Variables:

| Variable     | Description                        | Default |
|--------------|------------------------------------|---------|
| USE_MOCK_DB  | Toggle an in-memory test database  | 0       |
| FLASK_ENV    | Flask environment mode             | development |

---

# 🧰 Development Workflow

## Linting & Formatting

(Optional, but recommended)

pipenv install black flake8
black .
flake8

## Running Tests

To run backend tests:

pytest -q

To generate coverage:

coverage run -m pytest
coverage report

---

# ☁️ Deployment

RankIt is designed to deploy through GitHub Actions → Docker Hub → DigitalOcean.

Deployment Pipeline Summary:

1. GitHub Actions builds each subsystem image
2. Tests run automatically (backend must pass ≥80% coverage)
3. Images are pushed to Docker Hub
4. DigitalOcean App Platform (or Droplet) pulls updated images
5. RankIt becomes available at a public URL

TODO: Add actual DigitalOcean deployment commands and App ID once finalized.

---

# 📄 `.env.example`

Your repository includes a template for environment variables.  
Users should copy this file into `.env` before running the system.

MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=adminpassword
MONGO_DB=ranking_app

MONGO_URI=mongodb://admin:adminpassword@mongodb:27017/ranking_app?authSource=admin

SECRET_KEY=replace_with_random_secret_key
PORT=5000


