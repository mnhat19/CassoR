CASSOR HRM – Career Architecture & Talent Radar
UI/UX Design Prompt for Figma Make / Google Stitch
Role
Act as a senior Product Designer and UX Architect. Design a modern, enterprise-grade HRM web application named CASSOR HRM. Generate complete UI screens, user flows, layouts, components, interactions, and data visualizations based solely on the specifications below.
Do not request additional files or assets. Use the provided API contracts and business rules as the single source of truth.

1. Product Overview
CASSOR HRM provides:
Career Path Exploration
Personal Career Mapping
Talent Radar & Workforce Analytics
The application helps employees understand career progression, identify possible transitions between tracks, and support HR in workforce planning.

2. Design Principles
Visual Style
Modern enterprise SaaS
Professional HR-tech appearance
Clean information hierarchy
Spacious layout
Consistent spacing system (8px grid)
Responsive desktop-first design
Light theme
UX Principles
Prioritize readability of career-path diagrams
Minimize visual clutter
Use clear visual hierarchy
Support large datasets
Optimize for HR managers and employees
Language
All labels, buttons, tooltips, notifications, empty states, and helper texts must be in Vietnamese (with proper accents).
Career Tracks remain in English.
Job Titles remain in English.

3. API Data Sources
Base URL:
http://localhost:8000
3.1 Expertise List
GET /explore/expertises?segment=BUILD&enabled_only=true
Response:
[
{
"code":"E01",
"name":"Software",
"group":"Technical",
"segment":"BUILD",
"enable":true
}
]

3.2 Career Path
GET /explore/career-path/{expertise_code}
Response:
{
"expertise": {...},
"nodes": [...],
"edges": [...]
}
Edge Types:
up
branch
bidirectional
dashed

3.3 Resolve Current Title
POST /me/resolve-title
Request:
{
"raw_title":"Chief Executive Officer"
}
Response:
{
"matched_title":"Chief Product Officer",
"track":"Leadership",
"level":5,
"expertise_code":null,
"confidence":0.92
}

3.4 My Career Path
GET /me/path
Response:
{
"expertise": {...},
"nodes": [...],
"edges": [...],
"current_node_id":"professional-2"
}

3.5 Career Precedents
GET /me/precedents
Response:
[
{
"training_source":"External hire",
"track":"Professional",
"level":2,
"age_at_promotion":null,
"expertise":"E01"
}
]

3.6 Organization Pyramid
GET /radar/pyramid?expertise_group=Technical

3.7 Branch Eligible Alerts
GET /radar/alerts/branch-eligible

3.8 Stagnation Alerts
GET /radar/alerts/stagnation

3.9 Dependency Report
GET /radar/dependency

4. Information Architecture
Create 3 primary pages:
Explore
My Career
Talent Radar
Navigation:
Left Sidebar Navigation
Top Header
Breadcrumbs
User Profile Menu

5. Page: Explore
Purpose:
Allow users to browse career architectures by expertise.
Filters Section
Components:
Expertise Dropdown
Segment Filter
Expertise Group Filter
Search Box
Behavior:
Support approximately 19 expertise options.
Disabled expertise (enable=false) must appear visually disabled.
Selecting an expertise loads:
GET /explore/career-path/{code}
Main Content
Career Path Diagram
Include:
Zoom controls
Pan support
Fullscreen button
Legend panel
Legend:
Active Role
Inactive Role
Promotion Path
Branch Path
Cross-track Path

6. Page: My Career
Purpose:
Help employees understand their current position and possible next moves.
Section A: Current Position Resolver
Components:
Text Input
Primary Button: "Phân tích chức danh"
Action:
POST /me/resolve-title
Display:
Matched title
Track
Level
Confidence score
Use confidence badge:
High
Medium
Low
Section B: My Career Path
Data Source:
GET /me/path
Requirements:
Highlight current node using strong visual emphasis.
Display progression opportunities.
Show current level indicator.
Section C: Career Precedents
Data Source:
GET /me/precedents
Display as:
Data table
Summary cards
Timeline view (optional)
Columns:
Nguồn phát triển
Track
Level
Độ tuổi thăng tiến
Expertise

7. Page: Talent Radar
Purpose:
Provide workforce analytics and talent-risk insights.
Section A: Organization Pyramid
Data Source:
GET /radar/pyramid
Visualization:
Pyramid chart
Level distribution
Headcount by track
Include:
Hover tooltips
Drill-down interaction

Section B: Branch Eligible Employees
Data Source:
GET /radar/alerts/branch-eligible
Display:
Alert table
Priority indicators
Recommended actions
Columns:
Mã nhân viên
Expertise
Cấp độ hiện tại
Số tháng chững lại

Section C: Stagnation Risk
Data Source:
GET /radar/alerts/stagnation
Display:
Risk ranking table
Severity badges
Columns:
Mã nhân viên
Điểm rủi ro
Level hiện tại
Tháng chững lại

Section D: Dependency Analysis
Data Source:
GET /radar/dependency
Visualization:
KPI Cards
Bar Chart
Trend Panel
Metrics:
External Hire Ratio
Internal Pipeline Count
Group by Segment.

8. Career Path Diagram Specification
This is the most important component in the application.
Horizontal Tracks
Arrange columns from left to right:
Trainee
Intern
Professional
Management
Leadership
Vertical Levels
Arrange rows:
Level 1 → Level 6
Lower levels appear at the bottom.
Higher levels appear at the top.
Node Design
Display:
Job Title
Track
Level
States:
Active:
Strong visual emphasis
Inactive:
Reduced opacity
Gray appearance
Current User Position:
Highlighted border
Glow effect
Distinct color
Edge Design
Up
Standard promotion arrow.
Branch
Side transition arrow.
Bidirectional
Double-arrow connection.
Dashed
Dashed bidirectional arrow.
Special Rule:
Management L5 ↔ Leadership L5
Label:
"Path phụ thuộc quyết định tổ chức"
Display label adjacent to the dashed connector.
Branching Rule
At the Professional ceiling level:
Display a branching path toward Management Level 3.
The branch must be visually obvious and understandable.

9. Component Library
Create reusable design system components:
Inputs
Text Field
Search Field
Dropdown
Multi Select
Buttons
Primary
Secondary
Ghost
Icon Button
Data Display
KPI Cards
Tables
Badges
Tooltips
Empty States
Diagram Components
Career Node
Edge Connector
Legend Item
Track Header
Level Indicator

10. Dashboard Metrics
Use realistic sample data to populate screens.
Design states for:
Empty
Loading
Error
Success

11. Deliverables
Generate complete high-fidelity UI screens including:
Explore Page
My Career Page
Talent Radar Page
Include:
Sidebar navigation
Header
Responsive layouts
Component states
Charts
Career path diagram
Design system consistency
The final result should resemble a modern HR analytics platform comparable to Workday, SuccessFactors, Eightfold AI, or Oracle HCM while maintaining a unique CASSOR HRM identity.
