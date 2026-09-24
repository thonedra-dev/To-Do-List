<div align="center">

# ✅ TaskFlow

### Task, Meeting & Project Management — Reimagined as one platform

A full-stack productivity MVP that brings tasks, meetings, and multi-person projects together — built with **React (Vite)**, **Flask**, and **MySQL**.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Flask](https://img.shields.io/badge/Flask-Python-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)
[![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#license)

</div>

---

## 🌟 Overview

**TaskFlow** started life in early 2025 as a simple to-do list, inspired by tools like ClickUp — and grew into a unified productivity platform combining **task tracking**, **meeting scheduling**, and **collaborative projects**, all behind a single, cohesive React SPA talking to a Flask REST API.

It ships with its own design system: a **glassmorphism UI**, full **dark/light theming**, and playful **3D/2.5D animated visuals** — built to feel like a real product, not just a CRUD demo.

---

## 📸 Screenshots

### 🔐 Authentication

<div align="center">
<img src="static/project_reference_images/auth_darkmode.png" width="48%" alt="Sign in — Dark mode" />
<img src="static/project_reference_images/auth_lightmode.png" width="48%" alt="Sign in — Light mode" />
</div>

Secure sign-in with **Google OAuth 2.0**, email/password auth, and full dark/light theme parity.

<div align="center">
<img src="static/project_reference_images/otp.png" width="60%" alt="Email OTP verification" />
</div>

Email verification handled through a **6-digit OTP flow**, with clear step-based UI.

---

### 📊 Dashboard

<div align="center">
<img src="static/project_reference_images/dashboard_one.png" width="90%" alt="Dashboard — dark theme" />
</div>

<div align="center">
<img src="static/project_reference_images/dashboard_two.png" width="90%" alt="Dashboard — light theme" />
</div>

At-a-glance stats (pending, due today, completed, overdue), a live task-creation form, and a progress ring that updates in real time — themed identically in both dark and light mode.

---

### 🗓️ Calendar

<div align="center">
<img src="static/project_reference_images/calendar.png" width="90%" alt="Calendar view" />
</div>

A full monthly calendar with an illustrated character guide + legend, making it easy to visually distinguish personal tasks, project tasks, and meetings at a glance.

<div align="center">
<img src="static/project_reference_images/calendar_task.png" width="48%" alt="Calendar — task detail" />
<img src="static/project_reference_images//calendar_meeting.png" width="48%" alt="Calendar — meeting detail" />
</div>

Click into any day to see task or meeting details — including agenda items, steps, and location info — without leaving the calendar.

<div align="center">
<img src="static/project_reference_images/calendar_metadata.png" width="70%" alt="Calendar metadata panel" />
</div>

---

### 📁 Project Creation

<div align="center">
<img src="static/project_reference_images/project_creation_one.png" width="48%" alt="Create project — step 1" />
<img src="static/project_reference_images/project_creation_two.png" width="48%" alt="Create project — step 2" />
</div>

A guided, two-step flow for spinning up a new collaborative project — name, description, cover image, and team invites.

---

### 🔔 Notifications

<div align="center">
<img src="static/project_reference_images/notification.png" width="60%" alt="Notifications panel" />
</div>

A dedicated notification center with unread counts, mark-as-read, and mark-all-read — surfaced from a dropdown bell icon in the top nav.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔐 **Secure Authentication** | Google OAuth 2.0, email OTP verification, guided multi-step profile setup |
| ✅ **Task Management** | Create, update, and complete tasks with structured steps, priorities, categories, and due dates |
| 🤝 **Meeting Management** | Schedule meetings with locations, participants, agendas, and map-based venues |
| 📁 **Project Collaboration** | Create projects and invite collaborators via invitation codes |
| 🔔 **Notification System** | Automated in-app reminders for upcoming and overdue items |
| 📧 **Email Notifications** | Optional automated email delivery for key updates |
| 🗺️ **Map Integration** | Embedded Leaflet maps for geocoded meeting locations |
| 🎨 **Theming** | Full dark/light mode support across every screen |
| 🧊 **3D/2.5D Visuals** | Interactive, draggable animated elements built with Three.js & react-three-fiber |

---

## 🏗️ Architecture

```
┌─────────────────────┐        JSON / REST API        ┌──────────────────────┐
│   React (Vite) SPA   │ ─────────────────────────────▶│    Flask Backend     │
│   React Router       │◀───────────────────────────── │    (Blueprints)      │
│   12+ Custom Hooks   │                                 │    Session Auth      │
└─────────────────────┘                                 └───────────┬──────────┘
                                                                      │
                                                                      ▼
                                                            ┌──────────────────┐
                                                            │      MySQL        │
                                                            └──────────────────┘
```

- **Frontend** — React (Vite) SPA with React Router for client-side navigation
- **State layer** — a custom library of **12+ React hooks** decoupling data-fetching, derived state, and UI logic (`useDashboardData`, `useCalendarTasks`, `useNotifications`, etc.)
- **Backend** — Flask, organized into blueprints, exposing **20+ REST endpoints** for auth, tasks, meetings, projects, and notifications
- **Database** — MySQL, with a centralized connection/config module
- **Auth** — session-based, with Google OAuth 2.0 and email OTP as alternate flows

---

## 🛠️ Tech Stack

**Frontend:** React · Vite · React Router · Three.js · react-three-fiber · Leaflet
**Backend:** Flask · Python · Werkzeug
**Database:** MySQL
**Auth:** Google OAuth 2.0 · Session-based auth · Email OTP

---

## 🚀 Future Improvements

TaskFlow is an evolving MVP. Planned directions include:

- 📝 Collaborative document editor for multi-person project work
- 📎 File sharing within the Meeting module
- 🤖 Personalized AI-assisted productivity suggestions
- 📱 Push notifications to user devices

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

Built with ❤️ by [thonedra-dev](https://github.com/thonedra-dev)

</div>
