# E90 Social Club — Full-Stack Application

A modern, high-performance full-stack web platform for the **BMW E90 Social Club** (Johannesburg, South Africa).

This platform enables community members to view the club story, explore upcoming convoys, and submit applications, while providing administrators with a secure portal to **CRUD (Create, Read, Update, Delete) all public site content and events**, as well as **receive, store, and manage visitor enquiries and membership applications**.

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Node.js & Express
- **Database**: SQLite (powered by Node.js native `node:sqlite` `DatabaseSync` in WAL mode) — zero external database server required, self-contained in `data/e90.sqlite`
- **Security**: Cryptographic password hashing (`scryptSync` with unique cryptographic salts), session token authentication via HTTP-only cookies and Bearer tokens
- **Frontend**: Vanilla JavaScript (ES6+), semantic HTML5, custom responsive CSS (Orbitron & Inter typography, dark automotive theme)
- **Automated Testing**: Built-in `node:test` suite covering database queries, authentication, session lifecycle, and Express API routes

---

## 🚀 Quick Start

### 1. Start the Server
Run the application using Node.js:
```bash
npm start
```
Or with auto-restart on file changes during development:
```bash
npm run dev
```

The server will initialize the SQLite database, apply migrations, seed initial records if empty, and start listening on:
- **Public Website**: [http://localhost:3000](http://localhost:3000)
- **Admin Portal**: [http://localhost:3000/admin](http://localhost:3000/admin)

### 2. Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`

*(Note: Credentials and session tokens are stored securely in SQLite with salted scrypt hashes).*

---

## 🌟 Key Features

### 1. Public Website
- **Home (`/`)**:
  - Hero banner with dynamic title and tagline loaded from the backend
  - Dynamic "The Crew" narrative and "Our Drive" mission statements
  - Live "Upcoming Convoys" preview displaying the latest active events
  - Call to Action linking to the Join page
- **The Crew / About (`/about` or `/crew`)**:
  - Club establishment badge, title, and history story
  - Dynamic "How We Move" Vibes cards (Breakfast Runs, Charity Drives, Long Hauls, Track Days)
  - Dynamic live upcoming events grid with badges, date, time, location, spots, and RSVP links
- **Join the Convoy (`/contact` or `/join`)**:
  - **Membership Application Form**: Name, email, and story
  - **Charity Driver Application Form**: Name, email, car specs and contribution availability
  - **Cause Submission Form**: Organisation/cause name, email, and community outreach details
  - Dynamic membership perks bullet points

### 2. Admin Portal (`/admin`)
- **Authentication**:
  - Secure login overlay protecting all administrative operations
  - Session verification on page load with logout functionality
- **Dashboard Overview**:
  - Live statistics: Total applications, pending memberships, pending charity drivers, active events
  - Recent activity feed showing submissions across all categories with 1-click status actions
- **Public Events Management (Full CRUD)**:
  - **Create**: Add new events (title, category, date, time, location, spots, description, image)
  - **Read**: Live view of all events with publication status (Live vs Draft)
  - **Update**: Edit existing events in a dedicated modal
  - **Delete**: Remove cancelled events
- **Public Site Content Editor (Full CRUD)**:
  - Edit all public site texts:
    - Home Hero (title, subtitle)
    - The Crew narrative (heading, body)
    - Our Drive narrative (heading, body)
    - Invitational CTA (title, description)
    - Club establishment city and history paragraphs
    - Mission statement
    - Contact email, city, and footer tagline
  - **Vibes Management**: Add, view, and delete public "How We Move" vibe cards
  - **Perks Management**: Add and remove membership benefits shown on the Join page
- **Enquiries & Applications Management (Receive & Store)**:
  - Dedicated tabs for **Memberships**, **Charity Drivers**, **Causes**, and **General Enquiries**
  - Instant live search bar filtering by name, email, or message
  - Status filter tabs: `All`, `New`, `In Review`, `Approved`, `Declined`
  - Full detail review modal
  - **Admin Internal Notes**: Add private review comments saved directly to the database
  - 1-click **Approve**, **Decline**, or **Delete**

---

## 📡 REST API Reference

### Public Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/content/site` | Get all public site content key-values |
| `GET` | `/api/content/vibes` | Get all public vibe cards |
| `GET` | `/api/content/perks` | Get all membership perks |
| `GET` | `/api/events` | Get all published events (`?type=...`, `?search=...`) |
| `GET` | `/api/events/:id` | Get single event details |
| `POST` | `/api/enquiries` | Submit an enquiry / application (`name`, `email`, `type`, `message`) |
| `POST` | `/api/auth/login` | Admin login (`username`, `password`) |

### Protected Admin Endpoints *(Requires Authentication)*
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/me` | Verify current session and user info |
| `POST` | `/api/auth/logout` | Invalidate session |
| `POST` | `/api/auth/change-password` | Change admin password |
| `GET` | `/api/stats` | Dashboard metrics & counts |
| `PUT` | `/api/content/site` | Update public site content texts |
| `POST` | `/api/content/vibes` | Create a new vibe card |
| `PUT` | `/api/content/vibes/:id` | Update an existing vibe card |
| `DELETE` | `/api/content/vibes/:id` | Delete a vibe card |
| `POST` | `/api/content/perks` | Add a membership perk |
| `DELETE` | `/api/content/perks/:id` | Delete a membership perk |
| `POST` | `/api/events` | Create a new event |
| `PUT` | `/api/events/:id` | Update an event |
| `DELETE` | `/api/events/:id` | Delete an event |
| `GET` | `/api/enquiries` | List all enquiries (`?type=...`, `?status=...`, `?search=...`) |
| `GET` | `/api/enquiries/:id` | Get full enquiry detail |
| `PATCH` | `/api/enquiries/:id/status`| Update status (`approved`, `declined`, `pending`, `new`) & admin notes |
| `DELETE` | `/api/enquiries/:id` | Permanently delete an enquiry |

---

## 🧪 Running Automated Tests

Run the test suite:
```bash
npm test
```

This executes all unit and integration tests across database models, authentication, security, and Express API routes.
