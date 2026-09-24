<!-- ═══════════════════════════════════════════════════════════════════════
     TaskFlow · README
     Animated assets live in /.github/assets — the rest is plain GitHub Markdown.
     ═══════════════════════════════════════════════════════════════════════ -->

<div align="center">

<img src="static/svg_pics/hero.svg" alt="TaskFlow — Tasks, Meetings, Projects. One platform." width="100%" />

<br/>

<a href="https://github.com/thonedra-dev">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&duration=3200&pause=900&color=A78BFA&center=true&vCenter=true&width=640&lines=Tasks+that+actually+get+done.;Meetings+with+maps%2C+agendas+%26+people.;Projects+shared+with+a+single+invite+code.;Glassmorphism+%2B+3D+%E2%9C%A8+in+dark+%26+light." alt="Typing animation: Tasks that actually get done. Meetings with maps, agendas and people. Projects shared with a single invite code. Glassmorphism plus 3D in dark and light." />
</a>

<br/><br/>

![React](https://img.shields.io/badge/React_19-0b0820?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-0b0820?style=for-the-badge&logo=vite&logoColor=A78BFA)
![Flask](https://img.shields.io/badge/Flask-0b0820?style=for-the-badge&logo=flask&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-0b0820?style=for-the-badge&logo=mysql&logoColor=4FC3F7)
![Three.js](https://img.shields.io/badge/Three.js-0b0820?style=for-the-badge&logo=threedotjs&logoColor=white)
![License](https://img.shields.io/badge/MIT-0b0820?style=for-the-badge&logo=opensourceinitiative&logoColor=3DA639)

<br/>

**[✦ Overview](#-overview)** &nbsp;·&nbsp;
**[✦ Gallery](#-gallery)** &nbsp;·&nbsp;
**[✦ Features](#-features)** &nbsp;·&nbsp;
**[✦ Architecture](#-architecture)** &nbsp;·&nbsp;
**[✦ Stack](#-tech-stack)** &nbsp;·&nbsp;
**[✦ Roadmap](#-roadmap)**

</div>

<img src="static/svg_pics/divider.svg" width="100%" alt="" />

## ✦ Overview

> *"Three apps for one workday is two too many."*

**TaskFlow** began in early 2025 as a humble to-do list inspired by tools like **ClickUp**, and grew into a single, cohesive workspace where **tasks**, **meetings**, and **multi-person projects** live side by side.

It isn't a CRUD demo wearing a costume. TaskFlow ships with its own design language, built to feel like a real product from the first screen:

<table>
<tr>
<td width="33%" valign="top">

### 🪟 Glass
A **glassmorphism UI** with frosted panels, soft depth and luminous gradients.

</td>
<td width="33%" valign="top">

### 🌗 Dual-theme
Full **dark / light parity** on every screen, not just the landing page.

</td>
<td width="33%" valign="top">

### 🧊 Playful 3D
Draggable **2.5D / 3D characters** powered by Three.js and react-three-fiber.

</td>
</tr>
</table>

<img src=".github/assets/divider.svg" width="100%" alt="" />

## ✦ Gallery

> Every screen below is real, shipped UI — click a section to expand it.

<details open>
<summary><b>🔐 &nbsp;Authentication &nbsp;·&nbsp; Google OAuth 2.0, email &amp; password, 6-digit OTP</b></summary>

<br/>

<div align="center">
<img src="static/project_reference_images/auth_darkmode.png" width="48%" alt="Sign in — dark mode" />
<img src="static/project_reference_images/auth_lightmode.png" width="48%" alt="Sign in — light mode" />
<br/><sub><b>Sign in</b> — identical experience in dark <i>and</i> light</sub>
<br/><br/>
<img src="static/project_reference_images/otp.png" width="60%" alt="Email OTP verification" />
<br/><sub><b>Email verification</b> — a clean, step-based 6-digit OTP flow</sub>
</div>

</details>

<details open>
<summary><b>📊 &nbsp;Dashboard &nbsp;·&nbsp; stats, live task creation, progress ring</b></summary>

<br/>

<div align="center">
<img src="static/project_reference_images/dashboard_one.png" width="90%" alt="Dashboard — dark theme" />
<br/><sub><b>Dark</b></sub>
<br/><br/>
<img src="static/project_reference_images/dashboard_two.png" width="90%" alt="Dashboard — light theme" />
<br/><sub><b>Light</b></sub>
</div>

<br/>

At-a-glance counters for **pending · due today · completed · overdue**, a live task-creation form, and a **progress ring that updates in real time**.

</details>

<details>
<summary><b>🗓️ &nbsp;Calendar &nbsp;·&nbsp; tasks, project work &amp; meetings in one view</b></summary>

<br/>

<div align="center">
<img src="static/project_reference_images/calendar.png" width="90%" alt="Calendar view" />
<br/><sub><b>Monthly view</b> with an illustrated character guide &amp; legend</sub>
<br/><br/>
<img src="static/project_reference_images/calendar_task.png" width="48%" alt="Calendar — task detail" />
<img src="static/project_reference_images/calendar_meeting.png" width="48%" alt="Calendar — meeting detail" />
<br/><sub><b>Task detail</b> &nbsp;·&nbsp; <b>Meeting detail</b> — steps, agenda &amp; location, without leaving the calendar</sub>
<br/><br/>
<img src="static/project_reference_images/calendar_metadata.png" width="70%" alt="Calendar metadata panel" />
<br/><sub><b>Metadata panel</b></sub>
</div>

</details>

<details>
<summary><b>📁 &nbsp;Projects &nbsp;·&nbsp; a guided two-step creation flow</b></summary>

<br/>

<div align="center">
<img src="static/project_reference_images/project_creation_one.png" width="48%" alt="Create project — step 1" />
<img src="static/project_reference_images/project_creation_two.png" width="48%" alt="Create project — step 2" />
<br/><sub><b>Step 1</b> — name, description, cover &nbsp;·&nbsp; <b>Step 2</b> — invite your team</sub>
</div>

</details>

<details>
<summary><b>🔔 &nbsp;Notifications &nbsp;·&nbsp; a proper inbox, not an afterthought</b></summary>

<br/>

<div align="center">
<img src="static/project_reference_images/notification.png" width="60%" alt="Notifications panel" />
<br/><sub>Unread counts · mark-as-read · mark-all-read — from the bell in the top nav</sub>
</div>

</details>

<img src=".github/assets/divider.svg" width="100%" alt="" />

## ✦ Features

<table>
<tr>
<td width="50%" valign="top">

#### 🔐 Secure Authentication
Google OAuth 2.0, email OTP verification, and a guided multi-step profile setup.

#### ✅ Task Management
Create, update and complete tasks with **steps, priorities, categories and due dates**.

#### 🤝 Meeting Management
Schedule meetings with **locations, participants and agendas**, plus map-based venues.

#### 📁 Project Collaboration
Spin up projects and invite collaborators with **invitation codes**.

</td>
<td width="50%" valign="top">

#### 🔔 Notification System
Automated in-app reminders for upcoming and overdue items.

#### 📧 Email Notifications
Optional automated email delivery for key updates.

#### 🗺️ Map Integration
Embedded **Leaflet** maps for geocoded meeting locations.

#### 🎨 Theming &nbsp;+&nbsp; 🧊 3D / 2.5D Visuals
Full dark/light mode on every screen, and interactive, draggable animated elements built with **Three.js** &amp; **react-three-fiber**.

</td>
</tr>
</table>

<img src=".github/assets/divider.svg" width="100%" alt="" />

## ✦ Architecture

```mermaid
%%{init: {'theme':'base','themeVariables':{
  'primaryColor':'#1b1245','primaryTextColor':'#e0e7ff','primaryBorderColor':'#a78bfa',
  'lineColor':'#7dd3fc','secondaryColor':'#0a2a4a','tertiaryColor':'#0b0820',
  'fontFamily':'ui-sans-serif, system-ui'}}}%%
flowchart LR
  subgraph FE["⚛️  React (Vite) SPA"]
    direction TB
    R["React Router"]
    H["12+ Custom Hooks<br/><sub>useDashboardData · useCalendarTasks · useNotifications</sub>"]
    UI["Glass UI · Three.js · Leaflet"]
    R --> H --> UI
  end

  subgraph BE["🐍  Flask Backend"]
    direction TB
    BP["Blueprints<br/><sub>auth · tasks · meetings · projects · notifications</sub>"]
    SA["Session Auth<br/><sub>Google OAuth 2.0 · Email OTP</sub>"]
    BP --- SA
  end

  DB[("🗄️  MySQL")]

  FE == "JSON / REST · 20+ endpoints" ==> BE
  BE == "queries" ==> DB
  BE -. "responses" .-> FE

  classDef box fill:#1b1245,stroke:#a78bfa,color:#e0e7ff,stroke-width:1.5px;
  class R,H,UI,BP,SA,DB box;
```

<table>
<tr>
<td width="33%" valign="top">

**⚛️ Frontend**

A Vite-powered SPA with client-side routing. A library of **12+ custom hooks** decouples data-fetching, derived state and UI logic.

</td>
<td width="33%" valign="top">

**🐍 Backend**

Flask organized into **blueprints**, exposing **20+ REST endpoints** across auth, tasks, meetings, projects and notifications.

</td>
<td width="33%" valign="top">

**🗄️ Data &amp; Auth**

MySQL with a centralized connection/config module. **Session-based** auth with Google OAuth 2.0 and email OTP as alternate flows.

</td>
</tr>
</table>

<img src=".github/assets/divider.svg" width="100%" alt="" />

## ✦ Tech Stack

<div align="center">

| Layer | Tools |
|:---:|:---|
| **Frontend** | ![React](https://img.shields.io/badge/React-1b1245?style=flat-square&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-1b1245?style=flat-square&logo=vite&logoColor=A78BFA) ![React Router](https://img.shields.io/badge/React_Router-1b1245?style=flat-square&logo=reactrouter&logoColor=F44250) ![Three.js](https://img.shields.io/badge/Three.js-1b1245?style=flat-square&logo=threedotjs&logoColor=white) ![react-three-fiber](https://img.shields.io/badge/react--three--fiber-1b1245?style=flat-square&logo=react&logoColor=F0ABFC) ![Leaflet](https://img.shields.io/badge/Leaflet-1b1245?style=flat-square&logo=leaflet&logoColor=7DD3FC) |
| **Backend** | ![Flask](https://img.shields.io/badge/Flask-1b1245?style=flat-square&logo=flask&logoColor=white) ![Python](https://img.shields.io/badge/Python-1b1245?style=flat-square&logo=python&logoColor=FFD43B) ![Werkzeug](https://img.shields.io/badge/Werkzeug-1b1245?style=flat-square&logo=pallets&logoColor=white) |
| **Database** | ![MySQL](https://img.shields.io/badge/MySQL-1b1245?style=flat-square&logo=mysql&logoColor=4FC3F7) |
| **Auth** | ![Google](https://img.shields.io/badge/Google_OAuth_2.0-1b1245?style=flat-square&logo=google&logoColor=white) ![Sessions](https://img.shields.io/badge/Session_Auth-1b1245?style=flat-square&logo=springsecurity&logoColor=6DB33F) ![OTP](https://img.shields.io/badge/Email_OTP-1b1245?style=flat-square&logo=gmail&logoColor=EA4335) |

</div>

<img src=".github/assets/divider.svg" width="100%" alt="" />

## ✦ Roadmap

TaskFlow is an evolving MVP. What's next:

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#1b1245','primaryTextColor':'#e0e7ff','primaryBorderColor':'#a78bfa','lineColor':'#7dd3fc','fontFamily':'ui-sans-serif, system-ui'}}}%%
mindmap
  root((TaskFlow<br/>next))
    Collaboration
      📝 Collaborative document editor
      📎 File sharing in Meetings
    Intelligence
      🤖 AI-assisted productivity suggestions
    Reach
      📱 Push notifications to devices
```

- [ ] 📝 **Collaborative document editor** for multi-person project work
- [ ] 📎 **File sharing** within the Meeting module
- [ ] 🤖 **Personalized AI-assisted** productivity suggestions
- [ ] 📱 **Push notifications** to user devices

<img src=".github/assets/divider.svg" width="100%" alt="" />

## ✦ License

Released under the **MIT License** — build on it, remix it, make it yours.

<br/>

<div align="center">

<sub>

**Crafted with ❤️ and a lot of ☕ by [thonedra-dev](https://github.com/thonedra-dev)**

*If TaskFlow inspires you, a ⭐ goes a long way.*

</sub>

<br/><br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:38bdf8,50:c084fc,100:f472b6&height=110&section=footer" width="100%" alt="" />

</div>
